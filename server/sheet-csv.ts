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
 * Pick the correct response row from the sheet — by IDENTITY ONLY.
 *
 * We only return a row when we can confidently tie it to *this* user:
 *   1. exact session-id match (form has the hidden session-id field prefilled), or
 *   2. exact parent-email match (the user entered their email on the site).
 *
 * If neither matches we return null and the caller drops the user into manual
 * entry. We deliberately do NOT fall back to "the most recent row": that leaked
 * other families' email/student name whenever submissions overlapped (Family B
 * submits while Family A is at checkout → Family A saw Family B's info).
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
  }

  // No confident identity match — do not guess. Caller falls back to manual entry.
  return null;
}
