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

// Simple in-memory session store for admin auth
const adminSessions = new Map<string, { role: string; email: string }>>();

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
  // Temporarily disable rate limiting for debugging
  // app.use(generalRateLimit);
  app.use(setupSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Authentication routes
  app.use("/auth", authRoutes);

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
    
    res.status(401).send(`
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
            <div class="error">Invalid email or password</div>
          </form>
        </div>
      </body>
      </html>
    `);
  });

  app.post("/admin/logout", (req, res) => {
    const sessionId = req.cookies.sid;
    if (sessionId) {
      adminSessions.delete(sessionId);
    }
    res.clearCookie('sid');
    res.redirect('/admin/login');
  });

  // Admin panel page
  app.get("/admin", requireAdmin, (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Admin Panel - A Cappella Workshop</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0b1220;
            color: white;
            margin: 0;
            padding: 1rem;
            min-height: 100vh;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid rgba(71, 85, 105, 0.3);
          }
          h1 {
            color: #06b6d4;
            margin: 0;
          }
          .logout-btn {
            padding: 0.5rem 1rem;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
          }
          .controls {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            backdrop-filter: blur(8px);
          }
          select {
            padding: 0.5rem;
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 6px;
            background: rgba(0, 0, 0, 0.3);
            color: white;
            font-size: 1rem;
            margin-right: 1rem;
          }
          button {
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, #3b82f6, #06b6d4);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          }
          .roster-container {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 12px;
            padding: 1.5rem;
            backdrop-filter: blur(8px);
          }
          .summary {
            margin-bottom: 1rem;
            color: #06b6d4;
            font-weight: 500;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
          }
          th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid rgba(71, 85, 105, 0.2);
          }
          th {
            background: rgba(0, 0, 0, 0.3);
            color: #06b6d4;
            font-weight: 600;
          }
          td {
            font-size: 0.9rem;
          }
          tr:hover {
            background: rgba(71, 85, 105, 0.1);
          }
          .payment-id {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.8rem;
            color: #94a3b8;
          }
          .empty-state {
            text-align: center;
            padding: 2rem;
            color: #64748b;
          }
          @media (max-width: 768px) {
            table {
              font-size: 0.8rem;
            }
            th, td {
              padding: 0.5rem 0.25rem;
            }
            .payment-id {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Admin Panel</h1>
            <form method="POST" action="/admin/logout" style="margin: 0;">
              <button type="submit" class="logout-btn">Log out</button>
            </form>
          </div>

          <div class="controls">
            <label for="week-select">Select Week:</label>
            <select id="week-select">
              <option value="">Loading weeks...</option>
            </select>
            <button onclick="loadRoster()">View Roster</button>
          </div>

          <div class="roster-container">
            <div class="summary" id="summary">Select a week to view registrations</div>
            <div id="roster-content">
              <div class="empty-state">No week selected</div>
            </div>
          </div>
        </div>

        <script>
          let weeks = [];
          let selectedWeek = '';

          // Load available weeks on page load
          async function loadWeeks() {
            try {
              const response = await fetch('/api/admin/weeks');
              const data = await response.json();
              weeks = data.weeks;
              
              const select = document.getElementById('week-select');
              select.innerHTML = '<option value="">Select a week...</option>';
              
              weeks.forEach(week => {
                const option = document.createElement('option');
                option.value = week;
                option.textContent = week;
                select.appendChild(option);
              });
            } catch (error) {
              console.error('Error loading weeks:', error);
              document.getElementById('week-select').innerHTML = '<option value="">Error loading weeks</option>';
            }
          }

          // Load roster for selected week
          async function loadRoster() {
            const select = document.getElementById('week-select');
            selectedWeek = select.value;
            
            if (!selectedWeek) {
              document.getElementById('summary').textContent = 'Please select a week';
              document.getElementById('roster-content').innerHTML = '<div class="empty-state">No week selected</div>';
              return;
            }

            try {
              const response = await fetch('/api/admin/roster/' + selectedWeek);
              const data = await response.json();
              const records = data.records;
              
              document.getElementById('summary').textContent = 
                records.length + ' registration' + (records.length !== 1 ? 's' : '');
              
              if (records.length === 0) {
                document.getElementById('roster-content').innerHTML = '<div class="empty-state">No registrations found for this week</div>';
                return;
              }

              const table = document.createElement('table');
              table.innerHTML = \`
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Parent Email</th>
                    <th>Parent Name</th>
                    <th>Payment Intent</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  \${records.map((record, index) => \`
                    <tr>
                      <td>\${index + 1}</td>
                      <td>\${record.student_name || 'N/A'}</td>
                      <td>\${record.parent_email || 'N/A'}</td>
                      <td>\${record.parent_name || 'N/A'}</td>
                      <td class="payment-id">\${record.payment_intent}</td>
                      <td>\${new Date(record.ts).toLocaleString()}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              \`;
              
              document.getElementById('roster-content').innerHTML = '';
              document.getElementById('roster-content').appendChild(table);
            } catch (error) {
              console.error('Error loading roster:', error);
              document.getElementById('roster-content').innerHTML = '<div class="empty-state">Error loading roster</div>';
            }
          }

          // Load weeks when page loads
          loadWeeks();
        </script>
      </body>
      </html>
    `);
  });

  // Admin API routes
  app.get("/api/admin/weeks", requireAdmin, (req, res) => {
    try {
      ensureRosterDirectory();
      const rosterDir = path.join(process.cwd(), 'data', 'rosters');
      const files = fs.readdirSync(rosterDir);
      const weeks = files
        .filter(file => file.endsWith('.jsonl') && file !== '_index.jsonl')
        .map(file => file.replace('.jsonl', ''))
        .sort();
      
      res.json({ weeks });
    } catch (error) {
      console.error('Error reading roster directory:', error);
      res.json({ weeks: [] });
    }
  });

  app.get("/api/admin/roster/:weekId", requireAdmin, (req, res) => {
    try {
      const { weekId } = req.params;
      const rosterDir = path.join(process.cwd(), 'data', 'rosters');
      const weekFile = path.join(rosterDir, weekId + '.jsonl');
      
      if (!fs.existsSync(weekFile)) {
        return res.json({ records: [] });
      }
      
      const fileContent = fs.readFileSync(weekFile, 'utf8');
      const lines = fileContent.trim().split('\\n').filter(line => line.trim());
      
      const records = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.error('Error parsing roster line:', line, error);
          return null;
        }
      }).filter(record => record !== null);
      
      res.json({ records });
    } catch (error) {
      console.error('Error reading roster file:', error);
      res.status(500).json({ message: 'Error reading roster file' });
    }
  });

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
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      stripeCustomerId: user.stripeCustomerId,
    });
  });

  // Update user profile
  app.put("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = req.user as any;
      const { firstName, lastName, email } = req.body;
      
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Check if email is already taken by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ message: "Email is already taken" });
      }
      
      const updatedUser = await storage.updateUser(user.id, {
        firstName,
        lastName,
        email
      });
      
      // Update session data
      req.user = updatedUser;
      
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified,
        stripeCustomerId: updatedUser.stripeCustomerId,
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
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
      const { registrationIds, paymentType = "full" } = req.body;
      
      if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
        return res.status(400).json({ message: "Registration IDs are required" });
      }

      if (!["full", "deposit"].includes(paymentType)) {
        return res.status(400).json({ message: "Invalid payment type" });
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

      // Create line items with deposit or full pricing
      const lineItems = await Promise.all(
        registrations.map(async (reg) => {
          const student = await storage.getStudent(reg.studentId);
          const week = await storage.getWeek(reg.weekId);
          const fullPrice = week?.priceCents || 50000;
          const depositPrice = Math.round(fullPrice * 0.3); // 30% deposit ($150 for $500)
          const amount = paymentType === "full" ? fullPrice : depositPrice;
          
          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `The A Cappella Workshop — ${week?.label} — ${student?.firstName} ${student?.lastName}${paymentType === "deposit" ? " (Deposit)" : ""}`,
                description: paymentType === "deposit" 
                  ? `Non-refundable deposit. Remaining balance: $${((fullPrice - depositPrice) / 100).toFixed(2)}`
                  : undefined,
              },
              unit_amount: amount,
            },
            quantity: 1,
            metadata: {
              registrationId: reg.id,
              userId: user.id,
              studentId: reg.studentId,
              weekId: reg.weekId,
              paymentType,
              fullPrice: fullPrice.toString(),
              depositPrice: depositPrice.toString(),
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
        success_url: `${host}/account?success=1&session_id={CHECKOUT_SESSION_ID}&payment_type=${paymentType}`,
        cancel_url: `${host}/account?cancelled=1`,
        metadata: { 
          userId: user.id,
          paymentType,
        },
      });

      // Update registrations with session ID and payment info
      for (const registration of registrations) {
        await storage.updateRegistrationPaymentInfo(registration.id, session.id, paymentType);
      }

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // Balance checkout for existing registrations
  app.post("/api/balance-checkout", async (req, res) => {
    try {
      const { registrationIds } = req.body;
      
      if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
        return res.status(400).json({ message: "Registration IDs are required" });
      }

      // Get registrations and calculate balances
      const lineItems = [];
      let customerEmail = null;
      let userId = null;
      
      for (const regId of registrationIds) {
        const registration = await storage.getRegistration(regId);
        if (!registration) {
          return res.status(400).json({ message: "Registration not found" });
        }
        
        // Get user for customer info
        if (!userId) {
          const user = await storage.getUser(registration.userId);
          if (user) {
            customerEmail = user.email;
            userId = user.id;
          }
        }
        
        const student = await storage.getStudent(registration.studentId);
        const week = await storage.getWeek(registration.weekId);
        const balanceDue = registration.balanceDueCents || 0;
        
        if (balanceDue <= 0) {
          continue; // Skip if no balance due
        }
        
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Balance Payment — ${week?.label} — ${student?.firstName} ${student?.lastName}`,
              description: `Remaining balance for camp registration`,
            },
            unit_amount: balanceDue,
          },
          quantity: 1,
          metadata: {
            registrationId: regId,
            userId: registration.userId,
            studentId: registration.studentId,
            weekId: registration.weekId,
            paymentType: 'balance'
          }
        });
      }
      
      if (lineItems.length === 0) {
        return res.status(400).json({ message: "No outstanding balances to pay" });
      }

      const host = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
      
      const session = await stripe.checkout.sessions.create({
        customer_email: customerEmail || undefined,
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${host}/account?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${host}/account?cancelled=1`,
        metadata: {
          userId: userId || '',
          paymentType: 'balance'
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating balance checkout session:', error);
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // Public checkout with cart data
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { cartItems, promoCode, parentName, childName } = req.body;
      
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ message: "No items in cart" });
      }

      if (!parentName || !childName) {
        return res.status(400).json({ message: "Parent name and child name are required" });
      }

      const host = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
      
      // Handle promo codes properly
      const upperPromoCode = promoCode?.toUpperCase();
      let lineItems;
      
      if (upperPromoCode === 'ADMIN') {
        // Special ADMIN promo code: $1 total
        lineItems = [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'A Cappella Workshop Registration (Admin Discount)',
              description: `${cartItems.length} camp week${cartItems.length > 1 ? 's' : ''} - Admin pricing`,
            },
            unit_amount: 100, // $1.00 in cents
          },
          quantity: 1,
        }];
      } else {
        // Calculate discount for SHOP promo code
        const promoDiscounts: { [key: string]: number } = { 'SHOP': 0.20 };
        const discount = upperPromoCode && promoDiscounts[upperPromoCode] || 0;
        
        // Create line items for each cart item
        lineItems = cartItems.map((item: any) => {
          const originalPrice = item.price * 100; // Convert to cents
          const discountedPrice = Math.round(originalPrice * (1 - discount));
          
          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${item.label} (${item.paymentType === 'deposit' ? 'Deposit' : 'Full Payment'})`,
                metadata: {
                  weekId: item.weekId,
                  paymentType: item.paymentType,
                },
              },
              unit_amount: discountedPrice,
            },
            quantity: 1,
          };
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${host}/camp-registration?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${host}/camp-registration?cancelled=1`,
        metadata: {
          parentName,
          childName,
          promoCode: promoCode || '',
          isAdminDiscount: upperPromoCode === 'ADMIN' ? 'true' : 'false',
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // Payment status check endpoint
  app.get("/api/payment-status/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      res.json({
        status: session.payment_status,
        sessionStatus: session.status,
        paymentIntent: session.payment_intent
      });
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      res.status(500).json({ message: "Error checking payment status: " + error.message });
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
            const paymentType = session.metadata?.paymentType || 'full';
            
            // Get line items to update individual registrations
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
              expand: ['data.price.product']
            });

            // Update registration status for each line item
            for (const item of lineItems.data) {
              const metadata = item.price?.metadata;
              if (metadata?.registrationId) {
                const registrationId = metadata.registrationId;
                const fullPrice = parseInt(metadata.fullPrice || '50000');
                const depositPrice = parseInt(metadata.depositPrice || '15000');
                
                if (paymentType === 'full') {
                  // Full payment - mark as paid
                  await storage.updateRegistrationStatus(registrationId, 'paid');
                  await storage.updateRegistrationPaymentInfo(
                    registrationId,
                    session.id,
                    'full',
                    fullPrice,
                    0
                  );
                } else {
                  // Deposit payment - mark as deposit_paid with balance due
                  await storage.updateRegistrationStatus(registrationId, 'deposit_paid');
                  await storage.updateRegistrationPaymentInfo(
                    registrationId,
                    session.id,
                    'deposit',
                    depositPrice,
                    fullPrice - depositPrice
                  );
                }
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
