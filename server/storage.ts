import {
  users,
  students,
  weeks,
  registrations,
  payments,
  auditLogs,
  content,
  type User,
  type UpsertUser,
  type Student,
  type InsertStudent,
  type Week,
  type InsertWeek,
  type Registration,
  type InsertRegistration,
  type Payment,
  type InsertPayment,
  type AuditLog,
  type InsertAuditLog,
  type Content,
  type InsertContent,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;

  // Student operations
  getStudents(userId: string): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent & { userId: string }): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;

  // Week operations
  getWeeks(): Promise<Week[]>;
  getWeek(id: string): Promise<Week | undefined>;
  seedWeeks(): Promise<void>;

  // Registration operations
  getRegistrations(userId?: string): Promise<Registration[]>;
  getRegistration(id: string): Promise<Registration | undefined>;
  getRegistrationBySessionId(sessionId: string): Promise<Registration | undefined>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  updateRegistrationStatus(id: string, status: string): Promise<void>;
  updateRegistrationStripeData(id: string, sessionId?: string, paymentIntentId?: string): Promise<void>;

  // Payment operations
  getPayments(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Content operations
  getContent(key?: string): Promise<Content[]>;
  updateContent(key: string, value: string, updatedBy?: string): Promise<Content>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        email: userData.email?.toLowerCase(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          email: userData.email?.toLowerCase(),
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Student operations
  async getStudents(userId: string): Promise<Student[]> {
    return db.select().from(students).where(eq(students.userId, userId));
  }

  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async createStudent(student: InsertStudent & { userId: string }): Promise<Student> {
    const [newStudent] = await db
      .insert(students)
      .values({
        ...student,
        updatedAt: new Date(),
      })
      .returning();
    return newStudent;
  }

  async updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student> {
    const [updated] = await db
      .update(students)
      .set({ ...student, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();
    return updated;
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  // Week operations
  async getWeeks(): Promise<Week[]> {
    return db.select().from(weeks);
  }

  async getWeek(id: string): Promise<Week | undefined> {
    const [week] = await db.select().from(weeks).where(eq(weeks.id, id));
    return week || undefined;
  }

  async seedWeeks(): Promise<void> {
    const weekData = [
      { id: "wk1", label: "June 22–26, 2026" },
      { id: "wk2", label: "July 27–31, 2026" },
      { id: "wk3", label: "August 3–7, 2026" },
      { id: "wk4", label: "August 10–14, 2026" },
      { id: "wk5", label: "August 17–21, 2026" },
    ];

    for (const week of weekData) {
      await db
        .insert(weeks)
        .values({
          ...week,
          priceCents: 50000,
          capacity: 20,
        })
        .onConflictDoNothing();
    }
  }

  // Registration operations
  async getRegistrations(userId?: string): Promise<Registration[]> {
    if (userId) {
      return db.select().from(registrations).where(eq(registrations.userId, userId));
    }
    return db.select().from(registrations);
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.id, id));
    return registration || undefined;
  }

  async getRegistrationBySessionId(sessionId: string): Promise<Registration | undefined> {
    const [registration] = await db
      .select()
      .from(registrations)
      .where(eq(registrations.stripeCheckoutSessionId, sessionId));
    return registration || undefined;
  }

  async createRegistration(registration: InsertRegistration): Promise<Registration> {
    const [newRegistration] = await db
      .insert(registrations)
      .values({
        ...registration,
        updatedAt: new Date(),
      })
      .returning();
    return newRegistration;
  }

  async updateRegistrationStatus(id: string, status: string): Promise<void> {
    await db
      .update(registrations)
      .set({ status, updatedAt: new Date() })
      .where(eq(registrations.id, id));
  }

  async updateRegistrationStripeData(
    id: string,
    sessionId?: string,
    paymentIntentId?: string
  ): Promise<void> {
    await db
      .update(registrations)
      .set({
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
        updatedAt: new Date(),
      })
      .where(eq(registrations.id, id));
  }

  async updateRegistrationPaymentInfo(
    id: string,
    sessionId: string,
    paymentType: string,
    amountPaidCents?: number,
    balanceDueCents?: number
  ): Promise<void> {
    const updateData: any = {
      stripeCheckoutSessionId: sessionId,
      paymentType,
      updatedAt: new Date(),
    };
    
    if (amountPaidCents !== undefined) {
      updateData.amountPaidCents = amountPaidCents;
    }
    
    if (balanceDueCents !== undefined) {
      updateData.balanceDueCents = balanceDueCents;
    }
    
    await db
      .update(registrations)
      .set(updateData)
      .where(eq(registrations.id, id));
  }

  // Payment operations
  async getPayments(userId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.userId, userId));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  // Audit log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  // Content operations
  async getContent(key?: string): Promise<Content[]> {
    if (key) {
      return db.select().from(content).where(eq(content.key, key));
    }
    return db.select().from(content);
  }

  async updateContent(key: string, value: string, updatedBy?: string): Promise<Content> {
    const [updated] = await db
      .insert(content)
      .values({
        key,
        value,
        updatedBy,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: content.key,
        set: {
          value,
          updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
