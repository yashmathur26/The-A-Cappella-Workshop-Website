import "./env";
import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { sendRegistrationConfirmationEmail } from "./brevo";
import { insertRegistrationSchema, type Week, visits } from "@shared/schema";
import { pool, db } from "./db";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-07-30.basil",
    })
  : null;

if (!stripe) {
  console.warn(
    "STRIPE_SECRET_KEY is not set; payment endpoints will be disabled (local dev mode).",
  );
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

async function initializeDatabase() {
  try {
    // Test database connection (if configured)
    if (pool) {
      const client = await pool.connect();
      client.release();
      console.log('Database initialized successfully');
    } else {
      console.warn('Database not configured; continuing without persistence.');
    }

    // Seed weeks (works for both DB and in-memory storage)
    await storage.seedWeeks();
  } catch (error) {
    console.error('Database initialization error:', error);
    // In local/dev mode we prefer the site to boot even if DB seeding fails.
    // Routes that rely on persistence may be degraded.
  }
}

// In-memory store for form submissions (session ID -> timestamp)
const formSubmissions = new Map<string, number>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database
  await initializeDatabase();

  // Get available weeks
  app.get("/api/weeks", async (req, res) => {
    try {
      const weeks = await storage.getWeeks();
      res.json(weeks);
    } catch (error) {
      console.error("Error fetching weeks:", error);
      res.status(500).json({ message: "Failed to fetch weeks" });
    }
  });

  // Google Forms webhook endpoint
  app.post("/api/google-form-submitted", express.json(), async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      // Mark this session as having submitted the form
      formSubmissions.set(sessionId, Date.now());
      console.log(`✅ Form submitted for session: ${sessionId}`);
      
      res.json({ success: true, message: "Form submission recorded" });
    } catch (error) {
      console.error("Error recording form submission:", error);
      res.status(500).json({ message: "Failed to record form submission" });
    }
  });

  // Check if form has been submitted for a session
  app.get("/api/check-form-status/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const submitted = formSubmissions.has(sessionId);
      const timestamp = formSubmissions.get(sessionId);
      
      res.json({ 
        submitted,
        timestamp: timestamp || null
      });
    } catch (error) {
      console.error("Error checking form status:", error);
      res.status(500).json({ message: "Failed to check form status" });
    }
  });

  // Create checkout session for guest checkout
  app.post("/api/create-checkout-session", express.json(), async (req, res) => {
    try {
      if (!stripe) {
        return res.status(501).json({
          message:
            "Payments are disabled because STRIPE_SECRET_KEY is not set on the server.",
        });
      }

      const { cartItems, promoCode, parentEmail, childName, locationName } = req.body;
      
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ message: "Cart items are required" });
      }

      if (!parentEmail || !childName) {
        return res.status(400).json({ message: "Email and child name are required" });
      }

      // Get the host for redirect URLs
      const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
      const host = `${protocol}://${req.get('host')}`;

      // Calculate pricing - EARLYBIRD discount is applied on client side
      // Client sends discounted prices, so we use them directly
      const lineItems = cartItems.map((item: any) => {
        const amount = Math.round(item.price * 100); // Price already includes discount from client
        const itemLocation = item.location || locationName || 'Unknown Location';
        const weekLabel = item.weekLabel || item.label || 'Week';

        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${childName} - ${itemLocation} - ${weekLabel} ${item.paymentType === 'deposit' ? '(Deposit)' : '(Full Payment)'}`,
              description: `${childName} - ${itemLocation} - ${weekLabel} ${item.paymentType === 'deposit' ? '$150 deposit payment' : 'Full payment'}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        };
      });

      // Calculate 3.6% processing fee based on cart total (after discount)
      const cartTotal = cartItems.reduce((total: number, item: any) => {
        return total + item.price; // Price already includes discount from client
      }, 0);
      const processingFee = Math.round(cartTotal * 0.036 * 100); // 3.6% fee in cents

      if (processingFee > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Processing Fee (3.6%)',
              description: 'To avoid this fee, pay via Zelle or check - email theacappellaworkshop@gmail.com',
            },
            unit_amount: processingFee,
          },
          quantity: 1,
        });
      }

      // Determine cancel URL based on location
      let cancelUrl = `${host}/camp-registration`; // Default to Lexington
      if (locationName?.toLowerCase().includes('newton')) {
        cancelUrl = `${host}/newton/register`;
      } else if (locationName?.toLowerCase().includes('wayland')) {
        cancelUrl = `${host}/wayland/register`;
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${host}/success?session_id={CHECKOUT_SESSION_ID}&ok=1`,
        cancel_url: cancelUrl,
        customer_email: parentEmail,
        // Show child name on Stripe Checkout
        custom_fields: [
          {
            key: 'child_name',
            label: { type: 'custom', custom: 'Child name' },
            type: 'text',
            optional: true,
            text: { default_value: childName },
          },
        ],
        metadata: {
          parentEmail,
          childName,
          locationName: locationName || '',
          items_json: JSON.stringify(cartItems.map((item: any) => ({
            week_id: item.weekId,
            week_label: item.weekLabel || item.label || 'Week',
            student_name: childName,
            payment_type: item.paymentType || 'full',
          }))),
          promoCode: promoCode || '',
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Payment status check (for polling after checkout)
  app.get("/api/payment-status/:sessionId", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(501).json({ message: "Payments are disabled" });
      }
      const sessionId = req.params.sessionId;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      res.json({
        status: session.payment_status,
        sessionStatus: session.status,
        paymentIntent: session.payment_intent,
      });
    } catch (error: any) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ message: error?.message || "Error checking payment status" });
    }
  });

  // Record a visit
  app.post("/api/visits", express.json(), async (req, res) => {
    try {
      const { path, visitorId } = req.body;
      
      if (!path) {
        return res.status(400).json({ message: "Path is required" });
      }

      if (!visitorId) {
        return res.status(400).json({ message: "Visitor ID is required" });
      }

      await storage.recordVisit(path, visitorId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording visit:", error);
      res.status(500).json({ message: "Failed to record visit" });
    }
  });

  // Get visitor statistics
  app.get("/api/visits/stats", async (req, res) => {
    try {
      const totalUniqueVisitors = await storage.getTotalUniqueVisitors();
      const visitsToday = await storage.getUniqueVisitsToday();
      
      res.json({
        totalVisits: totalUniqueVisitors, // Total unique visitors (all time)
        visitsToday, // Total unique visitors today
      });
    } catch (error) {
      console.error("Error fetching visit stats:", error);
      res.status(500).json({ message: "Failed to fetch visit statistics" });
    }
  });

  // Reset visitor statistics (admin/dev only - be careful!)
  app.post("/api/visits/reset", express.json(), async (req, res) => {
    try {
      // Simple protection - you can add proper auth later
      const { confirm } = req.body;
      if (confirm !== 'RESET_ALL_VISITS') {
        return res.status(400).json({ message: "Confirmation required" });
      }

      if (db) {
        // Delete all visits from database
        await db.delete(visits);
        res.json({ success: true, message: "All visitor data reset" });
      } else {
        // Clear in-memory storage
        const memoryStorage = storage as any;
        if (memoryStorage._visits) {
          memoryStorage._visits = [];
        }
        res.json({ success: true, message: "All visitor data reset (in-memory)" });
      }
    } catch (error) {
      console.error("Error resetting visit stats:", error);
      res.status(500).json({ message: "Failed to reset visit statistics" });
    }
  });

  return createServer(app);
}
