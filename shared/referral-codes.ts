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
  "VAMP",
  "WAIL",
  "BELT",
  "HUMS",
  "PICK",
  "STAR",
  "FANS",
  "MIKE",
  "JAMS",
  "PLAY",
  "LIVE",
  "CHOR",
  "TUBA",
  "BOWS",
];

export const REFERRAL_CODES: ReferralCodeDefinition[] = PARENT_CODES.map((code) => ({
  code,
  ...PARENT_CODE_DEFAULTS,
}));

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
