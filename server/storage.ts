import {
  weeks,
  registrations,
  payments,
  visits,
  type Week,
  type InsertWeek,
  type Registration,
  type InsertRegistration,
  type Payment,
  type InsertPayment,
  type Visit,
  type InsertVisit,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, gte, lt, lte } from "drizzle-orm";

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

  // Visit operations
  recordVisit(path: string, visitorId: string): Promise<Visit>;
  getTotalUniqueVisitors(): Promise<number>;
  getUniqueVisitsToday(): Promise<number>;
  getVisitsByDate(startDate?: Date, endDate?: Date): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  private readonly _db: any;

  constructor(drizzleDb: any) {
    this._db = drizzleDb;
  }

  // Week operations
  async getWeeks(): Promise<Week[]> {
    return await this._db.select().from(weeks);
  }

  async getWeek(id: string): Promise<Week | undefined> {
    const [week] = await this._db.select().from(weeks).where(eq(weeks.id, id));
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
      await this._db.insert(weeks).values(week).onConflictDoNothing();
    }
  }

  // Registration operations
  async getRegistrations(parentEmail?: string): Promise<Registration[]> {
    if (parentEmail) {
      return await this._db
        .select()
        .from(registrations)
        .where(eq(registrations.parentEmail, parentEmail.toLowerCase()));
    }
    return await this._db.select().from(registrations);
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    const [registration] = await this._db.select().from(registrations).where(eq(registrations.id, id));
    return registration || undefined;
  }

  async getRegistrationBySessionId(sessionId: string): Promise<Registration | undefined> {
    const [registration] = await this._db
      .select()
      .from(registrations)
      .where(eq(registrations.stripeCheckoutSessionId, sessionId));
    return registration || undefined;
  }

  async createRegistration(regData: InsertRegistration): Promise<Registration> {
    const [registration] = await this._db
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
    await this._db
      .update(registrations)
      .set({ status, updatedAt: new Date() })
      .where(eq(registrations.id, id));
  }

  async updateRegistrationStripeData(id: string, sessionId?: string, paymentIntentId?: string): Promise<void> {
    await this._db
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
    return await this._db.select().from(payments).where(eq(payments.parentEmail, parentEmail.toLowerCase()));
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const [payment] = await this._db
      .insert(payments)
      .values({
        ...paymentData,
        parentEmail: paymentData.parentEmail.toLowerCase(),
      })
      .returning();
    return payment;
  }

  // Visit operations
  async recordVisit(path: string, visitorId: string): Promise<Visit> {
    // Check if this visitor has already visited today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingVisit = await this._db
      .select()
      .from(visits)
      .where(
        and(
          eq(visits.visitorId, visitorId),
          gte(visits.date, today),
          lt(visits.date, tomorrow)
        )
      )
      .limit(1);

    // If visitor already visited today, don't create a new record
    // Just return the existing visit (or create a new one if it doesn't exist)
    if (existingVisit.length > 0) {
      return existingVisit[0];
    }

    // First visit today for this visitor - create a new record
    const [visit] = await this._db
      .insert(visits)
      .values({
        path,
        visitorId,
        date: new Date(),
      })
      .returning();
    return visit;
  }

  async getTotalUniqueVisitors(): Promise<number> {
    // Count distinct visitor IDs
    const result = await this._db
      .select({ count: sql<number>`count(distinct ${visits.visitorId})` })
      .from(visits);
    return Number(result[0]?.count || 0);
  }

  async getUniqueVisitsToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count distinct visitors who visited today
    const result = await this._db
      .select({ count: sql<number>`count(distinct ${visits.visitorId})` })
      .from(visits)
      .where(
        and(
          gte(visits.date, today),
          lt(visits.date, tomorrow)
        )
      );
    return Number(result[0]?.count || 0);
  }

  async getVisitsByDate(startDate?: Date, endDate?: Date): Promise<number> {
    let query = this._db.select({ count: sql<number>`count(*)` }).from(visits);
    
    const conditions = [];
    if (startDate) {
      conditions.push(gte(visits.date, startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(visits.date, end));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const result = await query;
    return Number(result[0]?.count || 0);
  }
}

class MemoryStorage implements IStorage {
  private _weeks: Week[] = [];
  private _registrations: Registration[] = [];
  private _payments: Payment[] = [];

  async getWeeks(): Promise<Week[]> {
    return this._weeks;
  }

  async getWeek(id: string): Promise<Week | undefined> {
    return this._weeks.find((w) => w.id === id);
  }

  async seedWeeks(): Promise<void> {
    if (this._weeks.length > 0) return;

    const weeksData: InsertWeek[] = [
      { id: 'wk1', label: 'June 22–26, 2026', priceCents: 50000, capacity: 20 },
      { id: 'wk2', label: 'July 27–31, 2026', priceCents: 50000, capacity: 20 },
      { id: 'wk3', label: 'August 3–7, 2026', priceCents: 50000, capacity: 20 },
      { id: 'wk4', label: 'August 10–14, 2026', priceCents: 50000, capacity: 20 },
      { id: 'wk5', label: 'August 17–21, 2026', priceCents: 50000, capacity: 20 },
    ];

    this._weeks = weeksData.map((w) => ({
      ...w,
      createdAt: new Date(),
    })) as Week[];
  }

  async getRegistrations(parentEmail?: string): Promise<Registration[]> {
    if (!parentEmail) return this._registrations;
    return this._registrations.filter((r) => r.parentEmail === parentEmail.toLowerCase());
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    return this._registrations.find((r) => r.id === id);
  }

  async getRegistrationBySessionId(sessionId: string): Promise<Registration | undefined> {
    return this._registrations.find((r) => r.stripeCheckoutSessionId === sessionId);
  }

  async createRegistration(regData: InsertRegistration): Promise<Registration> {
    const now = new Date();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `reg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const registration: Registration = {
      id,
      weekId: regData.weekId,
      parentName: regData.parentName,
      parentEmail: regData.parentEmail.toLowerCase(),
      childName: regData.childName,
      status: regData.status ?? "pending",
      paymentType: regData.paymentType,
      amountPaidCents: regData.amountPaidCents ?? 0,
      balanceDueCents: regData.balanceDueCents ?? 0,
      promoCode: regData.promoCode ?? null,
      stripeCheckoutSessionId: regData.stripeCheckoutSessionId ?? null,
      stripePaymentIntentId: regData.stripePaymentIntentId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this._registrations.push(registration);
    return registration;
  }

  async updateRegistrationStatus(id: string, status: string): Promise<void> {
    const r = this._registrations.find((x) => x.id === id);
    if (!r) return;
    r.status = status;
    r.updatedAt = new Date();
  }

  async updateRegistrationStripeData(id: string, sessionId?: string, paymentIntentId?: string): Promise<void> {
    const r = this._registrations.find((x) => x.id === id);
    if (!r) return;
    r.stripeCheckoutSessionId = sessionId ?? r.stripeCheckoutSessionId;
    r.stripePaymentIntentId = paymentIntentId ?? r.stripePaymentIntentId;
    r.updatedAt = new Date();
  }

  async getPayments(parentEmail: string): Promise<Payment[]> {
    const email = parentEmail.toLowerCase();
    return this._payments.filter((p) => p.parentEmail === email);
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const payment: Payment = {
      id,
      parentEmail: paymentData.parentEmail.toLowerCase(),
      amountCents: paymentData.amountCents,
      currency: paymentData.currency ?? "usd",
      stripePaymentIntentId: paymentData.stripePaymentIntentId,
      stripeCheckoutSessionId: paymentData.stripeCheckoutSessionId ?? null,
      status: paymentData.status,
      receivedAt: new Date(),
    };

    this._payments.push(payment);
    return payment;
  }

  // Visit operations (MemoryStorage)
  private _visits: Visit[] = [];

  async recordVisit(path: string, visitorId: string): Promise<Visit> {
    // Check if this visitor has already visited today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingVisit = this._visits.find(
      (v) => v.visitorId === visitorId && v.date >= today && v.date < tomorrow
    );

    // If visitor already visited today, return existing visit
    if (existingVisit) {
      return existingVisit;
    }

    // First visit today for this visitor - create a new record
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `visit_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const visit: Visit = {
      id,
      visitorId,
      path,
      date: new Date(),
      createdAt: new Date(),
    };

    this._visits.push(visit);
    return visit;
  }

  async getTotalUniqueVisitors(): Promise<number> {
    const uniqueVisitors = new Set(this._visits.map((v) => v.visitorId));
    return uniqueVisitors.size;
  }

  async getUniqueVisitsToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayVisits = this._visits.filter(
      (v) => v.date >= today && v.date < tomorrow
    );
    const uniqueVisitors = new Set(todayVisits.map((v) => v.visitorId));
    return uniqueVisitors.size;
  }

  async getVisitsByDate(startDate?: Date, endDate?: Date): Promise<number> {
    let filtered = this._visits;
    
    if (startDate) {
      filtered = filtered.filter((v) => v.date >= startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((v) => v.date <= end);
    }
    
    return filtered.length;
  }
}

export const storage: IStorage = db ? new DatabaseStorage(db) : new MemoryStorage();
