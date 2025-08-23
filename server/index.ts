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
  apiVersion: "2023-10-16",
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
          // Import storage dynamically to avoid circular dependencies
          const { storage } = await import("./storage");
          
          // Parse cart items from metadata
          const itemsJson = session.metadata?.items_json;
          const items = itemsJson ? JSON.parse(itemsJson) : [];
          
          // Get user info from metadata - prioritize logged-in user ID
          const loggedInUserId = session.metadata?.loggedInUserId;
          const parentEmail = session.customer_details?.email || session.metadata?.parentEmail || '';
          const parentName = session.metadata?.parentName || '';
          const childName = session.metadata?.childName || '';
          
          console.log(`👤 Processing payment for user ID ${loggedInUserId || 'guest'}, ${items.length} items`);

          // Use logged-in user if available, otherwise fall back to email lookup
          let user = null;
          if (loggedInUserId) {
            // Use the logged-in user who initiated the checkout
            user = await storage.getUser(loggedInUserId);
            console.log(`🔗 Using logged-in user: ${user?.email || 'unknown'}`);
          } else if (parentEmail) {
            // Fallback for guest checkouts
            user = await storage.getUserByEmail(parentEmail);
            
            if (!user) {
              // Create a guest user for this checkout
              user = await storage.upsertUser({
                firstName: parentName.split(' ')[0] || 'Guest',
                lastName: parentName.split(' ').slice(1).join(' ') || 'User',
                email: parentEmail,
                role: "parent",
                emailVerified: false,
              });
              console.log(`✨ Created new user for ${parentEmail}`);
            }
          }

          if (user) {
            // Create registrations for each cart item
            for (const item of items) {
              // Find or create student
              let student = null;
              if (item.student_name) {
                const studentFirstName = item.student_name.split(' ')[0] || '';
                const studentLastName = item.student_name.split(' ').slice(1).join(' ') || '';
                
                // Check if student already exists for this user
                const existingStudents = await storage.getStudents(user.id);
                student = existingStudents.find(s => 
                  s.firstName.trim().toLowerCase() === studentFirstName.trim().toLowerCase() &&
                  s.lastName.trim().toLowerCase() === studentLastName.trim().toLowerCase()
                );
                
                if (!student) {
                  // Create new student only if not found
                  student = await storage.createStudent({
                    userId: user.id,
                    firstName: studentFirstName,
                    lastName: studentLastName,
                  });
                  console.log(`👶 Created new student: ${item.student_name}`);
                } else {
                  console.log(`🔍 Found existing student: ${item.student_name}`);
                }
              }

              // Create registration with proper payment tracking
              if (student) {
                const paymentType = item.payment_type || 'full';
                const amountPaid = item.amount_paid || 500;
                const fullPrice = 500; // Full camp price
                const balanceDue = paymentType === 'deposit' ? fullPrice - amountPaid : 0;
                
                const registration = await storage.createRegistration({
                  userId: user.id,
                  studentId: student.id,
                  weekId: item.week_id,
                  status: 'paid',
                  stripeCheckoutSessionId: session.id,
                  paymentType,
                  amountPaidCents: amountPaid * 100,
                  balanceDueCents: balanceDue * 100,
                });
                console.log(`📝 Created registration for week ${item.week_id} (${paymentType}: $${amountPaid}, balance: $${balanceDue})`);
              }
            }

            // Create payment record
            await storage.createPayment({
              userId: user.id,
              amountCents: session.amount_total || 0,
              currency: session.currency || 'usd',
              stripePaymentIntentId: session.payment_intent as string || '',
              status: 'succeeded',
            });
            console.log(`💳 Created payment record for $${(session.amount_total || 0) / 100}`);
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
