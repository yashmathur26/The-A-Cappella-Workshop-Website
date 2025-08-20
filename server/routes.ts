import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import Stripe from "stripe";
import { z } from "zod";
import fs from "fs";
import path from "path";
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
  
  console.log('Admin auth check:', { sessionId, hasSession: !!session, path: req.path });
  
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
          <form id="loginForm" method="POST" action="/admin/login">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="text" id="email" name="email" required autocomplete="username" value="theacappellaworkshop@gmail.com">
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required autocomplete="current-password" value="shop">
            </div>
            <button type="submit" id="loginBtn">Login</button>
          </form>
          <div id="message" style="margin-top: 1rem; text-align: center; display: none;"></div>
        </div>
        
        <script>
          document.getElementById('loginForm').addEventListener('submit', function(e) {
            console.log('Form submitted');
            document.getElementById('loginBtn').textContent = 'Logging in...';
            document.getElementById('loginBtn').disabled = true;
          });
        </script>
      </body>
      </html>
    `);
  });

  app.post("/admin/login", express.urlencoded({ extended: true }), (req, res) => {
    const { email, password } = req.body;
    
    console.log('Admin login attempt:', { email, password: password ? '[PROVIDED]' : '[MISSING]' });
    
    if (email === 'theacappellaworkshop@gmail.com' && password === 'shop') {
      const sessionId = generateSessionId();
      adminSessions.set(sessionId, { role: 'admin', email });
      
      console.log('Admin login successful, setting session:', sessionId);
      
      res.cookie('sid', sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      return res.redirect('/admin');
    }
    
    console.log('Admin login failed - invalid credentials');
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

  // Admin panel HTML page
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
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
          }
          h1 {
            margin: 0;
            color: #06b6d4;
          }
          .logout-btn {
            background: #ef4444;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
          }
          .logout-btn:hover {
            background: #dc2626;
          }
          .week-section {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            backdrop-filter: blur(8px);
          }
          .week-title {
            color: #06b6d4;
            margin-bottom: 1rem;
            font-size: 1.2rem;
            font-weight: 600;
          }
          .roster-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
          }
          .roster-table th,
          .roster-table td {
            text-align: left;
            padding: 0.75rem;
            border-bottom: 1px solid rgba(71, 85, 105, 0.3);
          }
          .roster-table th {
            background: rgba(0, 0, 0, 0.3);
            color: #06b6d4;
            font-weight: 600;
          }
          .roster-table tr:hover {
            background: rgba(71, 85, 105, 0.1);
          }
          .loading {
            text-align: center;
            padding: 2rem;
            color: #94a3b8;
          }
          .no-data {
            text-align: center;
            padding: 2rem;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Admin Panel</h1>
          <form method="POST" action="/admin/logout" style="margin: 0;">
            <button type="submit" class="logout-btn">Logout</button>
          </form>
        </div>
        
        <div id="roster-container">
          <div class="loading">Loading roster data...</div>
        </div>

        <script>
          async function loadRosters() {
            try {
              // Get list of weeks
              const weeksResponse = await fetch('/api/admin/weeks');
              const weeksData = await weeksResponse.json();
              const weeks = weeksData.weeks || [];
              
              const container = document.getElementById('roster-container');
              
              if (weeks.length === 0) {
                container.innerHTML = '<div class="no-data">No roster data available yet.</div>';
                return;
              }
              
              let html = '';
              
              // Load roster for each week
              for (const weekId of weeks) {
                const rosterResponse = await fetch(\`/api/admin/roster/\${weekId}\`);
                const rosterData = await rosterResponse.json();
                const records = rosterData.records || [];
                
                html += \`
                  <div class="week-section">
                    <div class="week-title">Week \${weekId} (\${records.length} registrations)</div>
                \`;
                
                if (records.length > 0) {
                  html += \`
                    <table class="roster-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Student Name</th>
                          <th>Parent Name</th>
                          <th>Parent Email</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                  \`;
                  
                  records.forEach(record => {
                    const date = new Date(record.ts).toLocaleDateString();
                    const amount = \`$\${(record.amount_cents / 100).toFixed(2)}\`;
                    
                    html += \`
                      <tr>
                        <td>\${date}</td>
                        <td>\${record.student_name || '(not provided)'}</td>
                        <td>\${record.parent_name || '(not provided)'}</td>
                        <td>\${record.parent_email || '(not provided)'}</td>
                        <td>\${amount}</td>
                      </tr>
                    \`;
                  });
                  
                  html += \`
                      </tbody>
                    </table>
                  \`;
                } else {
                  html += '<div class="no-data">No registrations for this week yet.</div>';
                }
                
                html += '</div>';
              }
              
              container.innerHTML = html;
            } catch (error) {
              console.error('Error loading rosters:', error);
              document.getElementById('roster-container').innerHTML = 
                '<div class="no-data">Error loading roster data. Please try refreshing.</div>';
            }
          }
          
          // Load rosters when page loads
          loadRosters();
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
      const lines = fileContent.trim().split('\n').filter(line => line.trim());
      
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

  // Create admin account directly
  app.post("/api/create-admin", async (req, res) => {
    try {
      const email = 'theacappellaworkshop@gmail.com';
      const password = 'shop';
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        // Update existing user to admin with correct password
        const argon2 = await import('argon2');
        const hashedPassword = await argon2.hash(password);
        
        const updatedUser = await storage.upsertUser({
          id: existingUser.id,
          email: existingUser.email,
          firstName: 'Admin',
          lastName: existingUser.lastName || '',
          role: 'admin',
          passwordHash: hashedPassword,
          emailVerified: true,
          googleId: existingUser.googleId,
          stripeCustomerId: existingUser.stripeCustomerId
        });
        
        console.log('Updated existing user to admin:', updatedUser.email, 'Role:', updatedUser.role);
        return res.json({ success: true, message: 'Admin user updated', user: { email: updatedUser.email, role: updatedUser.role } });
      }
      
      // Hash the password
      const argon2 = await import('argon2');
      const hashedPassword = await argon2.hash(password);
      
      // Create admin user
      const adminUser = await storage.upsertUser({
        email: email,
        firstName: 'Admin',
        lastName: '',
        role: 'admin',
        passwordHash: hashedPassword,
        emailVerified: true
      });
      
      console.log('Created new admin user:', adminUser.email, 'Role:', adminUser.role);
      res.json({ success: true, user: { email: adminUser.email, role: adminUser.role } });
    } catch (error) {
      console.error('Error creating admin user:', error);
      res.status(500).json({ error: 'Failed to create admin user' });
    }
  });

  // Cleanup: remove debug route

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

  // Admin roster API routes - integrated with regular auth
  app.get("/api/roster/weeks", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
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

  app.get("/api/roster/:weekId", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const { weekId } = req.params;
      const rosterDir = path.join(process.cwd(), 'data', 'rosters');
      const weekFile = path.join(rosterDir, weekId + '.jsonl');
      
      if (!fs.existsSync(weekFile)) {
        return res.json({ records: [] });
      }
      
      const fileContent = fs.readFileSync(weekFile, 'utf8');
      const lines = fileContent.trim().split('\n').filter(line => line.trim());
      
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

  // Enhanced checkout creation that accepts cart format with metadata
  app.post("/api/create-checkout-session", express.json(), async (req, res) => {
    try {
      const { cart, parent_email, parent_name } = req.body;
      
      if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ message: "Cart must be an array with at least 1 item" });
      }

      // Validate cart items
      for (const item of cart) {
        if (!item.week_id || !item.week_label) {
          return res.status(400).json({ message: "Each cart item must include week_id and week_label" });
        }
      }

      const host = req.protocol + '://' + req.get('host');
      
      // Create line items
      const lineItems = cart.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Week ${item.week_label} — ${item.student_name || 'Student'}`,
            metadata: {
              weekId: item.week_id,
              paymentType: 'full',
            },
          },
          unit_amount: 50000, // $500 in cents
        },
        quantity: 1,
      }));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${host}/status?ok=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${host}/status?ok=0`,
        metadata: {
          parent_email: parent_email || '',
          parent_name: parent_name || '',
          items_json: JSON.stringify(cart.map(item => ({
            week_id: item.week_id,
            week_label: item.week_label,
            student_name: item.student_name || ''
          })))
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // Webhook handler with roster writing
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
            // Parse cart items from metadata
            const itemsJson = session.metadata?.items_json;
            const items = itemsJson ? JSON.parse(itemsJson) : [];
            
            // Get parent info
            const parentEmail = session.customer_details?.email || session.metadata?.parent_email || '';
            const parentName = session.metadata?.parent_name || '';
            
            // Write roster records
            let recordCount = 0;
            for (const item of items) {
              const record = {
                ts: new Date().toISOString(),
                week_id: item.week_id,
                week_label: item.week_label,
                student_name: item.student_name || '',
                parent_email: parentEmail,
                parent_name: parentName,
                payment_intent: session.payment_intent || '',
                amount_cents: session.amount_total || 0,
                currency: session.currency || 'usd',
                session_id: session.id
              };
              
              writeRosterRecord(record);
              recordCount++;
            }
            
            console.log(`Stored ${recordCount} roster lines for session ${session.id}`);
          } catch (error) {
            console.error('Error processing checkout session:', error);
          }
        }
      }

      res.json({ received: true });
    }
  );
  
  const httpServer = createServer(app);
  return httpServer;
}