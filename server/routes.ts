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
import { sendRegistrationConfirmationEmail } from "./brevo";
import { insertRegistrationSchema, type Week, visits } from "@shared/schema";
import { normalizeReferralName } from "@shared/referrals";
import {
  validateReferralCode,
  applyOrderDiscount,
  getItemBasePriceDollars,
} from "./referral-codes";
import { pool, db } from "./db";
import { pickResponseRow, resolveSheetColumns } from "./sheet-csv";

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
      } else if (matchWebhookToWaitingSession(parsed)) {
        // Matched to a waiting session
      } else if (email) {
        pendingByEmail.set(email, parsed);
        console.log(`✅ Typeform submission stored for email (waiting for site): ${email}`);
      }
      res.status(200).send();
    } catch (error) {
      console.error("Error recording Typeform submission:", error);
      res.status(500).json({ message: "Failed to record form submission" });
    }
  });

  // Helper: attach webhook data to a pending session (if any session is waiting)
  function matchWebhookToWaitingSession(data: FormSubmissionData): boolean {
    // Find the most recent session that's awaiting webhook data (within last 2 minutes)
    let bestSession: string | null = null;
    let bestTime = 0;
    const cutoff = Date.now() - 120_000; // 2 minute window
    const toDelete: string[] = [];
    sessionsAwaitingWebhook.forEach((ts, sid) => {
      if (ts > cutoff && ts > bestTime) {
        bestSession = sid;
        bestTime = ts;
      }
      if (ts <= cutoff) toDelete.push(sid);
    });
    // Clean up old entries
    toDelete.forEach((sid) => sessionsAwaitingWebhook.delete(sid));
    if (bestSession) {
      formSubmissions.set(bestSession, data);
      sessionsAwaitingWebhook.delete(bestSession);
      console.log(`✅ Matched webhook to waiting session: ${bestSession} (${data.parentEmail})`);
      return true;
    }
    return false;
  }

  // Form submission webhook: Google (Apps Script) or Typeform or iframe detection (sessionId only)
  app.post("/api/google-form-submitted", express.json(), async (req, res) => {
    try {
      const body = req.body;

      // Case 1: Iframe detection — client sends { sessionId } with no contact data.
      // Mark this session as "waiting for webhook data" so when the webhook arrives we can match.
      if (body.sessionId && !body.parentEmail && !body.event_type) {
        sessionsAwaitingWebhook.set(body.sessionId, Date.now());
        // Also store a bare entry so check-form-status returns submitted=true
        if (!formSubmissions.has(body.sessionId)) {
          formSubmissions.set(body.sessionId, { timestamp: Date.now() });
        }
        // Check if there's already pending webhook data we can attach
        // (webhook might have arrived before the iframe detection)
        let matchedEmail: string | null = null;
        pendingByEmail.forEach((pending, email) => {
          if (!matchedEmail && Date.now() - pending.timestamp < 120_000) {
            formSubmissions.set(body.sessionId, pending);
            sessionsAwaitingWebhook.delete(body.sessionId);
            matchedEmail = email;
            console.log(`✅ Matched existing pending webhook to session: ${body.sessionId} (${email})`);
          }
        });
        if (matchedEmail) pendingByEmail.delete(matchedEmail);
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
      } else if (matchWebhookToWaitingSession(data)) {
        // Matched to a session that was waiting (iframe detected submission recently)
      } else if (email) {
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
      let data = formSubmissions.get(sessionId);

      // If session exists but has no contact data, try to match a pending webhook entry
      if (data && !data.parentEmail && sessionsAwaitingWebhook.has(sessionId)) {
        let matchedEmail: string | null = null;
        pendingByEmail.forEach((pending, email) => {
          if (!matchedEmail && Date.now() - pending.timestamp < 120_000) {
            formSubmissions.set(sessionId, pending);
            sessionsAwaitingWebhook.delete(sessionId);
            data = pending;
            matchedEmail = email;
            console.log(`✅ Late-matched pending webhook to session: ${sessionId} (${email})`);
          }
        });
        if (matchedEmail) pendingByEmail.delete(matchedEmail);
      }

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
        const messages: Record<string, string> = {
          not_found: "Invalid promo/referral code",
          exhausted: "This referral code has already been used 3 times.",
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
          const message =
            referralValidation.reason === "exhausted"
              ? "This referral code has already been used 3 times."
              : "Invalid referral code";
          return res.status(400).json({ message });
        }
      }

      let pricedItems = cartItems.map((item: any) => ({ ...item }));

      if (referralValidation?.valid && referralValidation.discountCents > 0) {
        const basePrices: number[] = [];
        for (const item of pricedItems) {
          const week = item.weekId ? await storage.getWeek(item.weekId) : undefined;
          basePrices.push(
            getItemBasePriceDollars(item, week?.priceCents ?? 50000),
          );
        }
        const discountDollars = referralValidation.discountCents / 100;
        const discountedPrices = applyOrderDiscount(basePrices, discountDollars);
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
