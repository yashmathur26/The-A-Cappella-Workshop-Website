import {
  weeks,
  registrations,
  payments,
  type Week,
  type InsertWeek,
  type Registration,
  type InsertRegistration,
  type Payment,
  type InsertPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // Week operations
  getWeeks(): Promise<Week[]>;
  getWeek(id: string): Promise<Week | undefined>;
  seedWeeks(): Promise<void>;

  // Registration operations
  getRegistrations(parentEmail?: string): Promise<Registration[]>;
  getRegistration(id: string): Promise<Registration | undefined>;
  getRegistrationBySessionId(sessionId: string): Promise<Registration | undefined>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  updateRegistrationStatus(id: string, status: string): Promise<void>;
  updateRegistrationStripeData(id: string, sessionId?: string, paymentIntentId?: string): Promise<void>;

  // Payment operations
  getPayments(parentEmail: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
}

export class DatabaseStorage implements IStorage {
  // Week operations
  async getWeeks(): Promise<Week[]> {
    return await db.select().from(weeks);
  }

  async getWeek(id: string): Promise<Week | undefined> {
    const [week] = await db.select().from(weeks).where(eq(weeks.id, id));
    return week || undefined;
  }

  async seedWeeks(): Promise<void> {
    const existingWeeks = await this.getWeeks();
    if (existingWeeks.length > 0) {
      return; // Already seeded
    }

    const weeksData: InsertWeek[] = [
      { id: 'wk1', label: 'June 22–26, 2026', priceCents: 50000, capacity: 20 },
      { id: 'wk2', label: 'July 27–31, 2026', priceCents: 50000, capacity: 20 },
      { id: 'wk3', label: 'August 3–7, 2026', priceCents: 50000, capacity: 20 },
      { id: 'wk4', label: 'August 10–14, 2026', priceCents: 50000, capacity: 20 },
      { id: 'wk5', label: 'August 17–21, 2026', priceCents: 50000, capacity: 20 },
    ];

    for (const week of weeksData) {
      await db.insert(weeks).values(week).onConflictDoNothing();
    }
  }

  // Registration operations
  async getRegistrations(parentEmail?: string): Promise<Registration[]> {
    if (parentEmail) {
      return await db.select().from(registrations).where(eq(registrations.parentEmail, parentEmail.toLowerCase()));
    }
    return await db.select().from(registrations);
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.id, id));
    return registration || undefined;
  }

  async getRegistrationBySessionId(sessionId: string): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.stripeCheckoutSessionId, sessionId));
    return registration || undefined;
  }

  async createRegistration(regData: InsertRegistration): Promise<Registration> {
    const [registration] = await db
      .insert(registrations)
      .values({
        ...regData,
        parentEmail: regData.parentEmail.toLowerCase(),
        updatedAt: new Date(),
      })
      .returning();
    return registration;
  }

  async updateRegistrationStatus(id: string, status: string): Promise<void> {
    await db
      .update(registrations)
      .set({ status, updatedAt: new Date() })
      .where(eq(registrations.id, id));
  }

  async updateRegistrationStripeData(id: string, sessionId?: string, paymentIntentId?: string): Promise<void> {
    await db
      .update(registrations)
      .set({ 
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
        updatedAt: new Date() 
      })
      .where(eq(registrations.id, id));
  }

  // Payment operations
  async getPayments(parentEmail: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.parentEmail, parentEmail.toLowerCase()));
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const [payment] = await db
      .insert(payments)
      .values({
        ...paymentData,
        parentEmail: paymentData.parentEmail.toLowerCase(),
      })
      .returning();
    return payment;
  }
}

export const storage: IStorage = new DatabaseStorage();
