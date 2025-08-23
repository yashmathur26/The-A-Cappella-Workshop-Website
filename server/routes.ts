import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import Stripe from "stripe";
import { z } from "zod";
import fs from "fs";
import path from "path";
import argon2 from "argon2";
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

// Simple in-memory session store for admin auth
const adminSessions = new Map<string, { role: string; email: string }>();

// Generate a random session ID
function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Admin auth middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const sessionId = req.cookies.sid;
  const session = sessionId ? adminSessions.get(sessionId) : null;
  
  if (!session || session.role !== 'admin') {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.redirect('/admin/login');
  }
  
  (req as any).adminSession = session;
  next();
}

// Ensure data/rosters directory exists
function ensureRosterDirectory() {
  const rosterDir = path.join(process.cwd(), 'data', 'rosters');
  if (!fs.existsSync(rosterDir)) {
    fs.mkdirSync(rosterDir, { recursive: true });
  }
}

// Write roster record to JSONL files
function writeRosterRecord(record: any) {
  ensureRosterDirectory();
  const rosterDir = path.join(process.cwd(), 'data', 'rosters');
  
  // Write to per-week file
  const weekFile = path.join(rosterDir, `${record.week_id}.jsonl`);
  fs.appendFileSync(weekFile, JSON.stringify(record) + '\n', 'utf8');
  
  // Write to global index
  const indexFile = path.join(rosterDir, '_index.jsonl');
  fs.appendFileSync(indexFile, JSON.stringify(record) + '\n', 'utf8');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database
  await initializeDatabase();

  // Basic middleware - Set trust proxy first
  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.use(setupSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Authentication routes
  app.use("/auth", authRoutes);

  // API routes for frontend compatibility
  app.get("/api/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      stripeCustomerId: user.stripeCustomerId,
    });
  });

  app.post("/api/login", generalRateLimit, (req, res, next) => {
    const loginSchema = z.object({
      email: z.string().email().min(1),
      password: z.string().min(1),
    });

    try {
      loginSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors,
        });
      }
    }
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Login failed" });
      }
      
      if (!user) {
        return res.status(401).json({ 
          message: info?.message || "Invalid credentials",
        });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        res.json({ 
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
        });
      });
    })(req, res, next);
  });

  app.post("/api/register", generalRateLimit, async (req, res) => {
    const registerSchema = z.object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      email: z.string().email().min(1),
      password: z.string().min(10, "Password must be at least 10 characters"),
    });

    try {
      const { firstName, lastName, email, password } = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      // Hash password
      const passwordHash = await argon2.hash(password);
      
      // Create user
      const user = await storage.upsertUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase(),
        passwordHash,
        role: "parent",
        emailVerified: false,
      });
      
      // Log the registration
      await storage.createAuditLog({
        userId: user.id,
        action: "register",
        meta: JSON.stringify({ method: "local", email }),
      });
      
      // Log in the user
      req.login(user, (err) => {
        if (err) {
          console.error("Login error after registration:", err);
          return res.status(500).json({ message: "Registration successful, but login failed" });
        }
        
        res.json({ 
          message: "Registration successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Admin login routes
  app.get("/admin/login", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Admin Login - A Cappella Workshop</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0b1220;
            color: white;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .login-container {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 16px;
            padding: 2rem;
            width: 100%;
            max-width: 400px;
            backdrop-filter: blur(8px);
          }
          h1 {
            text-align: center;
            margin-bottom: 1.5rem;
            color: #06b6d4;
          }
          .form-group {
            margin-bottom: 1rem;
          }
          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
          }
          input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
            color: white;
            font-size: 1rem;
            box-sizing: border-box;
          }
          input:focus {
            outline: none;
            border-color: #06b6d4;
          }
          button {
            width: 100%;
            padding: 0.75rem;
            background: linear-gradient(135deg, #3b82f6, #06b6d4);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
          }
          button:hover {
            opacity: 0.9;
          }
          .error {
            color: #ef4444;
            text-align: center;
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="login-container">
          <h1>Admin Login</h1>
          <form method="POST" action="/admin/login">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required>
            </div>
            <button type="submit">Login</button>
          </form>
        </div>
      </body>
      </html>
    `);
  });

  app.post("/admin/login", express.urlencoded({ extended: true }), (req, res) => {
    const { email, password } = req.body;
    
    if (email === 'theacappellaworkshop@gmail.com' && password === 'shop') {
      const sessionId = generateSessionId();
      adminSessions.set(sessionId, { role: 'admin', email });
      
      res.cookie('sid', sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      return res.redirect('/admin');
    }
    
    res.status(401).send('Invalid credentials');
  });

  app.post("/admin/logout", (req, res) => {
    const sessionId = req.cookies.sid;
    if (sessionId) {
      adminSessions.delete(sessionId);
    }
    res.clearCookie('sid');
    res.redirect('/admin/login');
  });

  // Student management routes
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

  // Admin endpoint to fetch ALL students from all users
  app.get("/api/admin/students", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const allStudents = await storage.getAllStudents();
      res.json(allStudents);
    } catch (error) {
      console.error("Error fetching all students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post("/api/students", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertStudentSchema.parse(req.body);
      
      const student = await storage.createStudent({ ...data, userId: user.id });
      res.json(student);
    } catch (error) {
      console.error("Error creating student:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  app.put("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const studentId = req.params.id;
      
      // Verify ownership
      const existingStudent = await storage.getStudent(studentId);
      if (!existingStudent || existingStudent.userId !== user.id) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const updateData = insertStudentSchema.partial().parse(req.body);
      const student = await storage.updateStudent(studentId, updateData);
      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const studentId = req.params.id;
      
      // Verify ownership
      const student = await storage.getStudent(studentId);
      if (!student || student.userId !== user.id) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      await storage.deleteStudent(studentId);
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Week routes
  app.get("/api/weeks", async (req, res) => {
    try {
      const weeks = await storage.getWeeks();
      res.json(weeks);
    } catch (error) {
      console.error("Error fetching weeks:", error);
      res.status(500).json({ message: "Failed to fetch weeks" });
    }
  });

  // Registration routes
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

  // Admin endpoint to fetch ALL registrations from all users
  app.get("/api/admin/registrations", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const allRegistrations = await storage.getAllRegistrations();
      res.json(allRegistrations);
    } catch (error) {
      console.error("Error fetching all registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  // Payment routes
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

  // Checkout session creation route
  app.post("/api/create-checkout-session", express.json(), async (req, res) => {
    try {
      const { cartItems, promoCode, parentName, parentEmail, childName } = req.body;
      
      // Get the logged-in user ID (if authenticated)
      const loggedInUserId = req.user?.id;
      
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ message: "Cart items are required" });
      }

      // Get the host for redirect URLs
      const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
      const host = `${protocol}://${req.get('host')}`;

      // Calculate pricing with promo codes
      const upperPromoCode = promoCode?.toUpperCase();
      let lineItems;

      if (upperPromoCode === 'ADMIN') {
        // Admin gets everything for free
        lineItems = [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'A Cappella Workshop Registration (Admin Comp)',
            },
            unit_amount: 0, // $0
          },
          quantity: 1,
        }];
      } else if (upperPromoCode === 'ADMIN1') {
        // ADMIN1 gets everything for $0.50 total
        lineItems = [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'A Cappella Workshop Registration (Admin Special)',
            },
            unit_amount: 50, // $0.50 in cents
          },
          quantity: 1,
        }];
      } else {
        // Calculate normal pricing
        lineItems = cartItems.map(item => {
          // Use the price from the cart item (already set to deposit $150 or full $500)
          let finalPrice = item.price * 100; // Convert to cents

          // Apply SHOP discount
          if (upperPromoCode === 'SHOP') {
            finalPrice = Math.round(finalPrice * 0.8); // 20% off
          }

          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `A Cappella Workshop - ${item.label}${item.paymentType === 'deposit' ? ' (Deposit)' : ''}`,
                description: item.studentName ? `Student: ${item.studentName}` : undefined,
              },
              unit_amount: finalPrice,
            },
            quantity: 1,
          };
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${host}/status?ok=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${host}/status?ok=0`,
        metadata: {
          parentName,
          childName, 
          parentEmail: parentEmail || '',
          promoCode: promoCode || '',
          isAdminDiscount: upperPromoCode === 'ADMIN' ? 'true' : 'false',
          loggedInUserId: loggedInUserId || '', // Pass the logged-in user ID
          items_json: JSON.stringify(cartItems.map(item => ({
            week_id: item.weekId,
            week_label: item.label,
            student_name: item.studentName || '',
            payment_type: item.paymentType || 'full',
            amount_paid: item.price || 500
          })))
        },
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