import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { passport } from "./auth";
import { storage } from "./storage";
import { authRateLimit, auditLog } from "./middleware";

const router = Router();

// Validation schemas
const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().min(1),
  password: z.string().min(10, "Password must be at least 10 characters"),
  linkPurchases: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(1),
});

// Registration route
router.post("/register", authRateLimit, async (req, res) => {
  try {
    const { firstName, lastName, email, password, linkPurchases } = registerSchema.parse(req.body);
    
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
    
    // Link guest purchases if requested
    let linkedCount = 0;
    if (linkPurchases) {
      try {
        linkedCount = await storage.linkGuestPurchasesToAccount(email.toLowerCase(), user.id);
      } catch (linkError) {
        console.error("Error linking guest purchases:", linkError);
        // Don't fail registration if linking fails
      }
    }
    
    // Log the registration
    await storage.createAuditLog({
      userId: user.id,
      action: "register",
      meta: JSON.stringify({ method: "local", email, linkedPurchases: linkedCount }),
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

// Login route
router.post("/login", authRateLimit, (req, res, next) => {
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
          role: user.role,
        },
      });
    });
  })(req, res, next);
});

// Google OAuth routes
router.get("/google", passport.authenticate("google", { 
  scope: ["profile", "email"] 
}));

router.get("/google/callback", 
  passport.authenticate("google", { failureRedirect: "/login?error=oauth" }),
  (req, res) => {
    // Successful authentication, redirect home
    res.redirect("/?login=success");
  }
);

// Logout route
router.post("/logout", (req, res) => {
  const userId = req.isAuthenticated() ? (req.user as any)?.id : null;
  
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    
    // Log the logout
    if (userId) {
      storage.createAuditLog({
        userId,
        action: "logout",
        meta: JSON.stringify({ method: "manual" }),
      }).catch(console.error);
    }
    
    res.json({ message: "Logout successful" });
  });
});

// Get current user route
router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
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

export { router as authRoutes };