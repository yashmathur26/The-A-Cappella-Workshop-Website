import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import argon2 from "argon2";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// Configure passport to serialize/deserialize users
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user || false);
  } catch (error) {
    done(error, false);
  }
});

// Email/Password Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Invalid email or password" });
        }

        const isValid = await argon2.verify(user.passwordHash, password);
        if (!isValid) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // Log successful login
        await storage.createAuditLog({
          userId: user.id,
          action: "login",
          meta: JSON.stringify({ method: "local", email }),
        });

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email provided by Google"), false);
          }

          // First check if user exists by Google ID
          let user = await storage.getUserByGoogleId(profile.id);

          if (!user) {
            // Check if user exists by email (account linking)
            user = await storage.getUserByEmail(email);
            if (user) {
              // Link Google account to existing user
              user = await storage.upsertUser({
                ...user,
                googleId: profile.id,
                emailVerified: true,
              });
            } else {
              // Create new user
              user = await storage.upsertUser({
                email,
                googleId: profile.id,
                emailVerified: true,
                role: "parent",
              });
            }
          }

          // Log successful login
          await storage.createAuditLog({
            userId: user.id,
            action: "login",
            meta: JSON.stringify({ method: "google", email }),
          });

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
}

export { passport };