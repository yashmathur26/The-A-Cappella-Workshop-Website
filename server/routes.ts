import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { sendRegistrationConfirmationEmail } from "./brevo";
import { insertRegistrationSchema, type Week } from "@shared/schema";
import { pool } from "./db";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY. Please set it in your environment variables.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

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
    // Test database connection
    const client = await pool.connect();
    client.release();
    console.log('Database initialized successfully');
    
    // Seed weeks
    await storage.seedWeeks();
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
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
      const { cartItems, promoCode, parentName, parentEmail, childName, locationName } = req.body;
      
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ message: "Cart items are required" });
      }

      if (!parentName || !parentEmail || !childName) {
        return res.status(400).json({ message: "Parent name, email, and child name are required" });
      }

      // Get the host for redirect URLs
      const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
      const host = `${protocol}://${req.get('host')}`;

      // Calculate pricing with promo codes
      const upperPromoCode = promoCode?.toUpperCase();
      let lineItems;

      if (upperPromoCode === 'ADMIN') {
        // Admin gets everything for free
        lineItems = cartItems.map((item: any) => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'A Cappella Workshop Registration (Admin Comp)',
            },
            unit_amount: 0,
          },
          quantity: 1,
        }));
      } else if (upperPromoCode === 'ADMIN1') {
        // ADMIN1 gets everything for $0.50 total
        lineItems = [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'A Cappella Workshop Registration (Admin Special)',
            },
            unit_amount: 50, // $0.50 total
          },
          quantity: 1,
        }];
      } else if (upperPromoCode === 'ADMIND') {
        // ADMIND tests deposit functionality - $0.50 paid, $499.50 remaining
        lineItems = [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'A Cappella Workshop Deposit (Testing)',
            },
            unit_amount: 50,
          },
          quantity: 1,
        }];
      } else if (upperPromoCode === 'ADMINF') {
        // ADMINF tests full payment functionality - $0.50 total, no balance
        lineItems = [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'A Cappella Workshop Full Payment (Testing)',
            },
            unit_amount: 50,
          },
          quantity: 1,
        }];
      } else {
        // Normal pricing
        lineItems = cartItems.map((item: any) => {
          const amount = item.paymentType === 'deposit' 
            ? Math.round(item.price * 100 * 0.3) 
            : Math.round(item.price * 100);

          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${item.location} - ${item.weekLabel} ${item.paymentType === 'deposit' ? '(Deposit)' : '(Full Payment)'}`,
                description: item.paymentType === 'deposit' ? '30% deposit payment' : 'Full payment',
              },
              unit_amount: amount,
            },
            quantity: 1,
          };
        });

        // Calculate 3% processing fee based on cart total
        const cartTotal = cartItems.reduce((total: number, item: any) => {
          const amount = item.paymentType === 'deposit' 
            ? item.price * 0.3 
            : item.price;
          return total + amount;
        }, 0);
        const processingFee = Math.round(cartTotal * 0.03 * 100); // 3% fee in cents

        if (processingFee > 0) {
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Processing Fee (3%)',
                description: 'To avoid this fee, pay via Zelle or check - email theacappellaworkshop@gmail.com',
              },
              unit_amount: processingFee,
            },
            quantity: 1,
          });
        }
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${host}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${host}/camp-registration`,
        customer_email: parentEmail,
        metadata: {
          parentName,
          parentEmail,
          childName,
          items_json: JSON.stringify(cartItems.map((item: any) => ({
            week_id: item.weekId,
            week_label: item.weekLabel,
            student_name: childName,
            payment_type: item.paymentType || 'full',
          }))),
          promoCode: promoCode || '',
          isAdminDiscount: ['ADMIN', 'ADMIN1', 'ADMIND', 'ADMINF'].includes(upperPromoCode || '') ? 'true' : 'false',
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  return createServer(app);
}
