import "./env";
import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { storage } from "./storage";
import { sendRegistrationConfirmationEmail, sendBalanceVerificationCode } from "./brevo";
import { randomUUID } from "crypto";
import { insertRegistrationSchema, type Week, visits } from "@shared/schema";
import { normalizeReferralName } from "@shared/referrals";
import { lookupReferralCode } from "@shared/referral-codes";
import {
  validateReferralCode,
  applyOrderDiscount,
  getItemBasePriceDollars,
} from "./referral-codes";
import { pool, db } from "./db";
import { pickResponseRow, resolveSheetColumns } from "./sheet-csv";
import { computeOutstandingForEmail } from "./balance";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-07-30.basil",
    })
  : null;

if (!stripe) {
  console.warn(
    "STRIPE_SECRET_KEY is not set; payment endpoints will be disabled (local dev mode).",
  );
}

// Ensure data/rosters directory exists
function ensureRosterDirectory() {
  const rosterDir = path.join(process.cwd(), 'data', 'rosters');
  if (!fs.existsSync(rosterDir)) {
    fs.mkdirSync(rosterDir, { recursive: true });
  }
}

// Write roster record to JSONL files
function writeRosterRecord(record: any) {
  ensureRosterDirectory();
  const rosterDir = path.join(process.cwd(), 'data', 'rosters');
  
  // Write to per-week file
  const weekFile = path.join(rosterDir, `${record.week_id}.jsonl`);
  fs.appendFileSync(weekFile, JSON.stringify(record) + '\n', 'utf8');
  
  // Write to global index
  const indexFile = path.join(rosterDir, '_index.jsonl');
  fs.appendFileSync(indexFile, JSON.stringify(record) + '\n', 'utf8');
}

async function initializeDatabase() {
  try {
    // Test database connection (if configured)
    if (pool) {
      const client = await pool.connect();
      client.release();
      console.log('Database initialized successfully');
    } else {
      console.warn('Database not configured; continuing without persistence.');
    }

    // Seed weeks (works for both DB and in-memory storage)
    await storage.seedWeeks();
  } catch (error) {
    console.error('Database initialization error:', error);
    // In local/dev mode we prefer the site to boot even if DB seeding fails.
    // Routes that rely on persistence may be degraded.
  }
}

// Form submissions: session ID -> contact info (from Google Form webhook)
interface FormSubmissionData {
  timestamp: number;
  parentEmail?: string;
  childName?: string;
  parentName?: string;
}
const formSubmissions = new Map<string, FormSubmissionData>();

/** Published CSV URL for the form linked to each location (falls back to GOOGLE_SHEET_CSV_URL). */
function getSheetCsvUrlForLocation(location: string | undefined): string | undefined {
  const loc = (location ?? "").trim();
  const fromEnv: Record<string, string | undefined> = {
    lexington: process.env.GOOGLE_SHEET_CSV_URL_LEXINGTON,
    "newton-wellesley":
      process.env.GOOGLE_SHEET_CSV_URL_NEWTON ??
      process.env.GOOGLE_SHEET_CSV_URL_NEWTON_WAYLAND,
    wayland:
      process.env.GOOGLE_SHEET_CSV_URL_WAYLAND ??
      process.env.GOOGLE_SHEET_CSV_URL_NEWTON_WAYLAND,
  };
  const specific = loc ? fromEnv[loc]?.trim() : undefined;
  if (specific) return specific;
  return process.env.GOOGLE_SHEET_CSV_URL?.trim();
}

// Match by email: when user enters email on site we link sessionId <-> email.
// When webhook arrives with that email we attach the form data to that session.
const sessionIdByEmail = new Map<string, string>();
const pendingByEmail = new Map<string, FormSubmissionData>();

// Sessions that detected form submission (iframe) but haven't received contact data yet.
// When the webhook arrives we match it to the most recent pending session.
const sessionsAwaitingWebhook = new Map<string, number>(); // sessionId -> timestamp

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database
  await initializeDatabase();

  // Get available weeks
  app.get("/api/weeks", async (req, res) => {
    try {
      const weeks = await storage.getWeeks();
      res.json(weeks);
    } catch (error) {
      console.error("Error fetching weeks:", error);
      res.status(500).json({ message: "Failed to fetch weeks" });
    }
  });

  // Register email for this session (so we can match form submission by email — no "Registration ID" field needed)
  app.post("/api/register-form-email", express.json(), async (req, res) => {
    try {
      const { sessionId, email } = req.body;
      if (!sessionId || !email || typeof email !== "string") {
        return res.status(400).json({ message: "Session ID and email required" });
      }
      const normalized = email.trim().toLowerCase();
      if (!normalized) return res.status(400).json({ message: "Email required" });
      sessionIdByEmail.set(normalized, sessionId);
      const pending = pendingByEmail.get(normalized);
      if (pending) {
        formSubmissions.set(sessionId, pending);
        pendingByEmail.delete(normalized);
        console.log(`✅ Matched pending form submission for ${normalized} to session ${sessionId}`);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error registering form email:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // Fetch latest form response from Google Sheet (published CSV) and attach to session.
  //
  // IMPORTANT: Google's published CSV (`pub?output=csv`) is cached server-side for up to
  // 5 minutes (`cache-control: private, max-age=300`). New form submissions may NOT appear
  // in the CSV for several minutes. The Apps Script webhook (docs/google-form-webhook.gs)
  // is the recommended path because it fires instantly on submit and is cache-free; this
  // endpoint exists as a best-effort fallback when the webhook isn't set up.
  app.post("/api/fetch-form-from-sheet", express.json(), async (req, res) => {
    try {
      const { sessionId, location, parentEmail: registeredEmailBody } = req.body as {
        sessionId?: string;
        location?: string;
        /** If the user entered parent email on the site, match that row in the sheet (recommended for Newton/Wayland). */
        parentEmail?: string;
      };
      if (!sessionId || typeof sessionId !== "string") {
        return res.status(400).json({ message: "Session ID required" });
      }

      const locTag = typeof location === "string" && location ? location : "(none)";
      const sheetUrl = getSheetCsvUrlForLocation(
        typeof location === "string" ? location : undefined,
      );
      if (!sheetUrl) {
        console.error(
          `[sheet ${locTag}] No CSV URL configured. Set GOOGLE_SHEET_CSV_URL or GOOGLE_SHEET_CSV_URL_${(location ?? "").toUpperCase()} in env.`,
        );
        return res.status(503).json({ message: "Form sheet not configured" });
      }

      // Cache-bust attempt + explicit no-cache headers. Google's CDN often ignores arbitrary
      // query params, but combining timestamp + cookie reset + Pragma headers can occasionally
      // squeeze a fresh response out, especially right after a publish edit.
      const bustedUrl =
        sheetUrl + (sheetUrl.includes("?") ? "&" : "?") + `_=${Date.now()}`;
      const response = await fetch(bustedUrl, {
        headers: {
          "User-Agent": "A-Cappella-Workshop/1",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        // @ts-ignore — node fetch supports `cache` in newer versions and ignores it otherwise
        cache: "no-store",
      });
      if (!response.ok) {
        console.error(
          `[sheet ${locTag}] CSV fetch failed: ${response.status} ${response.statusText} (url: ${sheetUrl})`,
        );
        return res.status(502).json({ message: "Could not load form responses" });
      }

      let text = await response.text();
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM if present
      const rows = parse(text, { skip_empty_lines: true, relax_column_count: true, trim: true }) as string[][];
      if (!rows.length || rows.length < 2) {
        console.warn(`[sheet ${locTag}] CSV parsed but has <2 rows (rows=${rows.length}).`);
        return res.status(404).json({ message: "No form responses in sheet" });
      }

      const headerRow = rows[0].map((c) => String(c).trim());
      const { parentEmailCol, childNameCol, parentNameCol, sessionIdCol, timestampCol } =
        resolveSheetColumns(headerRow);

      if (parentEmailCol < 0) {
        console.error(
          `[sheet ${locTag}] Missing parent/guardian email column. Headers: ${JSON.stringify(headerRow)}`,
        );
        return res.status(502).json({ message: "Sheet format unexpected" });
      }

      const registeredEmail =
        typeof registeredEmailBody === "string" ? registeredEmailBody : undefined;

      // Useful debug log per-attempt (visible in Replit/Railway logs):
      const lastRow = rows[rows.length - 1] ?? [];
      const lastTs = timestampCol >= 0 ? lastRow[timestampCol] ?? "" : "";
      const lastEmail = parentEmailCol >= 0 ? lastRow[parentEmailCol] ?? "" : "";
      console.log(
        `[sheet ${locTag}] fetch session=${sessionId.slice(0, 8)} email=${registeredEmail || "(none)"} rows=${rows.length} cols={ts:${timestampCol},email:${parentEmailCol},child:${childNameCol},parent:${parentNameCol},sid:${sessionIdCol}} lastRow={ts:"${lastTs}",email:"${lastEmail}"}`,
      );

      const dataRow = pickResponseRow(
        rows,
        sessionId,
        sessionIdCol,
        registeredEmail,
        parentEmailCol,
        timestampCol,
        // Allow rows up to 10 minutes old when matching the recent-submission case.
        // Reason: Google's CSV cache (max-age=300) means even "just submitted" rows can
        // appear with timestamps that look ~5 min stale by the time we read them. A
        // tighter window causes false-negatives.
        600,
      );
      if (!dataRow) {
        console.warn(
          `[sheet ${locTag}] No matching row picked (session=${sessionId.slice(0, 8)}, email=${registeredEmail || "(none)"}). This is normal if the form was just submitted — Google's CSV cache is up to 5 min behind.`,
        );
        return res.status(404).json({ message: "No matching form response found" });
      }
      const parentEmail = (dataRow[parentEmailCol] ?? "").trim();
      if (!parentEmail) {
        console.warn(`[sheet ${locTag}] Picked row has empty parent email cell.`);
        return res.status(404).json({ message: "No parent email in latest response" });
      }

      const childName = (childNameCol >= 0 ? dataRow[childNameCol] ?? "" : "").trim();
      const parentName = (parentNameCol >= 0 ? dataRow[parentNameCol] ?? "" : "").trim();

      const data: FormSubmissionData = {
        timestamp: Date.now(),
        parentEmail,
        ...(childName && { childName }),
        ...(parentName && { parentName }),
      };
      formSubmissions.set(sessionId, data);
      sessionsAwaitingWebhook.delete(sessionId);
      console.log(
        `[sheet ${locTag}] ✅ Matched row for session=${sessionId.slice(0, 8)} email=${parentEmail}${childName ? " child=" + childName : ""}`,
      );

      res.json({ parentEmail, childName: childName || null, parentName: parentName || null });
    } catch (error) {
      console.error("Error fetching form from sheet:", error);
      res.status(500).json({ message: "Failed to load form response" });
    }
  });

  // Diagnostic endpoint: fetch the configured CSV for a location and return parsed
  // metadata (URL, status, headers, last 3 rows). Use this when auto-fill seems
  // broken to verify the sheet/column mapping. Hit:
  //   GET /api/sheet-diagnostic?location=lexington
  app.get("/api/sheet-diagnostic", async (req, res) => {
    try {
      const location = typeof req.query.location === "string" ? req.query.location : undefined;
      const sheetUrl = getSheetCsvUrlForLocation(location);
      if (!sheetUrl) {
        return res.status(503).json({
          ok: false,
          location: location ?? "(none)",
          error: `No CSV URL configured. Set GOOGLE_SHEET_CSV_URL or GOOGLE_SHEET_CSV_URL_${(location ?? "").toUpperCase()} in env.`,
        });
      }
      const bustedUrl =
        sheetUrl + (sheetUrl.includes("?") ? "&" : "?") + `_=${Date.now()}`;
      const r = await fetch(bustedUrl, {
        headers: {
          "User-Agent": "A-Cappella-Workshop/1",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        // @ts-ignore
        cache: "no-store",
      });
      if (!r.ok) {
        return res.status(502).json({
          ok: false,
          location,
          sheetUrl,
          status: r.status,
          statusText: r.statusText,
        });
      }
      let text = await r.text();
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      const rows = parse(text, {
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
      }) as string[][];
      const headerRow = (rows[0] ?? []).map((c) => String(c).trim());
      const cols = resolveSheetColumns(headerRow);
      const lastN = rows.slice(Math.max(1, rows.length - 3));
      return res.json({
        ok: true,
        location,
        sheetUrl,
        cacheControl: r.headers.get("cache-control"),
        date: r.headers.get("date"),
        rowCount: rows.length,
        headers: headerRow,
        resolvedColumns: cols,
        lastRows: lastN.map((row) => ({
          timestamp: cols.timestampCol >= 0 ? row[cols.timestampCol] ?? "" : "",
          parentEmail: cols.parentEmailCol >= 0 ? row[cols.parentEmailCol] ?? "" : "",
          childName: cols.childNameCol >= 0 ? row[cols.childNameCol] ?? "" : "",
          parentName: cols.parentNameCol >= 0 ? row[cols.parentNameCol] ?? "" : "",
        })),
        note: "Google's published CSV is cached up to ~5 min. If a recent submission isn't in lastRows, that's the cache; webhook is the cure.",
      });
    } catch (error) {
      console.error("sheet-diagnostic error:", error);
      return res.status(500).json({ ok: false, error: String((error as Error)?.message ?? error) });
    }
  });

  // Normalize Typeform webhook payload to our shape { parentEmail?, childName?, parentName? }
  // Match by question title (same as Google form: "Parent/guardian email:", "Student name:", "Parent/guardian name:")
  function parseTypeformPayload(body: any): FormSubmissionData | null {
    if (body?.event_type !== "form_response" || !body?.form_response) return null;
    const fr = body.form_response;
    const definition = fr?.definition;
    const answers = fr?.answers;
    if (!definition?.fields || !Array.isArray(answers)) return null;

    const fieldIdToTitle = new Map<string, string>();
    for (const f of definition.fields) {
      if (f.id && f.title) fieldIdToTitle.set(f.id, String(f.title).trim());
    }

    let parentEmail: string | undefined;
    let childName: string | undefined;
    let parentName: string | undefined;

    const parentEmailTitles = ["Parent/guardian email:", "Parent/guardian email"];
    const childNameTitles = ["Student name:", "Student name"];
    const parentNameTitles = ["Parent/guardian name:", "Parent/guardian name"];

    for (const a of answers) {
      const fieldId = a?.field?.id;
      const title = fieldId ? fieldIdToTitle.get(fieldId) : "";
      if (!title) continue;

      const match = (list: string[]) => list.some((t) => title === t || title.startsWith(t));
      const text = (a.text ?? a.email ?? (a.choice && a.choice.label) ?? "").trim();
      if (match(parentEmailTitles)) parentEmail = (a.email || a.text || "").trim();
      else if (match(childNameTitles)) childName = text || (a.choice && a.choice.label) || "";
      else if (match(parentNameTitles)) parentName = text || (a.choice && a.choice.label) || "";
    }

    if (!parentEmail) return null;
    return {
      timestamp: Date.now(),
      parentEmail: parentEmail.trim(),
      ...(childName && { childName: childName.trim() }),
      ...(parentName && { parentName: parentName.trim() }),
    };
  }

  // Typeform webhook (same storage as form submission; point Typeform at this URL)
  app.post("/api/typeform-webhook", express.json(), async (req, res) => {
    try {
      const parsed = parseTypeformPayload(req.body);
      if (!parsed) {
        return res.status(400).json({ message: "Invalid Typeform payload or missing parent email" });
      }
      const email = (parsed.parentEmail ?? "").toLowerCase();
      const targetSessionId = email ? sessionIdByEmail.get(email) : null;
      if (targetSessionId) {
        formSubmissions.set(targetSessionId, parsed);
        sessionIdByEmail.delete(email);
        sessionsAwaitingWebhook.delete(targetSessionId);
        console.log(`✅ Typeform submitted for session: ${targetSessionId} (${email})`);
      } else if (email) {
        // Store keyed by exact email; attached to a session only when that same
        // email is registered on the site (identity-safe, never by recency).
        pruneStaleAwaitingSessions();
        pendingByEmail.set(email, parsed);
        console.log(`✅ Typeform submission stored for email (waiting for site): ${email}`);
      }
      res.status(200).send();
    } catch (error) {
      console.error("Error recording Typeform submission:", error);
      res.status(500).json({ message: "Failed to record form submission" });
    }
  });

  // Clean up stale "awaiting webhook" entries. We intentionally do NOT attach a
  // webhook to "the most recent waiting session" anymore — that matched by
  // recency, not identity, and could hand one family's info to another family
  // when two people submitted at the same time. Webhooks are matched only by
  // exact email (sessionIdByEmail) or by sessionId, both of which are identity-safe.
  function pruneStaleAwaitingSessions(): void {
    const cutoff = Date.now() - 120_000; // 2 minute window
    const toDelete: string[] = [];
    sessionsAwaitingWebhook.forEach((ts, sid) => {
      if (ts <= cutoff) toDelete.push(sid);
    });
    toDelete.forEach((sid) => sessionsAwaitingWebhook.delete(sid));
  }

  // Form submission webhook: Google (Apps Script) or Typeform or iframe detection (sessionId only)
  app.post("/api/google-form-submitted", express.json(), async (req, res) => {
    try {
      const body = req.body;

      // Case 1: Iframe detection — client sends { sessionId } with no contact data.
      // Mark this session as "waiting for webhook data" so when the webhook arrives we can match.
      if (body.sessionId && !body.parentEmail && !body.event_type) {
        sessionsAwaitingWebhook.set(body.sessionId, Date.now());
        // Store a bare entry so check-form-status returns submitted=true. We do
        // NOT attach any pending webhook data here — pending entries are keyed by
        // email and only attach when that same email is registered on the site
        // (see /api/register-form-email). Matching by recency leaked other
        // families' contact info, so it has been removed.
        if (!formSubmissions.has(body.sessionId)) {
          formSubmissions.set(body.sessionId, { timestamp: Date.now() });
        }
        return res.json({ success: true, message: "Session registered for webhook matching" });
      }

      // Case 2: Typeform payload
      let data: FormSubmissionData;
      let parentEmailRaw: string | undefined;

      if (body?.event_type === "form_response") {
        const parsed = parseTypeformPayload(body);
        if (!parsed) {
          return res.status(400).json({ message: "Invalid Typeform payload or missing parent email" });
        }
        data = parsed;
        parentEmailRaw = parsed.parentEmail;
      } else {
        // Case 3: Google Apps Script payload { parentEmail, childName, parentName }
        const { parentEmail, childName, parentName } = body;
        parentEmailRaw = parentEmail != null ? String(parentEmail).trim() : undefined;
        data = {
          timestamp: Date.now(),
          ...(parentEmail != null && parentEmail !== "" && { parentEmail: String(parentEmail).trim() }),
          ...(childName != null && childName !== "" && { childName: String(childName).trim() }),
          ...(parentName != null && parentName !== "" && { parentName: String(parentName).trim() }),
        };
      }

      const email = (parentEmailRaw ?? "").toLowerCase();

      // Try to match: by sessionId, by email registration, by waiting session, or store pending
      const targetSessionId = body.sessionId || (email ? sessionIdByEmail.get(email) : null);
      if (targetSessionId) {
        formSubmissions.set(targetSessionId, data);
        if (email) sessionIdByEmail.delete(email);
        sessionsAwaitingWebhook.delete(targetSessionId);
        console.log(`✅ Form submitted for session: ${targetSessionId} (${email})`);
      } else if (email) {
        // Store keyed by exact email; attached to a session only when that same
        // email is registered on the site (identity-safe, never by recency).
        pruneStaleAwaitingSessions();
        pendingByEmail.set(email, data);
        console.log(`✅ Form submission stored for email (waiting for site): ${email}`);
      } else {
        return res.status(400).json({ message: "Provide sessionId or parentEmail so we can match your submission" });
      }

      res.json({ success: true, message: "Form submission recorded" });
    } catch (error) {
      console.error("Error recording form submission:", error);
      res.status(500).json({ message: "Failed to record form submission" });
    }
  });

  // Check if form has been submitted for a session (returns contact info when from webhook)
  app.get("/api/check-form-status/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const data = formSubmissions.get(sessionId);

      // NOTE: we no longer "late-match" a pending webhook to this session by
      // recency — that handed one family's contact info to another. Contact data
      // is only ever attached to a session by an exact email or sessionId match.

      const submitted = !!data;
      res.json({
        submitted,
        timestamp: data?.timestamp ?? null,
        parentEmail: data?.parentEmail ?? null,
        childName: data?.childName ?? null,
        parentName: data?.parentName ?? null,
      });
    } catch (error) {
      console.error("Error checking form status:", error);
      res.status(500).json({ message: "Failed to check form status" });
    }
  });

  // Validate parent/staff referral code (usage cap + discount)
  app.post("/api/validate-referral-code", express.json(), async (req, res) => {
    try {
      const { code } = req.body;
      if (!code || !String(code).trim()) {
        return res.status(400).json({ message: "Code is required" });
      }

      const result = await validateReferralCode(String(code));
      if (!result.valid) {
        const definition = lookupReferralCode(String(code));
        const messages: Record<string, string> = {
          not_found: "Invalid promo/referral code",
          exhausted: definition
            ? `This referral code has already been used ${definition.maxUses} times.`
            : "This referral code has reached its usage limit.",
          no_database: "Referral codes are unavailable right now. Please try again later.",
        };
        return res.json({
          valid: false,
          reason: result.reason,
          message: messages[result.reason] ?? "Invalid code",
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ message: "Failed to validate referral code" });
    }
  });

  // Create checkout session for guest checkout
  app.post("/api/create-checkout-session", express.json(), async (req, res) => {
    try {
      if (!stripe) {
        return res.status(501).json({
          message:
            "Payments are disabled because STRIPE_SECRET_KEY is not set on the server.",
        });
      }

      const {
        cartItems,
        promoCode,
        parentEmail,
        childName,
        parentName,
        locationName,
        referralName,
        referralCode,
      } = req.body;
      
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ message: "Cart items are required" });
      }

      if (!parentEmail || !childName) {
        return res.status(400).json({ message: "Email and child name are required" });
      }

      const normalizedReferral = referralName
        ? normalizeReferralName(String(referralName))
        : null;
      if (referralName && String(referralName).trim() && !normalizedReferral) {
        return res.status(400).json({ message: "Invalid referral name" });
      }

      let referralValidation: Awaited<ReturnType<typeof validateReferralCode>> | null = null;
      if (referralCode && String(referralCode).trim()) {
        referralValidation = await validateReferralCode(String(referralCode));
        if (!referralValidation.valid) {
          const definition = lookupReferralCode(String(referralCode));
          const message =
            referralValidation.reason === "exhausted"
              ? definition
                ? `This referral code has already been used ${definition.maxUses} times.`
                : "This referral code has reached its usage limit."
              : "Invalid referral code";
          return res.status(400).json({ message });
        }
      }

      let pricedItems = cartItems.map((item: any) => ({ ...item }));

      if (referralValidation?.valid && referralValidation.discountCents > 0) {
        // Discount codes only apply to the final (full) payment, never deposits.
        const hasFullPayment = pricedItems.some(
          (item: any) => (item.paymentType ?? "full") !== "deposit",
        );
        if (!hasFullPayment) {
          return res.status(400).json({
            message:
              "This code only applies to the final (full) payment, not deposits.",
          });
        }

        const basePrices: number[] = [];
        const paymentTypes: Array<string | undefined> = [];
        for (const item of pricedItems) {
          const week = item.weekId ? await storage.getWeek(item.weekId) : undefined;
          basePrices.push(
            getItemBasePriceDollars(item, week?.priceCents ?? 50000),
          );
          paymentTypes.push(item.paymentType);
        }
        const discountDollars = referralValidation.discountCents / 100;
        const discountedPrices = applyOrderDiscount(
          basePrices,
          discountDollars,
          paymentTypes,
        );
        pricedItems = pricedItems.map((item: any, index: number) => ({
          ...item,
          price: discountedPrices[index],
        }));
      }

      const appliedCode = referralValidation?.valid
        ? referralValidation.displayCode
        : promoCode?.trim()
          ? String(promoCode).trim().toUpperCase()
          : normalizedReferral || '';

      const codeType = referralValidation?.valid
        ? referralValidation.type
        : normalizedReferral
          ? "teacher_name"
          : promoCode?.trim()
            ? "promo"
            : "";

      const discountCents = referralValidation?.valid
        ? String(referralValidation.discountCents)
        : "";

      // Get the host for redirect URLs
      const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
      const host = `${protocol}://${req.get('host')}`;

      const lineItems = pricedItems.map((item: any, index: number) => {
        const amount = Math.round(item.price * 100);
        const itemLocation = item.location || locationName || 'Unknown Location';
        const weekLabel = item.weekLabel || item.label || 'Week';
        const paymentTypeLabel = item.paymentType === 'deposit' ? '(Deposit)' : '(Full Payment)';
        const codeSuffix = appliedCode && index === 0 ? ` — CODE: ${appliedCode}` : '';
        const baseName = `${childName} - ${itemLocation} - ${weekLabel} ${paymentTypeLabel}`;
        const baseDescription = `${childName} - ${itemLocation} - ${weekLabel} ${item.paymentType === 'deposit' ? '$150 deposit payment' : 'Full payment'}`;

        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${baseName}${codeSuffix}`,
              description: `${baseDescription}${codeSuffix}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        };
      });

      const cartTotal = pricedItems.reduce((total: number, item: any) => {
        return total + item.price;
      }, 0);
      const processingFee = Math.round(cartTotal * 0.036 * 100);

      if (processingFee > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Processing Fee (3.6%)',
              description: 'To avoid this fee, pay via Zelle or check - email theacappellaworkshop@gmail.com',
            },
            unit_amount: processingFee,
          },
          quantity: 1,
        });
      }

      let cancelUrl = `${host}/camp-registration`;
      if (locationName?.toLowerCase().includes('newton')) {
        cancelUrl = `${host}/newton/register`;
      } else if (locationName?.toLowerCase().includes('wayland')) {
        cancelUrl = `${host}/wayland/register`;
      }

      const registrationPromoCode = referralValidation?.valid
        ? referralValidation.code
        : promoCode || normalizedReferral || '';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${host}/success?session_id={CHECKOUT_SESSION_ID}&ok=1`,
        cancel_url: cancelUrl,
        customer_email: parentEmail,
        custom_fields: [
          {
            key: 'child_name',
            label: { type: 'custom', custom: 'Child name' },
            type: 'text',
            optional: true,
            text: { default_value: childName },
          },
        ],
        metadata: {
          parentEmail,
          childName,
          parentName: parentName || '',
          locationName: locationName || '',
          items_json: JSON.stringify(pricedItems.map((item: any) => ({
            week_id: item.weekId,
            week_label: item.weekLabel || item.label || 'Week',
            student_name: childName,
            payment_type: item.paymentType || 'full',
          }))),
          promoCode: registrationPromoCode,
          referralName: normalizedReferral || '',
          appliedCode,
          codeType,
          discountCents,
          referrerLabel: referralValidation?.valid ? (referralValidation.label ?? '') : '',
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Payment status check (for polling after checkout)
  app.get("/api/payment-status/:sessionId", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(501).json({ message: "Payments are disabled" });
      }
      const sessionId = req.params.sessionId;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      res.json({
        status: session.payment_status,
        sessionStatus: session.status,
        paymentIntent: session.payment_intent,
      });
    } catch (error: any) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ message: error?.message || "Error checking payment status" });
    }
  });

  // --- Email verification for the balance page ---------------------------
  // A parent must prove they control the email before any balance / child info
  // is shown: enter email -> we email a 6-digit code -> verify -> receive a
  // short-lived token that authorizes viewing the balance and starting checkout.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const CODE_TTL_MS = 10 * 60 * 1000; // 10 min
  const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min
  const MAX_CODE_ATTEMPTS = 5;
  const balanceCodes = new Map<string, { code: string; expiresAt: number; attempts: number; lastSentAt: number }>();
  const balanceTokens = new Map<string, { email: string; expiresAt: number }>();

  const emailFromValidToken = (token: unknown): string | null => {
    if (typeof token !== "string" || !token) return null;
    const entry = balanceTokens.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      balanceTokens.delete(token);
      return null;
    }
    return entry.email;
  };

  // Step 1: request a verification code. Only emails with an actual record get a
  // code emailed (so we don't blast codes to arbitrary addresses).
  app.post("/api/balance/send-code", express.json(), async (req, res) => {
    try {
      if (!stripe) {
        return res.status(501).json({ message: "Balance lookup is unavailable (Stripe not configured)." });
      }
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      // Light resend throttle.
      const existing = balanceCodes.get(email);
      if (existing && Date.now() - existing.lastSentAt < 20_000) {
        return res.json({ sent: true, throttled: true });
      }

      // Always send a code to any valid email. Whether the email actually has a
      // registration is checked AFTER the code is verified (in verify-code), so
      // we never reveal registration status to someone who can't read the inbox.
      const code = String(Math.floor(100000 + Math.random() * 900000));
      balanceCodes.set(email, {
        code,
        expiresAt: Date.now() + CODE_TTL_MS,
        attempts: 0,
        lastSentAt: Date.now(),
      });
      const sent = await sendBalanceVerificationCode(email, code);
      if (!sent) {
        return res.status(502).json({
          found: true,
          sent: false,
          message: "We couldn't send the verification email. Please contact theacappellaworkshop@gmail.com.",
        });
      }
      res.json({ found: true, sent: true });
    } catch (error) {
      console.error("Error sending balance code:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Step 2: verify the code. On success, returns the FULL balance summary
  // (including the child's full name — safe now that the caller proved they
  // control the email) and a short-lived token used to authorize checkout.
  app.post("/api/balance/verify-code", express.json(), async (req, res) => {
    try {
      if (!stripe) {
        return res.status(501).json({ message: "Balance lookup is unavailable (Stripe not configured)." });
      }
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
      if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ message: "Enter the 6-digit code from your email." });
      }

      const entry = balanceCodes.get(email);
      if (!entry || Date.now() > entry.expiresAt) {
        balanceCodes.delete(email);
        return res.status(400).json({ message: "That code has expired. Request a new one." });
      }
      if (entry.attempts >= MAX_CODE_ATTEMPTS) {
        balanceCodes.delete(email);
        return res.status(429).json({ message: "Too many attempts. Request a new code." });
      }
      if (entry.code !== code) {
        entry.attempts += 1;
        return res.status(400).json({ message: "Incorrect code. Please try again." });
      }

      balanceCodes.delete(email);

      const result = await computeOutstandingForEmail(stripe, email);
      // Double-check an actual registration still exists before revealing a card.
      const hasRegistration =
        result.studentName.trim() !== "" ||
        result.items.length > 0 ||
        result.history.length > 0;
      if (!hasRegistration) {
        return res.json({ found: false });
      }

      const token = randomUUID();
      balanceTokens.set(token, { email, expiresAt: Date.now() + TOKEN_TTL_MS });
      // Full studentName — the emailed-code step proved they own this email.
      res.json({ token, summary: result });
    } catch (error) {
      console.error("Error verifying balance code:", error);
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  // Admin bypass: look up any email's balance without the code step. Gated by a
  // secret ADMIN_BALANCE_KEY (set in the environment); the admin link is
  // /pay-balance?admin=<ADMIN_BALANCE_KEY>. Also issues a token so the admin can
  // start a checkout if needed.
  app.get("/api/balance/admin-summary", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(501).json({ message: "Balance lookup is unavailable (Stripe not configured)." });
      }
      const adminKey = process.env.ADMIN_BALANCE_KEY;
      const key = typeof req.query.key === "string" ? req.query.key : "";
      if (!adminKey || key !== adminKey) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email" });
      }
      const result = await computeOutstandingForEmail(stripe, email);
      const token = randomUUID();
      balanceTokens.set(token, { email, expiresAt: Date.now() + TOKEN_TTL_MS });
      res.json({ token, summary: result });
    } catch (error) {
      console.error("Error in admin balance summary:", error);
      res.status(500).json({ message: "Failed to look up balance" });
    }
  });

  // Outstanding deposit balances for a parent email (used by /pay-balance page).
  // Requires a valid verification token (see /api/balance/verify-code) so child
  // info and amounts are never exposed to an unverified caller.
  app.get("/api/balance-summary", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(501).json({
          message: "Balance lookup is unavailable because STRIPE_SECRET_KEY is not set.",
        });
      }
      const tokenEmail = emailFromValidToken(req.query.token);
      if (!tokenEmail) {
        return res.status(401).json({ message: "Verification required" });
      }

      const result = await computeOutstandingForEmail(stripe, tokenEmail);
      // Full child name is fine here: a valid token means the caller already
      // proved (via the emailed code) that they control this email.
      res.json(result);
    } catch (error) {
      console.error("Error fetching balance summary:", error);
      res.status(500).json({ message: "Failed to look up balance" });
    }
  });

  // Create Stripe Checkout for remaining deposit balance(s).
  app.post("/api/balance-checkout", express.json(), async (req, res) => {
    try {
      if (!stripe) {
        return res.status(501).json({
          message: "Payments are disabled because STRIPE_SECRET_KEY is not set on the server.",
        });
      }

      const { token, weekIds, registrationIds } = req.body as {
        token?: string;
        weekIds?: string[];
        registrationIds?: string[]; // legacy field; treated as weekIds
      };

      // The email comes from the verification token, not the client — a caller
      // can only pay for the email they actually verified.
      const email = emailFromValidToken(token);
      if (!email) {
        return res.status(401).json({ message: "Verification required. Please look up your balance again." });
      }

      // Recompute authoritatively from Stripe + the tracker sheet — never trust
      // client-supplied amounts.
      const summary = await computeOutstandingForEmail(stripe, email);
      let toPay = summary.items;

      const requestedWeeks = weekIds ?? registrationIds;
      if (Array.isArray(requestedWeeks) && requestedWeeks.length > 0) {
        const weekSet = new Set(requestedWeeks);
        toPay = toPay.filter((i) => weekSet.has(i.weekId));
      }

      if (toPay.length === 0) {
        return res.status(404).json({
          message:
            "No outstanding balance found for this email. If you already paid in full, you're all set!",
        });
      }

      const childName = summary.studentName || "Student";
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
      const balanceItems: Array<{
        registration_id: string;
        week_id: string;
        child_name: string;
        balance_cents: number;
      }> = [];

      for (const item of toPay) {
        const balance = item.balanceDueCents;
        if (balance <= 0) continue;

        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: `${childName} — ${item.locationName} — ${item.weekLabel} (Final Payment)`,
              description: `Remaining balance after $${(item.depositPaidCents / 100).toFixed(2)} deposit`,
            },
            unit_amount: balance,
          },
          quantity: 1,
        });

        balanceItems.push({
          registration_id: "",
          week_id: item.weekId,
          child_name: childName,
          balance_cents: balance,
        });
      }

      if (lineItems.length === 0) {
        return res.status(404).json({ message: "No outstanding balance to pay" });
      }

      const subtotalCents = balanceItems.reduce((sum, item) => sum + item.balance_cents, 0);
      const processingFee = Math.round(subtotalCents * 0.036);

      if (processingFee > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Processing Fee (3.6%)",
              description: "To avoid this fee, pay via Zelle or check — email theacappellaworkshop@gmail.com",
            },
            unit_amount: processingFee,
          },
          quantity: 1,
        });
      }

      const protocol = req.get("x-forwarded-proto") || (req.secure ? "https" : "http");
      const host = `${protocol}://${req.get("host")}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${host}/pay-balance?paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${host}/pay-balance?cancelled=1`,
        customer_email: email,
        metadata: {
          paymentType: "balance",
          parentEmail: email,
          balance_items_json: JSON.stringify(balanceItems),
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating balance checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Record a visit
  app.post("/api/visits", express.json(), async (req, res) => {
    try {
      const { path, visitorId } = req.body;
      
      if (!path) {
        return res.status(400).json({ message: "Path is required" });
      }

      if (!visitorId) {
        return res.status(400).json({ message: "Visitor ID is required" });
      }

      await storage.recordVisit(path, visitorId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording visit:", error);
      res.status(500).json({ message: "Failed to record visit" });
    }
  });

  // Get visitor statistics
  app.get("/api/visits/stats", async (req, res) => {
    try {
      const totalUniqueVisitors = await storage.getTotalUniqueVisitors();
      const visitsToday = await storage.getUniqueVisitsToday();
      
      res.json({
        totalVisits: totalUniqueVisitors, // Total unique visitors (all time)
        visitsToday, // Total unique visitors today
      });
    } catch (error) {
      console.error("Error fetching visit stats:", error);
      res.status(500).json({ message: "Failed to fetch visit statistics" });
    }
  });

  // Reset visitor statistics (admin/dev only - be careful!)
  app.post("/api/visits/reset", express.json(), async (req, res) => {
    try {
      // Simple protection - you can add proper auth later
      const { confirm } = req.body;
      if (confirm !== 'RESET_ALL_VISITS') {
        return res.status(400).json({ message: "Confirmation required" });
      }

      if (db) {
        // Delete all visits from database
        await db.delete(visits);
        res.json({ success: true, message: "All visitor data reset" });
      } else {
        // Clear in-memory storage
        const memoryStorage = storage as any;
        if (memoryStorage._visits) {
          memoryStorage._visits = [];
        }
        res.json({ success: true, message: "All visitor data reset (in-memory)" });
      }
    } catch (error) {
      console.error("Error resetting visit stats:", error);
      res.status(500).json({ message: "Failed to reset visit statistics" });
    }
  });

  return createServer(app);
}
