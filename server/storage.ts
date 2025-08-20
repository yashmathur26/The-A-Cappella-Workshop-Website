import { type Registration, type InsertRegistration } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  getRegistrationBySessionId(sessionId: string): Promise<Registration | undefined>;
  updatePaymentStatus(sessionId: string, status: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private registrations: Map<string, Registration>;

  constructor() {
    this.registrations = new Map();
  }

  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    const id = randomUUID();
    const registration: Registration = {
      ...insertRegistration,
      id,
      stripeSessionId: null,
      paymentStatus: "pending",
      createdAt: new Date(),
    };
    this.registrations.set(id, registration);
    return registration;
  }

  async getRegistrationBySessionId(sessionId: string): Promise<Registration | undefined> {
    return Array.from(this.registrations.values()).find(
      (reg) => reg.stripeSessionId === sessionId
    );
  }

  async updatePaymentStatus(sessionId: string, status: string): Promise<void> {
    const registration = Array.from(this.registrations.values()).find(
      (reg) => reg.stripeSessionId === sessionId
    );
    if (registration) {
      registration.paymentStatus = status;
      this.registrations.set(registration.id, registration);
    }
  }

  async updateStripeSessionId(id: string, sessionId: string): Promise<void> {
    const registration = this.registrations.get(id);
    if (registration) {
      registration.stripeSessionId = sessionId;
      this.registrations.set(id, registration);
    }
  }
}

export const storage = new MemStorage();
