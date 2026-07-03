/** Week id → display label (all camp locations). Used server-side for balance payments. */
export const CAMP_WEEK_LABELS: Record<string, string> = {
  "lex-wk1": "July 27–31, 2026",
  "lex-wk2": "August 3–7, 2026",
  "lex-wk3": "August 10–14, 2026",
  "lex-wk4": "August 17–21, 2026",
  "lex-wk5": "August 24–28, 2026",
  "nw-wk2": "August 17–21, 2026",
  "way-wk1": "August 3–7, 2026",
  // Legacy / DB seed ids
  wk1: "June 22–26, 2026",
  wk2: "July 27–31, 2026",
  wk3: "August 3–7, 2026",
  wk4: "August 10–14, 2026",
  wk5: "August 17–21, 2026",
};

export function getCampWeekLabel(weekId: string): string {
  return CAMP_WEEK_LABELS[weekId] ?? weekId;
}

/** Infer location name from week id prefix for display. */
export function getCampLocationName(weekId: string): string {
  if (weekId.startsWith("lex-") || weekId.startsWith("wk")) return "Lexington";
  if (weekId.startsWith("nw-")) return "Newton";
  if (weekId.startsWith("way-")) return "Wayland";
  return "Camp";
}
