import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentName: text("student_name").notNull(),
  email: text("email").notNull(),
  selectedWeeks: jsonb("selected_weeks").notNull(),
  totalAmount: integer("total_amount").notNull(),
  stripeSessionId: text("stripe_session_id"),
  paymentStatus: text("payment_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRegistrationSchema = createInsertSchema(registrations).pick({
  studentName: true,
  email: true,
  selectedWeeks: true,
  totalAmount: true,
});

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;
