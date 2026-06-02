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
  const useCount = await storage.countReferralCodeUses(code);
  const usesRemaining = definition.maxUses - useCount;

  if (usesRemaining <= 0) {
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

/**
 * Apply a fixed discount once to a single eligible line item, flooring at $0.
 *
 * Discount codes only apply to the final (full) payment, so when payment types
 * are provided the discount is applied to the last full-payment item. If there
 * are no full-payment items, no discount is applied.
 */
export function applyOrderDiscount(
  prices: number[],
  discountDollars: number,
  paymentTypes?: Array<string | undefined>,
): number[] {
  if (prices.length === 0 || discountDollars <= 0) return prices;

  const result = [...prices];

  let targetIndex = result.length - 1;
  if (paymentTypes) {
    targetIndex = -1;
    for (let i = 0; i < result.length; i++) {
      if ((paymentTypes[i] ?? "full") !== "deposit") {
        targetIndex = i;
      }
    }
    if (targetIndex === -1) return result; // no full-payment item — no discount
  }

  const deduction = Math.min(discountDollars, result[targetIndex]);
  result[targetIndex] = Math.round((result[targetIndex] - deduction) * 100) / 100;

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
