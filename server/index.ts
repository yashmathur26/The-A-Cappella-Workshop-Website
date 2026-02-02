import "./env";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Webhook must be registered BEFORE express.json() to get raw body
import Stripe from "stripe";
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-07-30.basil" as any,
    })
  : null;

if (stripe) {
  // Early webhook registration with raw body parsing
  app.post(
    '/api/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.headers['stripe-signature'];

      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('Missing STRIPE_WEBHOOK_SECRET');
        return res.status(400).send('Missing webhook secret');
      }

      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig!,
          process.env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log(`✅ Webhook verified: ${event.type}`);

      // Handle the event
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(
          `💰 Payment succeeded: session ${session.id}, status: ${session.payment_status}`,
        );

        if (session.payment_status === 'paid') {
          try {
            // Import storage and email functions dynamically to avoid circular dependencies
            const { storage } = await import("./storage");
            const { sendRegistrationConfirmationEmail } = await import("./brevo");

            // Parse cart items from metadata
            const itemsJson = session.metadata?.items_json;
            const items = itemsJson ? JSON.parse(itemsJson) : [];

            // Get guest info from metadata
            const parentEmail =
              session.customer_details?.email || session.metadata?.parentEmail || '';
            const childName = session.metadata?.childName || '';

            console.log(
              `👤 Processing guest payment for ${childName} (${parentEmail}), ${items.length} items`,
            );

            // Split session total across items so each registration has correct amount
            const totalCents = session.amount_total || 0;
            const numItems = items.length;
            const perItemCents = numItems > 0 ? Math.round(totalCents / numItems) : 0;
            const fullPriceCents = 50000; // $500 full camp price

            // Create registrations for each cart item
            for (const item of items) {
              const paymentType = item.payment_type || 'full';
              const amountPaidCents = perItemCents;
              const balanceDueCents =
                paymentType === 'deposit'
                  ? Math.max(0, fullPriceCents - perItemCents)
                  : 0;

              // Create guest registration
              await storage.createRegistration({
                parentName: '', // No longer collected, using empty string
                parentEmail,
                childName,
                weekId: item.week_id,
                status: 'paid',
                stripeCheckoutSessionId: session.id,
                stripePaymentIntentId: (session.payment_intent as string) || '',
                paymentType,
                amountPaidCents,
                balanceDueCents,
                promoCode: session.metadata?.promoCode || null,
              });
              console.log(
                `📝 Created registration for week ${item.week_id} (${paymentType}: $${amountPaidCents / 100}, balance: $${balanceDueCents / 100})`,
              );
            }

            // Create payment record
            await storage.createPayment({
              parentEmail,
              amountCents: session.amount_total || 0,
              currency: session.currency || 'usd',
              stripePaymentIntentId: (session.payment_intent as string) || '',
              stripeCheckoutSessionId: session.id,
              status: 'succeeded',
            });
            console.log(
              `💳 Created payment record for $${(session.amount_total || 0) / 100}`,
            );

            // Send confirmation email
            const week = await storage.getWeek(items[0]?.week_id);
            if (week) {
              await sendRegistrationConfirmationEmail(
                parentEmail,
                '', // No parent name collected
                childName,
                week.label,
                `$${(session.amount_total || 0) / 100}`,
                {
                  receipt_url: '', // Stripe receipt URL if available
                },
              );
              console.log(`📧 Sent confirmation email to ${parentEmail}`);
            }
          } catch (error) {
            console.error('❌ Error processing checkout session:', error);
          }
        }
      }

      res.json({ received: true });
    },
  );
} else {
  console.warn("STRIPE_SECRET_KEY is not set; Stripe webhook endpoint is disabled.");
}

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
      // Skip logging for visit tracking endpoints (too verbose)
      if (path === "/api/visits" || path === "/api/visits/stats") {
        // Only log if there's an error
        if (res.statusCode >= 400) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }
          log(logLine);
        }
        return;
      }

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
  // Replit-style settings (0.0.0.0 + reusePort) can fail on some local setups.
  // In local development we bind to loopback and skip reusePort for maximum compatibility.
  const host =
    process.env.HOST ||
    (app.get("env") === "development" ? "127.0.0.1" : "0.0.0.0");

  const listenOptions: any =
    app.get("env") === "development"
      ? { port, host }
      : { port, host, reusePort: true };

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
