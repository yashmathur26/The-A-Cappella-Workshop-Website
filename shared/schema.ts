import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Weeks table - predefined camp weeks
export const weeks = pgTable("weeks", {
  id: varchar("id").primaryKey(), // e.g., 'wk1'
  label: text("label").notNull(), // "June 22–26, 2026"
  priceCents: integer("price_cents").notNull().default(50000),
  capacity: integer("capacity").notNull().default(20),
  createdAt: timestamp("created_at").defaultNow(),
});

// Guest Registrations table - stores all registration info inline (no user/student references)
export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekId: text("week_id").notNull().references(() => weeks.id),
  
  // Parent/Guardian info
  parentName: text("parent_name").notNull(),
  parentEmail: text("parent_email").notNull(),
  
  // Child info
  childName: text("child_name").notNull(),
  
  // Payment info
  status: text("status").notNull().default("pending"), // pending|paid|canceled|refunded
  paymentType: text("payment_type").notNull(), // full|deposit
  amountPaidCents: integer("amount_paid_cents").notNull().default(0),
  balanceDueCents: integer("balance_due_cents").notNull().default(0),
  promoCode: text("promo_code"), // Track which promo code was used
  
  // Stripe tracking
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_registrations_week").on(table.weekId),
  index("idx_registrations_email").on(table.parentEmail),
]);

// Payments table - tracks completed Stripe payments (simplified, no user reference)
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentEmail: text("parent_email").notNull(), // Link to registration via email
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  status: text("status").notNull(), // succeeded|processing|canceled|requires_payment_method
  receivedAt: timestamp("received_at").defaultNow(),
});

// Relations
export const weeksRelations = relations(weeks, ({ many }) => ({
  registrations: many(registrations),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  week: one(weeks, {
    fields: [registrations.weekId],
    references: [weeks.id],
  }),
}));

// Zod schemas for validation
export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  receivedAt: true,
});

// Type exports
export type Week = typeof weeks.$inferSelect;
export type InsertWeek = typeof weeks.$inferInsert;

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
