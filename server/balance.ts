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

/**
 * Reduce a child's name to initials for public display, e.g. "Maya Nistala" → "M.N."
 * Used so the balance page never exposes a full child name to whoever types an email.
 */
export function toInitials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map((p) => p[0].toUpperCase() + ".").join("");
}

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

/**
 * Read the sheet's PAYMENT column tolerantly. Handles the standard
 * "FULL PAID" / "DEPOSIT PAID" as well as reasonable variants ("Paid in full",
 * "Full Payment", "Deposit", casing/spacing differences). "NOT PAID" and blanks
 * classify as none. Full is checked first so "paid in full" never reads as deposit.
 */
export function classifyPayment(raw: string): "full" | "deposit" | "none" {
  const v = (raw ?? "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!v || v.includes("NOT PAID") || v.includes("UNPAID")) return "none";
  if (v.includes("FULL")) return "full";
  if (v.includes("DEPOSIT")) return "deposit";
  return "none";
}

export type BalanceItem = {
  weekId: string;
  weekLabel: string;
  locationName: string;
  fullPriceCents: number;
  depositPaidCents: number;
  balanceDueCents: number;
  /** Discount/promo code applied to this week's payment, if any. */
  discountCode?: string;
};

/** A week the parent has paid something toward — their purchase record. */
export type HistoryItem = {
  weekId: string;
  weekLabel: string;
  locationName: string;
  fullPriceCents: number;
  amountPaidCents: number;
  status: "paid_in_full" | "deposit_paid";
  /** Discount/promo code applied to this week's payment, if any. */
  discountCode?: string;
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
  /** Every week the parent has paid toward (full or deposit), for display. */
  history: HistoryItem[];
  totalPaidCents: number;
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

// Fetch the full paid-session list fresh on every lookup, so a just-paid deposit
// shows up immediately. Volume is low (one page or two), so paginating live is fine.
async function getAllPaidSessions(stripe: Stripe): Promise<Stripe.Checkout.Session[]> {
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
  return all.filter((s) => s.payment_status === "paid");
}

// The actual cents charged for each non-fee line item, in the same order as the
// session's items_json / balance_items_json — so amounts reflect any discount
// (e.g. a $1 "DOLLAR" code) rather than the sticker price. Excludes the
// "Processing Fee" line. Returns [] if it can't be fetched (caller falls back).
async function getNonFeeLineAmounts(stripe: Stripe, sessionId: string): Promise<number[]> {
  try {
    const li = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 });
    return li.data
      .filter((l) => !/processing fee/i.test(l.description ?? ""))
      .map((l) => l.amount_total ?? 0);
  } catch (err) {
    console.warn(`[balance] could not fetch line items for ${sessionId}:`, err);
    return [];
  }
}

// How many cents were refunded on a session's payment (0 if none). A Stripe
// refund leaves the Checkout Session's payment_status as "paid" and records the
// refund only on the underlying charge — so this is the ONLY reliable signal
// that money was given back. Without it, a refunded deposit keeps counting as
// paid and the balance page under-charges the family (see the ashokn@ case).
async function getSessionRefundedCents(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<number> {
  const pi = session.payment_intent;
  const piId = typeof pi === "string" ? pi : pi?.id;
  if (!piId) return 0;
  try {
    const charges = await stripe.charges.list({ payment_intent: piId, limit: 10 });
    return charges.data.reduce((sum, c) => sum + (c.amount_refunded ?? 0), 0);
  } catch (err) {
    console.warn(`[balance] could not fetch refunds for ${session.id}:`, err);
    return 0;
  }
}

// Non-fee (tuition) line amounts reduced by whatever was refunded. Refunds apply
// to the whole charge, so we assume the processing-fee portion comes back first
// and only reduce tuition once the refund exceeds the fee; any remaining refund
// is spread across the tuition lines proportionally. A full refund zeroes them.
async function refundAdjustedLineAmounts(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  nonFeeAmounts: number[],
): Promise<number[]> {
  const grossTuition = nonFeeAmounts.reduce((a, b) => a + b, 0);
  if (grossTuition <= 0) return nonFeeAmounts;
  const refunded = await getSessionRefundedCents(stripe, session);
  if (refunded <= 0) return nonFeeAmounts;
  const feeCents = Math.max(0, (session.amount_total ?? grossTuition) - grossTuition);
  const refundedTuition = Math.min(grossTuition, Math.max(0, refunded - feeCents));
  if (refundedTuition <= 0) return nonFeeAmounts;
  const keep = (grossTuition - refundedTuition) / grossTuition;
  return nonFeeAmounts.map((a) => Math.round(a * keep));
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

// --- Tracker sheet ---
type SheetRow = {
  emails: string[];
  weekIds: string[];
  payment: string; // normalized upper-case, e.g. "DEPOSIT PAID"
  studentName: string;
  timestamp: string;
};

// Retained only as a fallback if a fetch fails — never used to skip a fresh fetch.
let lastGoodSheet: SheetRow[] | null = null;

async function getSheetRows(): Promise<SheetRow[]> {
  try {
    // Cache-buster: Google's published CSV is CDN-cached (~5 min); a fresh query
    // string forces the newest copy so newly-added rows appear right away.
    const bustedUrl =
      TRACKER_SHEET_CSV_URL +
      (TRACKER_SHEET_CSV_URL.includes("?") ? "&" : "?") +
      "_cb=" +
      Date.now();
    const resp = await fetch(bustedUrl, {
      redirect: "follow",
      headers: { "cache-control": "no-cache" },
    });
    if (!resp.ok) {
      console.warn(`[balance] tracker sheet fetch failed: ${resp.status}`);
      return lastGoodSheet ?? [];
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
    lastGoodSheet = parsed;
    return parsed;
  } catch (err) {
    console.error("[balance] failed to load tracker sheet:", err);
    return lastGoodSheet ?? [];
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

  const paidByWeek = new Map<string, number>(); // week → ACTUAL cents paid (post-discount)
  const depositWeeks = new Set<string>(); // week → paid as a deposit (not full)
  const settledWeeks = new Set<string>(); // week → paid in full / balance settled
  const codeByWeek = new Map<string, string>(); // week → discount/promo code used
  const discountByWeek = new Map<string, number>(); // week → discount cents applied
  let studentName = "";
  let signedUp: number | null = null;
  let sawStripe = false;
  let sawSheet = false;

  const noteSignup = (ms: number) => {
    if (Number.isFinite(ms) && (signedUp === null || ms < signedUp)) signedUp = ms;
  };
  const addPaid = (wk: string, cents: number) =>
    paidByWeek.set(wk, (paidByWeek.get(wk) ?? 0) + cents);

  // 1) Stripe — read the ACTUAL amount charged per week (reflects discounts) ---
  const sessions = await getAllPaidSessions(stripe);
  for (const s of sessions) {
    if (sessionEmail(s) !== email) continue;
    sawStripe = true;
    const md = s.metadata ?? {};
    if (md.childName && !studentName) studentName = md.childName;
    if (typeof s.created === "number") noteSignup(s.created * 1000);
    const appliedCode = (md.appliedCode || md.promoCode || md.referralName || "").trim();

    // Actual per-line amounts (excludes the processing fee), in metadata order,
    // netted against any refund so refunded money is never counted as paid.
    const grossAmounts = await getNonFeeLineAmounts(stripe, s.id);
    const amounts = await refundAdjustedLineAmounts(stripe, s, grossAmounts);

    // Fully refunded (e.g. an accidental duplicate deposit you refunded): treat
    // the session as if it never happened so it can't inflate the amount paid or
    // mark a week as settled.
    if (grossAmounts.some((a) => a > 0) && amounts.every((a) => a === 0)) {
      continue;
    }

    if (md.paymentType === "balance") {
      // A prior balance payment settles those weeks; credit what was actually paid.
      safeParseArray(md.balance_items_json).forEach((b, i) => {
        const wk = b?.week_id;
        if (!wk) return;
        settledWeeks.add(wk);
        addPaid(wk, amounts[i] ?? (Number(b.balance_cents) || 0));
      });
    } else {
      // Initial checkout (deposit and/or full).
      const initialItems = safeParseArray(md.items_json);
      // A discount code reduces tuition (never the deposit), so the week's real
      // owed amount is fullPrice − discount. The discount is stored order-level
      // and applies to one full-payment line; only attribute it when the order
      // is a single week so we can pin it exactly. Otherwise we leave it unknown
      // and trust the settled flag (never over-charge a discounted family).
      const orderDiscountCents = parseInt(md.discountCents ?? "", 10) || 0;
      initialItems.forEach((it, i) => {
        const wk = it?.week_id;
        if (!wk) return;
        const isDeposit = (it.payment_type ?? "full") === "deposit";
        const amt = amounts[i] ?? (isDeposit ? DEPOSIT_CENTS : getWeekFullPriceCents(wk));
        addPaid(wk, amt);
        if (isDeposit) depositWeeks.add(wk);
        else settledWeeks.add(wk);
        if (appliedCode) {
          codeByWeek.set(wk, appliedCode);
          if (orderDiscountCents > 0 && initialItems.length === 1) {
            discountByWeek.set(wk, orderDiscountCents);
          }
        }
      });
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

    const status = classifyPayment(row.payment);
    if (status === "full") {
      for (const wk of row.weekIds) {
        settledWeeks.add(wk);
        if (!paidByWeek.has(wk)) paidByWeek.set(wk, getWeekFullPriceCents(wk));
      }
    } else if (status === "deposit") {
      // Only credit a sheet deposit when Stripe doesn't already record this week
      // (Zelle/check amount is unknown → assume the standard $150 deposit).
      for (const wk of row.weekIds) {
        if (!paidByWeek.has(wk) && !settledWeeks.has(wk)) {
          paidByWeek.set(wk, DEPOSIT_CENTS);
          depositWeeks.add(wk);
        }
      }
    }
    // NOT PAID / blank / anything else → nothing owed on the balance page.
  }

  // 3) Build outstanding items — any week whose actual payments fall short of the
  // tuition owed still owes the difference. This is driven off amounts PAID, not
  // a settled flag: a refund (netted above) or an underpaid balance can leave a
  // "settled" week short (see the ashokn@ case), and that shortfall must resurface
  // so the family can pay it. Tuition owed = fullPrice − any discount applied.
  // If a discount code was used but we can't pin its amount, we trust the settled
  // flag instead of guessing, so a discounted family is never over-charged.
  const allWeeks = new Set<string>([
    ...Array.from(settledWeeks),
    ...Array.from(depositWeeks),
    ...Array.from(paidByWeek.keys()),
  ]);
  const outstandingWeeks = new Set<string>();
  const items: BalanceItem[] = [];
  for (const weekId of Array.from(allWeeks)) {
    const code = codeByWeek.get(weekId);
    const discountCents = discountByWeek.get(weekId) ?? 0;
    // Discounted but amount unknown → trust settled, don't invent a balance.
    if (code && discountCents === 0 && settledWeeks.has(weekId)) continue;
    const fullPriceCents = getWeekFullPriceCents(weekId);
    const owedCents = fullPriceCents - discountCents;
    const paidCents = Math.min(paidByWeek.get(weekId) ?? 0, owedCents);
    const balanceDueCents = owedCents - paidCents;
    if (balanceDueCents <= 0) continue;
    outstandingWeeks.add(weekId);
    items.push({
      weekId,
      weekLabel: getCampWeekLabel(weekId),
      locationName: getCampLocationName(weekId),
      fullPriceCents,
      depositPaidCents: paidCents,
      balanceDueCents,
      ...(code ? { discountCode: code } : {}),
    });
  }
  items.sort((a, b) => a.weekId.localeCompare(b.weekId));

  // 4) Build purchase history — every week paid toward, with the real amount ---
  const history: HistoryItem[] = [];
  for (const weekId of Array.from(allWeeks)) {
    const fullPriceCents = getWeekFullPriceCents(weekId);
    const code = codeByWeek.get(weekId);
    history.push({
      weekId,
      weekLabel: getCampWeekLabel(weekId),
      locationName: getCampLocationName(weekId),
      fullPriceCents,
      amountPaidCents: paidByWeek.get(weekId) ?? 0,
      // A week still carrying an outstanding balance isn't paid in full, even if
      // a (short) balance payment marked it settled.
      status:
        settledWeeks.has(weekId) && !outstandingWeeks.has(weekId)
          ? "paid_in_full"
          : "deposit_paid",
      ...(code ? { discountCode: code } : {}),
    });
  }
  history.sort((a, b) => a.weekId.localeCompare(b.weekId));

  const totalDueCents = items.reduce((sum, i) => sum + i.balanceDueCents, 0);
  const totalPaidCents = history.reduce((sum, h) => sum + h.amountPaidCents, 0);
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
    history,
    totalPaidCents,
  };
}
