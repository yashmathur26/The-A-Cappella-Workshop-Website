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
      try {
        const sig = req.headers['stripe-signature'];

        if (!process.env.STRIPE_WEBHOOK_SECRET) {
          console.error('Missing STRIPE_WEBHOOK_SECRET');
          return res.status(400).send('Missing webhook secret');
        }

        if (!sig) {
          console.error('Missing stripe-signature header');
          return res.status(400).send('Missing stripe-signature header');
        }

        let event;

        try {
          event = stripe.webhooks.constructEvent(
            req.body,
            sig,
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
              const { storage } = await import("./storage");
              const { sendRegistrationConfirmationEmail } = await import("./brevo");
              const { lookupReferralCode } = await import("@shared/referral-codes");

              const parentEmail =
                session.customer_details?.email || session.metadata?.parentEmail || '';

              // Final / balance payment for existing deposit registrations
              if (session.metadata?.paymentType === 'balance') {
                const balanceItemsJson = session.metadata?.balance_items_json;
                const balanceItems: Array<{
                  registration_id: string;
                  week_id: string;
                  child_name: string;
                  balance_cents: number;
                }> = balanceItemsJson ? JSON.parse(balanceItemsJson) : [];

                for (const item of balanceItems) {
                  const reg = await storage.getRegistration(item.registration_id);
                  if (!reg || reg.balanceDueCents <= 0) {
                    console.log(
                      `⏭️ Skipping balance settle for ${item.registration_id} (already paid or not found)`,
                    );
                    continue;
                  }
                  await storage.settleRegistrationBalance(
                    item.registration_id,
                    item.balance_cents,
                    session.id,
                    (session.payment_intent as string) || '',
                  );
                  console.log(
                    `✅ Settled balance for registration ${item.registration_id} (${item.child_name}, $${item.balance_cents / 100})`,
                  );
                }

                await storage.createPayment({
                  parentEmail,
                  amountCents: session.amount_total || 0,
                  currency: session.currency || 'usd',
                  stripePaymentIntentId: (session.payment_intent as string) || '',
                  stripeCheckoutSessionId: session.id,
                  status: 'succeeded',
                });

                const first = balanceItems[0];
                if (first && parentEmail) {
                  const week = await storage.getWeek(first.week_id);
                  await sendRegistrationConfirmationEmail(
                    parentEmail,
                    '',
                    first.child_name,
                    week?.label ?? first.week_id,
                    `$${(session.amount_total || 0) / 100}`,
                    { receipt_url: '' },
                  );
                }
              } else {
                // Initial registration checkout (deposit or full)
                const itemsJson = session.metadata?.items_json;
                const items = itemsJson ? JSON.parse(itemsJson) : [];

                const childName = session.metadata?.childName || '';
                const appliedCode =
                  session.metadata?.appliedCode ||
                  session.metadata?.promoCode ||
                  session.metadata?.referralName ||
                  '';

                const referralDefinition = appliedCode
                  ? lookupReferralCode(appliedCode)
                  : null;
                if (referralDefinition) {
                  const recorded = await storage.recordReferralRedemptionOnPayment({
                    code: referralDefinition.code,
                    stripeCheckoutSessionId: session.id,
                    parentEmail,
                    maxUses: referralDefinition.maxUses,
                  });
                  if (recorded) {
                    console.log(`🎟️ Recorded referral redemption for code ${referralDefinition.code}`);
                  }
                }

                console.log(
                  `👤 Processing guest payment for ${childName} (${parentEmail}), ${items.length} items${appliedCode ? `, code: ${appliedCode}` : ''}`,
                );

                const totalCents = session.amount_total || 0;
                const numItems = items.length;
                const perItemCents = numItems > 0 ? Math.round(totalCents / numItems) : 0;
                const fullPriceCents = 50000;

                for (const item of items) {
                  const paymentType = item.payment_type || 'full';
                  const amountPaidCents = perItemCents;
                  const balanceDueCents =
                    paymentType === 'deposit'
                      ? Math.max(0, fullPriceCents - perItemCents)
                      : 0;

                  await storage.createRegistration({
                    parentName: '',
                    parentEmail,
                    childName,
                    weekId: item.week_id,
                    status: 'paid',
                    stripeCheckoutSessionId: session.id,
                    stripePaymentIntentId: (session.payment_intent as string) || '',
                    paymentType,
                    amountPaidCents,
                    balanceDueCents,
                    promoCode: appliedCode || null,
                  });
                  console.log(
                    `📝 Created registration for week ${item.week_id} (${paymentType}: $${amountPaidCents / 100}, balance: $${balanceDueCents / 100})`,
                  );
                }

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

                const week = await storage.getWeek(items[0]?.week_id);
                if (week) {
                  await sendRegistrationConfirmationEmail(
                    parentEmail,
                    '',
                    childName,
                    week.label,
                    `$${(session.amount_total || 0) / 100}`,
                    { receipt_url: '' },
                  );
                  console.log(`📧 Sent confirmation email to ${parentEmail}`);
                }
              }
            } catch (error) {
              // Log error but still return 200 to Stripe
              // This prevents Stripe from retrying and causing 503 errors
              console.error('❌ Error processing checkout session:', error);
              // Continue to return success to Stripe even if processing failed
              // You may want to implement a retry mechanism or queue for failed events
            }
          }
        }

        // Always return 200 to Stripe, even if event processing had errors
        // This prevents 503 errors and infinite retries
        return res.status(200).json({ received: true });
      } catch (error: any) {
        // Catch any unexpected errors and still return 200 to prevent 503s
        console.error('❌ Unexpected error in webhook handler:', error);
        return res.status(200).json({ received: true, error: 'Event processed with errors' });
      }
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
