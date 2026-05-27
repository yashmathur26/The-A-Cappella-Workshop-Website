/**
 * @deprecated Teacher/TA names are in shared/referral-codes.ts (staff type).
 * Kept for backwards compatibility with any legacy referralName API fields.
 */
export const REFERRAL_NAMES = [] as const;

export function normalizeReferralName(_input: string): string | null {
  return null;
}

export function isValidReferralName(_input: string): boolean {
  return false;
}
