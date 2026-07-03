import Stripe from "stripe";
import { parse } from "csv-parse/sync";
import { getCampWeekLabel, getCampLocationName } from "@shared/camp-week-labels";

// ---------------------------------------------------------------------------
// Outstanding camp-balance lookup.
//
// The /pay-balance page needs to answer: "for this parent email, which camp
// weeks had a deposit paid but still owe the remaining balance?" The authoritative
// records for that live in TWO places, NOT in our local `registrations` table:
//
//   1. Stripe  — card deposits ($150/week + 3.6% fee). Weeks are in session metadata.
//   2. The tracker Google Sheet — the master registration form the admin marks
//      as DEPOSIT PAID / FULL PAID. This is the only record for parents who paid
//      their deposit by Zelle or check (not on Stripe).
//
// We reconcile both, keyed by (email, weekId), so a parent who appears in both
// sources is never double-counted.
// ---------------------------------------------------------------------------

const DEPOSIT_CENTS = 15000; // Flat $150 deposit per week (all locations).

/** Full tuition per week. Lexington + legacy weeks are $500; Newton/Wayland are $600. */
export function getWeekFullPriceCents(weekId: string): number {
  if (weekId === "nw-wk2" || weekId === "way-wk1") return 60000;
  return 50000;
}

// Published CSV export of the tracker sheet (first tab, gid=914273778). Override
// via env if the sheet ever moves.
const TRACKER_SHEET_CSV_URL =
  process.env.TRACKER_SHEET_CSV_URL?.trim() ||
  "https://docs.google.com/spreadsheets/d/14ee96lzwrkmd_iskoMBjFR9aesHUfyeHeq3tC1WKjuQ/export?format=csv&gid=914273778";

// Sheet date tokens (e.g. "August 3-7") → Lexington week ids.
const SHEET_DATE_TO_WEEK: Record<string, string> = {
  "july 27-31": "lex-wk1",
  "august 3-7": "lex-wk2",
  "august 10-14": "lex-wk3",
  "august 17-21": "lex-wk4",
  "august 24-28": "lex-wk5",
};

function dateTokenToWeekId(token: string): string | null {
  const norm = token
    .toLowerCase()
    .replace(/[–—]/g, "-") // en/em dash → hyphen
    .replace(/,.*$/, "") // drop any trailing ", 2026"
    .replace(/\s+/g, " ")
    .trim();
  return SHEET_DATE_TO_WEEK[norm] ?? null;
}

export type BalanceItem = {
  weekId: string;
  weekLabel: string;
  locationName: string;
  fullPriceCents: number;
  depositPaidCents: number;
  balanceDueCents: number;
};

export type BalanceResult = {
  parentEmail: string;
  studentName: string;
  /** ISO date of the earliest deposit/registration we can find, or null. */
  signedUpAt: string | null;
  /** Where the outstanding info came from — useful for support/debugging. */
  source: "stripe" | "sheet" | "mixed" | "none";
  items: BalanceItem[];
  totalDueCents: number;
  hasBalance: boolean;
};

function safeParseArray(json: unknown): any[] {
  if (typeof json !== "string" || !json.trim()) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// --- Stripe: cache the full paid-session list briefly so per-lookup pagination
// doesn't hammer the API. Balances change rarely; 2 min staleness is fine. ---
let sessionCache: { at: number; data: Stripe.Checkout.Session[] } | null = null;
const SESSION_TTL_MS = 120_000;

async function getAllPaidSessions(stripe: Stripe): Promise<Stripe.Checkout.Session[]> {
  if (sessionCache && Date.now() - sessionCache.at < SESSION_TTL_MS) {
    return sessionCache.data;
  }
  const all: Stripe.Checkout.Session[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < 10; page++) {
    const resp = await stripe.checkout.sessions.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    all.push(...resp.data);
    if (!resp.has_more || resp.data.length === 0) break;
    startingAfter = resp.data[resp.data.length - 1].id;
  }
  const paid = all.filter((s) => s.payment_status === "paid");
  sessionCache = { at: Date.now(), data: paid };
  return paid;
}

function sessionEmail(s: Stripe.Checkout.Session): string {
  return (
    s.customer_details?.email ||
    (s.metadata?.parentEmail ?? "") ||
    ""
  )
    .trim()
    .toLowerCase();
}

// --- Tracker sheet (cached similarly). ---
type SheetRow = {
  emails: string[];
  weekIds: string[];
  payment: string; // normalized upper-case, e.g. "DEPOSIT PAID"
  studentName: string;
  timestamp: string;
};

let sheetCache: { at: number; data: SheetRow[] } | null = null;
const SHEET_TTL_MS = 120_000;

async function getSheetRows(): Promise<SheetRow[]> {
  if (sheetCache && Date.now() - sheetCache.at < SHEET_TTL_MS) {
    return sheetCache.data;
  }
  try {
    const resp = await fetch(TRACKER_SHEET_CSV_URL, { redirect: "follow" });
    if (!resp.ok) {
      console.warn(`[balance] tracker sheet fetch failed: ${resp.status}`);
      return sheetCache?.data ?? [];
    }
    let text = await resp.text();
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
    const rows = parse(text, {
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }) as string[][];
    if (rows.length < 2) return [];

    const header = rows[0].map((h) => String(h).toLowerCase().trim());
    const col = {
      payment:
        header.indexOf("payment") >= 0
          ? header.indexOf("payment")
          : header.findIndex((h) => h.startsWith("payment") && !h.includes("plan")),
      dates: header.findIndex(
        (h) => h.includes("date(s)") || (h.includes("date") && h.includes("register")),
      ),
      email: header.indexOf("email address"),
      parentEmail: header.findIndex(
        (h) => h.includes("guardian email") || (h.includes("parent") && h.includes("email")),
      ),
      student: header.findIndex((h) => h.includes("student name")),
      timestamp: header.findIndex((h) => h.includes("timestamp")),
    };

    const parsed: SheetRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const emails = [col.email, col.parentEmail]
        .filter((c) => c >= 0)
        .map((c) => (r[c] ?? "").trim().toLowerCase())
        .filter(Boolean);
      const weekIds = col.dates >= 0
        ? (r[col.dates] ?? "")
            .split(",")
            .map((t) => dateTokenToWeekId(t))
            .filter((w): w is string => !!w)
        : [];
      parsed.push({
        emails: Array.from(new Set(emails)),
        weekIds: Array.from(new Set(weekIds)),
        payment: col.payment >= 0 ? (r[col.payment] ?? "").trim().toUpperCase() : "",
        studentName: col.student >= 0 ? (r[col.student] ?? "").trim() : "",
        timestamp: col.timestamp >= 0 ? (r[col.timestamp] ?? "").trim() : "",
      });
    }
    sheetCache = { at: Date.now(), data: parsed };
    return parsed;
  } catch (err) {
    console.error("[balance] failed to load tracker sheet:", err);
    return sheetCache?.data ?? [];
  }
}

/**
 * Compute outstanding deposit balances for a parent email by reconciling Stripe
 * and the tracker sheet. Never trusts client-supplied amounts.
 */
export async function computeOutstandingForEmail(
  stripe: Stripe,
  rawEmail: string,
): Promise<BalanceResult> {
  const email = rawEmail.trim().toLowerCase();

  const depositByWeek = new Map<string, number>(); // week → cents paid as deposit
  const settledWeeks = new Set<string>(); // week → paid in full / balance settled
  let studentName = "";
  let signedUp: number | null = null;
  let sawStripe = false;
  let sawSheet = false;

  const noteSignup = (ms: number) => {
    if (Number.isFinite(ms) && (signedUp === null || ms < signedUp)) signedUp = ms;
  };

  // 1) Stripe --------------------------------------------------------------
  const sessions = await getAllPaidSessions(stripe);
  for (const s of sessions) {
    if (sessionEmail(s) !== email) continue;
    sawStripe = true;
    const md = s.metadata ?? {};
    if (md.childName && !studentName) studentName = md.childName;
    if (typeof s.created === "number") noteSignup(s.created * 1000);

    if (md.paymentType === "balance") {
      // A prior balance payment settles those weeks.
      for (const b of safeParseArray(md.balance_items_json)) {
        if (b?.week_id) settledWeeks.add(b.week_id);
      }
    } else {
      // Initial checkout (deposit and/or full).
      for (const it of safeParseArray(md.items_json)) {
        const wk = it?.week_id;
        if (!wk) continue;
        if ((it.payment_type ?? "full") === "deposit") {
          depositByWeek.set(wk, (depositByWeek.get(wk) ?? 0) + DEPOSIT_CENTS);
        } else {
          settledWeeks.add(wk); // paid in full at registration
        }
      }
    }
  }

  // 2) Tracker sheet (Zelle/check + master list) ---------------------------
  const sheetRows = await getSheetRows();
  for (const row of sheetRows) {
    if (!row.emails.includes(email)) continue;
    sawSheet = true;
    if (row.studentName && !studentName) studentName = row.studentName;
    const ts = Date.parse(row.timestamp);
    if (!Number.isNaN(ts)) noteSignup(ts);

    if (row.payment === "FULL PAID") {
      for (const wk of row.weekIds) settledWeeks.add(wk);
    } else if (row.payment === "DEPOSIT PAID") {
      // Only credit a sheet deposit when Stripe doesn't already record one for
      // this week, so overlapping records aren't double-counted.
      for (const wk of row.weekIds) {
        if (!depositByWeek.has(wk)) depositByWeek.set(wk, DEPOSIT_CENTS);
      }
    }
    // NOT PAID / blank → nothing owed on the balance page.
  }

  // 3) Build outstanding items --------------------------------------------
  const items: BalanceItem[] = [];
  for (const [weekId, paidRaw] of Array.from(depositByWeek.entries())) {
    if (settledWeeks.has(weekId)) continue;
    const fullPriceCents = getWeekFullPriceCents(weekId);
    const depositPaidCents = Math.min(paidRaw, fullPriceCents);
    const balanceDueCents = fullPriceCents - depositPaidCents;
    if (balanceDueCents <= 0) continue;
    items.push({
      weekId,
      weekLabel: getCampWeekLabel(weekId),
      locationName: getCampLocationName(weekId),
      fullPriceCents,
      depositPaidCents,
      balanceDueCents,
    });
  }
  items.sort((a, b) => a.weekId.localeCompare(b.weekId));

  const totalDueCents = items.reduce((sum, i) => sum + i.balanceDueCents, 0);
  const source: BalanceResult["source"] =
    sawStripe && sawSheet ? "mixed" : sawStripe ? "stripe" : sawSheet ? "sheet" : "none";

  return {
    parentEmail: email,
    studentName,
    signedUpAt: signedUp !== null ? new Date(signedUp).toISOString() : null,
    source,
    items,
    totalDueCents,
    hasBalance: items.length > 0,
  };
}
