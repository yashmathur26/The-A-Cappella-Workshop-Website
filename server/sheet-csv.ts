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

/**
 * Pick the correct response row from the sheet.
 *
 * Behavior matches the original "it just works for Lexington" implementation:
 * scan backwards to find the most recent row that has a non-empty parent email.
 * This handles sheets with empty/incomplete trailing rows.
 *
 * If a `registeredParentEmail` is provided AND we find that exact email, we
 * prefer that row. If it's provided but not found, we still fall back to the
 * most recent valid row (matches the pre-2026-04 behavior).
 *
 * If a `sessionIdCol` is found and we have an exact session-id match, we use
 * that — most reliable when the form has the hidden session-id field prefilled.
 */
export function pickResponseRow(
  rows: string[][],
  sessionId: string | undefined,
  sessionIdCol: number,
  registeredParentEmail: string | undefined,
  parentEmailCol: number,
  // Kept for backwards-compat with callers; no longer used (timestamp filter
  // caused false-negatives once Google's CSV cache started lagging).
  _timestampCol: number = -1,
  _maxAgeSec: number = 600,
): string[] | null {
  if (rows.length < 2) return null;

  // Best: exact session-id match (only works if the form has the hidden field).
  if (sessionIdCol >= 0 && sessionId?.trim()) {
    const sid = sessionId.trim();
    for (let r = rows.length - 1; r >= 1; r--) {
      const cell = (rows[r][sessionIdCol] ?? "").trim();
      if (cell === sid) return rows[r];
    }
  }

  // Next best: exact email match if the user entered an email on the site.
  if (parentEmailCol >= 0 && registeredParentEmail?.trim()) {
    const want = registeredParentEmail.trim().toLowerCase();
    for (let r = rows.length - 1; r >= 1; r--) {
      const cell = (rows[r][parentEmailCol] ?? "").trim().toLowerCase();
      if (cell === want) return rows[r];
    }
    // Email not found — fall through to "most recent row" (this is the
    // pre-2026-04 behavior the user is reverting to).
  }

  // Fallback: most recent row that has a non-empty parent email cell.
  // Scanning backwards skips manually-added incomplete trailing rows.
  if (parentEmailCol >= 0) {
    for (let r = rows.length - 1; r >= 1; r--) {
      const cell = (rows[r][parentEmailCol] ?? "").trim();
      if (cell) return rows[r];
    }
  }

  return null;
}
