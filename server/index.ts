import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Webhook must be registered BEFORE express.json() to get raw body
import Stripe from "stripe";
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil" as any,
});

// Early webhook registration with raw body parsing
app.post('/api/webhook', 
  express.raw({ type: 'application/json' }), 
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Missing STRIPE_WEBHOOK_SECRET');
      return res.status(400).send('Missing webhook secret');
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`✅ Webhook verified: ${event.type}`);

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`💰 Payment succeeded: session ${session.id}, status: ${session.payment_status}`);
      
      if (session.payment_status === 'paid') {
        try {
          // Import storage and email functions dynamically to avoid circular dependencies
          const { storage } = await import("./storage");
          const { sendRegistrationConfirmationEmail } = await import("./brevo");
          
          // Parse cart items from metadata
          const itemsJson = session.metadata?.items_json;
          const items = itemsJson ? JSON.parse(itemsJson) : [];
          
          // Get guest info from metadata
          const parentEmail = session.customer_details?.email || session.metadata?.parentEmail || '';
          const parentName = session.metadata?.parentName || '';
          const childName = session.metadata?.childName || '';
          
          console.log(`👤 Processing guest payment for ${parentName} (${parentEmail}), ${items.length} items`);

          // Create registrations for each cart item
          for (const item of items) {
            const paymentType = item.payment_type || 'full';
            const fullPrice = 500; // Full camp price in dollars
            
            // Use actual amount charged from Stripe session
            const actualAmountPaidCents = session.amount_total || 0;
            const actualAmountPaid = actualAmountPaidCents / 100;
            
            // Calculate balance due based on actual payment vs full price
            let balanceDueCents = 0;
            if (paymentType === 'deposit') {
              balanceDueCents = Math.max(0, (fullPrice * 100) - actualAmountPaidCents);
            }
            
            // Create guest registration
            const registration = await storage.createRegistration({
              parentName,
              parentEmail,
              childName,
              weekId: item.week_id,
              status: 'paid',
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: session.payment_intent as string || '',
              paymentType,
              amountPaidCents: actualAmountPaidCents,
              balanceDueCents: Math.max(0, balanceDueCents),
              promoCode: session.metadata?.promoCode || null,
            });
            console.log(`📝 Created registration for week ${item.week_id} (${paymentType}: $${actualAmountPaid}, balance: $${balanceDueCents / 100})`);
          }

          // Create payment record
          await storage.createPayment({
            parentEmail,
            amountCents: session.amount_total || 0,
            currency: session.currency || 'usd',
            stripePaymentIntentId: session.payment_intent as string || '',
            stripeCheckoutSessionId: session.id,
            status: 'succeeded',
          });
          console.log(`💳 Created payment record for $${(session.amount_total || 0) / 100}`);
          
          // Send confirmation email
          const week = await storage.getWeek(items[0]?.week_id);
          if (week) {
            await sendRegistrationConfirmationEmail(
              parentEmail,
              parentName,
              childName,
              week.label,
              `$${(session.amount_total || 0) / 100}`,
              {
                receipt_url: '', // Stripe receipt URL if available
              }
            );
            console.log(`📧 Sent confirmation email to ${parentEmail}`);
          }
        } catch (error) {
          console.error('❌ Error processing checkout session:', error);
        }
      }
    }

    res.json({ received: true });
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
