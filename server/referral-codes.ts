import { lookupReferralCode, normalizeReferralCode, getReferralCodeDisplay } from "@shared/referral-codes";
import type { ReferralCodeDefinition } from "@shared/referral-codes";
import { storage } from "./storage";

export type ReferralCodeValidationResult =
  | {
      valid: true;
      code: string;
      displayCode: string;
      type: ReferralCodeDefinition["type"];
      discountCents: number;
      discountDollars: number;
      usesRemaining: number;
      label?: string;
    }
  | {
      valid: false;
      reason: "not_found" | "exhausted" | "no_database";
    };

export async function validateReferralCode(
  input: string,
): Promise<ReferralCodeValidationResult> {
  const definition = lookupReferralCode(input);
  if (!definition) {
    return { valid: false, reason: "not_found" };
  }

  const code = normalizeReferralCode(input);
  const useCount =
    definition.type === "staff" ? 0 : await storage.countReferralCodeUses(code);
  const usesRemaining =
    definition.type === "staff" || definition.maxUses === 0
      ? 999
      : definition.maxUses - useCount;

  if (definition.type !== "staff" && definition.maxUses > 0 && usesRemaining <= 0) {
    return { valid: false, reason: "exhausted" };
  }

  return {
    valid: true,
    code,
    displayCode: getReferralCodeDisplay(definition),
    type: definition.type,
    discountCents: definition.discountCents,
    discountDollars: definition.discountCents / 100,
    usesRemaining,
    label: definition.label,
  };
}

/** Apply a fixed discount once to the last line item, flooring at $0. */
export function applyOrderDiscount(
  prices: number[],
  discountDollars: number,
): number[] {
  if (prices.length === 0 || discountDollars <= 0) return prices;

  const result = [...prices];
  let remaining = discountDollars;
  const lastIndex = result.length - 1;

  const deduction = Math.min(remaining, result[lastIndex]);
  result[lastIndex] = Math.round((result[lastIndex] - deduction) * 100) / 100;
  remaining -= deduction;

  return result;
}

/** Resolve base price in dollars for a cart item. */
export function getItemBasePriceDollars(
  item: { weekId?: string; paymentType?: string; price?: number },
  weekPriceCents = 50000,
): number {
  if (item.paymentType === "deposit") return 150;
  return weekPriceCents / 100;
}
