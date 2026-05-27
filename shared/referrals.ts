/**
 * Teacher & TA referral names — add every staff member parents can enter
 * in the promo/referral code field. Matching is case-insensitive.
 */
export const REFERRAL_NAMES = [
  "Arjun Kumar",
  "Yash Mathur",
  "Shuntavi Schuman-Olivier",
  // Add teachers and TAs below (one name per line):
] as const;

export type ReferralName = (typeof REFERRAL_NAMES)[number];

const normalizedLookup = new Map(
  REFERRAL_NAMES.map((name) => [name.trim().toLowerCase(), name]),
);

export function normalizeReferralName(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  return normalizedLookup.get(trimmed.toLowerCase()) ?? null;
}

export function isValidReferralName(input: string): boolean {
  return normalizeReferralName(input) !== null;
}
