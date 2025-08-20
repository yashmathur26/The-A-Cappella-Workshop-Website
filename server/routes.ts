import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import Stripe from "stripe";
import { z } from "zod";
import { passport } from "./auth";
import { storage } from "./storage";
import { authRoutes } from "./authRoutes";
import { 
  setupSession, 
  generalRateLimit, 
  requireAuth, 
  requireRole, 
  auditLog,
  initializeDatabase 
} from "./middleware";
import {
  insertStudentSchema,
  insertRegistrationSchema,
  insertContentSchema,
  type Week,
  type Student,
  type Registration
} from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY. Please set it in your environment variables.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database
  await initializeDatabase();

  // Basic middleware - Set trust proxy first
  app.set('trust proxy', 1);
  app.use(cookieParser());
  // Temporarily disable rate limiting for debugging
  // app.use(generalRateLimit);
  app.use(setupSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Authentication routes
  app.use("/auth", authRoutes);

  // Public API routes
  app.get("/api/weeks", async (req, res) => {
    try {
      const weeks = await storage.getWeeks();
      res.json(weeks);
    } catch (error) {
      console.error("Error fetching weeks:", error);
      res.status(500).json({ message: "Failed to fetch weeks" });
    }
  });

  app.get("/api/content-public", async (req, res) => {
    try {
      const content = await storage.getContent();
      const contentMap = content.reduce((acc: any, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      res.json(contentMap);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  // User info route (returns null if not authenticated instead of 401)
  app.get("/api/me", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json(null);
    }
    
    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      stripeCustomerId: user.stripeCustomerId,
    });
  });

  // Student management
  app.get("/api/students", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const students = await storage.getStudents(user.id);
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post("/api/students", requireAuth, auditLog("create_student"), async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertStudentSchema.parse(req.body);
      
      // Validate field lengths
      if (data.firstName.length > 40 || data.lastName.length > 40) {
        return res.status(400).json({ message: "Names must be 40 characters or less" });
      }
      if (data.notes && data.notes.length > 400) {
        return res.status(400).json({ message: "Notes must be 400 characters or less" });
      }

      const student = await storage.createStudent({ ...data, userId: user.id });
      res.json(student);
    } catch (error) {
      console.error("Error creating student:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  app.put("/api/students/:id", requireAuth, auditLog("update_student"), async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertStudentSchema.partial().parse(req.body);
      
      // Validate field lengths
      if (data.firstName && data.firstName.length > 40) {
        return res.status(400).json({ message: "First name must be 40 characters or less" });
      }
      if (data.lastName && data.lastName.length > 40) {
        return res.status(400).json({ message: "Last name must be 40 characters or less" });
      }
      if (data.notes && data.notes.length > 400) {
        return res.status(400).json({ message: "Notes must be 400 characters or less" });
      }

      // Verify ownership
      const existingStudent = await storage.getStudent(req.params.id);
      if (!existingStudent || existingStudent.userId !== user.id) {
        return res.status(404).json({ message: "Student not found" });
      }

      const student = await storage.updateStudent(req.params.id, data);
      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", requireAuth, auditLog("delete_student"), async (req, res) => {
    try {
      const user = req.user as any;
      
      // Verify ownership
      const existingStudent = await storage.getStudent(req.params.id);
      if (!existingStudent || existingStudent.userId !== user.id) {
        return res.status(404).json({ message: "Student not found" });
      }

      await storage.deleteStudent(req.params.id);
      res.json({ message: "Student deleted" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Registration management
  app.get("/api/registrations", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const registrations = await storage.getRegistrations(user.id);
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.post("/api/registrations", requireAuth, auditLog("create_registration"), async (req, res) => {
    try {
      const user = req.user as any;
      const { studentId, weekId } = req.body;
      
      if (!studentId || !weekId) {
        return res.status(400).json({ message: "Student ID and Week ID are required" });
      }

      // Verify student belongs to user
      const student = await storage.getStudent(studentId);
      if (!student || student.userId !== user.id) {
        return res.status(400).json({ message: "Invalid student" });
      }

      // Verify week exists
      const week = await storage.getWeek(weekId);
      if (!week) {
        return res.status(400).json({ message: "Invalid week" });
      }

      const registration = await storage.createRegistration({
        userId: user.id,
        studentId,
        weekId,
        status: "pending",
      });

      res.json(registration);
    } catch (error) {
      console.error("Error creating registration:", error);
      res.status(500).json({ message: "Failed to create registration" });
    }
  });

  app.delete("/api/registrations/:id", requireAuth, auditLog("delete_registration"), async (req, res) => {
    try {
      const user = req.user as any;
      
      // Verify ownership and that it's not paid
      const registration = await storage.getRegistration(req.params.id);
      if (!registration || registration.userId !== user.id) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      if (registration.status === "paid") {
        return res.status(400).json({ message: "Cannot delete paid registration" });
      }

      // Note: In a real implementation, you'd delete the registration here
      // For now, we'll just mark it as cancelled
      await storage.updateRegistrationStatus(req.params.id, "cancelled");
      res.json({ message: "Registration cancelled" });
    } catch (error) {
      console.error("Error cancelling registration:", error);
      res.status(500).json({ message: "Failed to cancel registration" });
    }
  });

  // Payment management
  app.get("/api/payments", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const payments = await storage.getPayments(user.id);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Checkout for authenticated users
  app.post("/api/checkout", requireAuth, auditLog("create_checkout"), async (req, res) => {
    try {
      const user = req.user as any;
      const { registrationIds } = req.body;
      
      if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
        return res.status(400).json({ message: "Registration IDs are required" });
      }

      // Verify all registrations belong to user and are pending
      const registrations = [];
      for (const id of registrationIds) {
        const registration = await storage.getRegistration(id);
        if (!registration || registration.userId !== user.id || registration.status !== "pending") {
          return res.status(400).json({ message: "Invalid registration" });
        }
        registrations.push(registration);
      }

      // Ensure user has a Stripe customer ID
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        stripeCustomerId = customer.id;
        await storage.updateStripeCustomerId(user.id, stripeCustomerId);
      }

      // Create line items
      const lineItems = await Promise.all(
        registrations.map(async (reg) => {
          const student = await storage.getStudent(reg.studentId);
          const week = await storage.getWeek(reg.weekId);
          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `The A Cappella Workshop — ${week?.label} — ${student?.firstName} ${student?.lastName}`,
              },
              unit_amount: week?.priceCents || 50000,
            },
            quantity: 1,
            metadata: {
              registrationId: reg.id,
              userId: user.id,
              studentId: reg.studentId,
              weekId: reg.weekId,
            },
          };
        })
      );

      const host = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
      
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${host}/account?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${host}/account?cancelled=1`,
        metadata: { userId: user.id },
      });

      // Update registrations with session ID
      for (const registration of registrations) {
        await storage.updateRegistrationStripeData(registration.id, session.id);
      }

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // Legacy public checkout (for backward compatibility)
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { weeks } = req.body;
      
      if (!weeks || !Array.isArray(weeks) || weeks.length === 0) {
        return res.status(400).json({ message: "Invalid weeks selection" });
      }

      const host = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
      
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

  // Admin routes
  app.get("/api/admin/users", requireRole("admin"), async (req, res) => {
    try {
      // This would need to be implemented with proper pagination and search
      res.json({ message: "Admin users endpoint - to be implemented" });
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/registrations", requireRole("admin"), async (req, res) => {
    try {
      const registrations = await storage.getRegistrations();
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching admin registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Content management
  app.get("/api/content", requireRole("admin"), async (req, res) => {
    try {
      const content = await storage.getContent();
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post("/api/content", requireRole("admin"), auditLog("edit_content"), async (req, res) => {
    try {
      const user = req.user as any;
      const { key, value } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ message: "Key and value are required" });
      }

      // Validate content length based on field type
      const fieldLimits: { [key: string]: number } = {
        "home.hero_title": 80,
        "home.hero_sub": 160,
        "about.what": 900,
        "about.week": 900,
      };
      
      const limit = fieldLimits[key] || 900; // Default limit
      if (value.length > limit) {
        return res.status(400).json({ 
          message: `Content exceeds maximum length of ${limit} characters` 
        });
      }

      const content = await storage.updateContent(key, value, user.id);
      res.json(content);
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(500).json({ message: "Failed to update content" });
    }
  });

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
        
        if (session.payment_status === 'paid') {
          try {
            // Get line items to update individual registrations
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
              expand: ['data.price.product']
            });

            // Update registration status for each line item
            for (const item of lineItems.data) {
              const metadata = item.price?.metadata;
              if (metadata?.registrationId) {
                await storage.updateRegistrationStatus(metadata.registrationId, 'paid');
              }
            }

            // Create payment record if user ID is available
            if (session.metadata?.userId && session.payment_intent) {
              await storage.createPayment({
                userId: session.metadata.userId,
                amountCents: session.amount_total || 0,
                currency: session.currency || 'usd',
                stripePaymentIntentId: session.payment_intent as string,
                status: 'succeeded',
              });
            }
          } catch (error) {
            console.error('Error processing webhook:', error);
          }
        }
      }

      res.json({ received: true });
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
