/** Shared Google Sheets CSV parsing for registration (used by routes + verify script). */

export function normalizeSheetHeader(h: string): string {
  return String(h)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[：]/g, ":"); // full-width colon
}

/** Map spreadsheet column headers to indices; supports Newton/Wayland/Lexington naming variants. */
export function resolveSheetColumns(headerRow: string[]) {
  const headers = headerRow.map((c) => String(c).trim());
  const norm = headers.map(normalizeSheetHeader);

  const findExact = (...names: string[]) => {
    for (const name of names) {
      const want = normalizeSheetHeader(name);
      const i = norm.findIndex((h) => h === want);
      if (i >= 0) return i;
    }
    return -1;
  };

  // Timestamp column (Google Forms default is "Timestamp")
  let timestampCol = findExact("Timestamp", "timestamp");
  if (timestampCol < 0) {
    timestampCol = norm.findIndex((h) => h === "timestamp" || h.includes("submitted"));
  }

  let parentEmailCol = findExact(
    "Parent/guardian email:",
    "Parent/guardian email",
    "Parent Email",
    "Parent email",
  );
  if (parentEmailCol < 0) {
    parentEmailCol = norm.findIndex(
      (h) =>
        h.includes("parent") &&
        h.includes("guardian") &&
        h.includes("email") &&
        !h.includes("student"),
    );
  }

  let childNameCol = findExact("Student name:", "Student name");
  if (childNameCol < 0) {
    childNameCol = norm.findIndex(
      (h) =>
        h.includes("student") &&
        h.includes("name") &&
        !h.includes("school") &&
        !h.includes("email") &&
        !h.includes("grade"),
    );
  }

  let parentNameCol = findExact("Parent/guardian name:", "Parent/guardian name");
  if (parentNameCol < 0) {
    parentNameCol = norm.findIndex(
      (h) =>
        h.includes("parent") &&
        h.includes("guardian") &&
        h.includes("name") &&
        !h.includes("email"),
    );
  }

  let sessionIdCol = findExact(
    "Registration session ID",
    "Registration Session ID",
    "Session ID",
    "Browser session ID",
  );
  if (sessionIdCol < 0) {
    sessionIdCol = norm.findIndex(
      (h) =>
        (h.includes("registration") && h.includes("session")) ||
        h === "session id" ||
        h.includes("browser session"),
    );
  }

  return { parentEmailCol, childNameCol, parentNameCol, sessionIdCol, timestampCol };
}

/** Parse Google Sheets timestamp like "4/24/2026 19:05:30" or "2026-04-24T19:05:30" */
function parseSheetTimestamp(ts: string): Date | null {
  if (!ts?.trim()) return null;
  const s = ts.trim();
  // Try ISO format first
  const isoDate = new Date(s);
  if (!isNaN(isoDate.getTime())) return isoDate;
  // Try US format: M/D/YYYY H:M:S
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):?(\d{2})?$/);
  if (match) {
    const [, month, day, year, hour, min, sec] = match;
    return new Date(+year, +month - 1, +day, +hour, +min, +(sec || 0));
  }
  return null;
}

/**
 * Pick the correct response row from the sheet.
 * Priority:
 * 1. Match by session ID (if form has that field)
 * 2. Match by parent email (if user pre-entered it)
 * 3. Fall back to last row ONLY if it was submitted within the last 60 seconds
 * 
 * This prevents showing the wrong family's data when multiple people register.
 */
export function pickResponseRow(
  rows: string[][],
  sessionId: string | undefined,
  sessionIdCol: number,
  registeredParentEmail: string | undefined,
  parentEmailCol: number,
  timestampCol: number = -1,
  maxAgeSec: number = 60,
): string[] | null {
  if (rows.length < 2) return null;
  
  // Priority 1: Match by session ID
  if (sessionIdCol >= 0 && sessionId?.trim()) {
    const sid = sessionId.trim();
    for (let r = rows.length - 1; r >= 1; r--) {
      const cell = (rows[r][sessionIdCol] ?? "").trim();
      if (cell === sid) return rows[r];
    }
  }
  
  // Priority 2: Match by parent email
  if (parentEmailCol >= 0 && registeredParentEmail?.trim()) {
    const want = registeredParentEmail.trim().toLowerCase();
    for (let r = rows.length - 1; r >= 1; r--) {
      const cell = (rows[r][parentEmailCol] ?? "").trim().toLowerCase();
      if (cell === want) return rows[r];
    }
    // Email was provided but not found - don't fall back to wrong row
    return null;
  }
  
  // Priority 3: Fall back to last row ONLY if recent (within maxAgeSec)
  const lastRow = rows[rows.length - 1];
  if (timestampCol >= 0 && lastRow) {
    const ts = parseSheetTimestamp(lastRow[timestampCol] ?? "");
    if (ts) {
      const ageMs = Date.now() - ts.getTime();
      if (ageMs <= maxAgeSec * 1000) {
        return lastRow;
      }
      // Row is too old - don't return wrong data
      return null;
    }
  }
  
  // No timestamp column or couldn't parse - don't risk returning wrong data
  return null;
}
