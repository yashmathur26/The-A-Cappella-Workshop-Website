export type ReferralCodeType = "parent" | "staff";

export interface ReferralCodeDefinition {
  code: string;
  label?: string;
  type: ReferralCodeType;
  discountCents: number;
  maxUses: number;
}

const PARENT_CODE_DEFAULTS = {
  type: "parent" as const,
  discountCents: 10000,
  maxUses: 3,
};

const PARENT_CODES = [
  "SING",
  "SONG",
  "NOTE",
  "TUNE",
  "RIFF",
  "BEAT",
  "TONE",
  "LILT",
  "HARP",
  "LUTE",
  "HORN",
  "DRUM",
  "BELL",
  "GONG",
  "REED",
  "KEYS",
  "ARIA",
  "HYMN",
  "OPUS",
  "JAZZ",
  "FOLK",
  "ROCK",
  "SOUL",
  "PUNK",
  "ALTO",
  "BASS",
  "CLEF",
  "FLAT",
  "REST",
  "LOUD",
  "SOFT",
  "HIGH",
  "TRIO",
  "DUET",
  "SOLO",
  "BAND",
  "WAIL",
  "BELT",
  "HUMS",
  "STAR",
  "FANS",
  "HAND",
  "FEET",
  "VAMP",
  "PICK",
  "STEM",
  "FRET",
  "NECK",
  "TUBA",
  "OBOE",
  "FIFE",
  "GIGS",
  "SETS",
  "MICS",
  "AMPS",
  "WIRE",
  "CORD",
  "JACK",
  "KNOB",
  "FADE",
  "GAIN",
  "DROP",
  "HOOK",
  "BARS",
];

const STAFF_CODE_DEFAULTS = {
  type: "staff" as const,
  discountCents: 5000,
  maxUses: 5,
};

/** Teacher & TA first names — entered in the promo/referral code field ($50 off). */
const STAFF_NAMES = [
  "Aman",
  "Helene",
  "Abigail",
  "Rohan",
  "Izzi",
  "Luke",
  "Palin",
  "Soham",
  "Vivian",
  "Shriya",
  "Diya",
  "Iris",
  "Krish",
  "Amal",
  "Niva",
  "Maggie",
  "Laila",
  "Tate",
  "Julian",
  "Anaya",
  "Henry",
  "Lucas",
  "Enkhjin",
  "Ayla",
  "Nishka",
  "Will",
  "Ella",
  "Sofia",
  "Elliot",
  "Rowan",
];

function staffDefinition(name: string): ReferralCodeDefinition {
  const trimmed = name.trim();
  return {
    code: trimmed.toUpperCase(),
    label: trimmed,
    ...STAFF_CODE_DEFAULTS,
  };
}

export const REFERRAL_CODES: ReferralCodeDefinition[] = [
  ...PARENT_CODES.map((code) => ({ code, ...PARENT_CODE_DEFAULTS })),
  ...STAFF_NAMES.map(staffDefinition),
];

const codeLookup = new Map(
  REFERRAL_CODES.map((def) => [def.code.trim().toUpperCase(), def]),
);

export function normalizeReferralCode(input: string): string {
  return input.trim().toUpperCase();
}

export function lookupReferralCode(input: string): ReferralCodeDefinition | null {
  const normalized = normalizeReferralCode(input);
  if (!normalized) return null;
  return codeLookup.get(normalized) ?? null;
}

export function isReferralCode(input: string): boolean {
  return lookupReferralCode(input) !== null;
}

/** Name shown on Stripe and in the UI (e.g. "Aman" not "AMAN"). */
export function getReferralCodeDisplay(def: ReferralCodeDefinition): string {
  return def.label ?? def.code;
}

/**
 * Discount referral codes only apply to the final (full) payment, never to
 * deposit-only line items.
 */
export function isFullPaymentOnlyCode(def: ReferralCodeDefinition): boolean {
  return def.discountCents > 0;
}
