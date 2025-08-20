import session from "express-session";
import connectPg from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { pool } from "./db";
import { storage } from "./storage";
import type { Express, Request, Response, NextFunction } from "express";

// Session configuration
export function setupSession() {
  const PgSession = connectPg(session);
  
  return session({
    store: new PgSession({
      pool: pool,
      createTableIfMissing: false, // Tables already created via schema
      tableName: "sessions",
    }),
    secret: process.env.SESSION_SECRET || "fallback-secret-change-me",
    resave: false,
    saveUninitialized: false,
    name: "acashop.sid",
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      sameSite: "lax",
    },
  });
}

// Rate limiting
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = req.user as any;
    if (user.role !== role) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
}

// Audit logging middleware
export function auditLog(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      try {
        await storage.createAuditLog({
          userId: user.id,
          action,
          meta: JSON.stringify({
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get("User-Agent"),
          }),
        });
      } catch (error) {
        console.error("Failed to create audit log:", error);
      }
    }
    next();
  };
}

// Initialize database seed data
export async function initializeDatabase() {
  try {
    // Seed weeks
    await storage.seedWeeks();
    
    // Create admin user if specified
    if (process.env.ADMIN_BOOTSTRAP_EMAIL && process.env.ADMIN_BOOTSTRAP_PASSWORD) {
      const existingAdmin = await storage.getUserByEmail(process.env.ADMIN_BOOTSTRAP_EMAIL);
      if (!existingAdmin) {
        const hashedPassword = await import("argon2").then(argon2 => 
          argon2.hash(process.env.ADMIN_BOOTSTRAP_PASSWORD!)
        );
        
        await storage.upsertUser({
          email: process.env.ADMIN_BOOTSTRAP_EMAIL,
          passwordHash: hashedPassword,
          role: "admin",
          emailVerified: true,
        });
        
        console.log("Admin user created:", process.env.ADMIN_BOOTSTRAP_EMAIL);
      }
    }
    
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}