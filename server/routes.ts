import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertRegistrationSchema } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY. Please set it in your environment variables.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Webhook endpoint - must use raw body parser
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

      console.log(`Received event: ${event.type}`);

      // Handle the event
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Payment succeeded for session: ${session.id}, status: ${session.payment_status}`);
        
        // Update payment status in storage
        await storage.updatePaymentStatus(session.id, 'completed');
      }

      res.json({ received: true });
    }
  );

  // Create checkout session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { weeks } = req.body;
      
      if (!weeks || !Array.isArray(weeks) || weeks.length === 0) {
        return res.status(400).json({ message: "Invalid weeks selection" });
      }

      const host = `${req.protocol}://${req.get('host')}`;
      
      // Create line items for each selected week
      const lineItems = weeks.map((weekLabel: string) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `The A Cappella Workshop — ${weekLabel}`,
          },
          unit_amount: 50000, // $500.00 in cents
        },
        quantity: 1,
      }));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${host}/status?ok=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${host}/status?ok=0`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
