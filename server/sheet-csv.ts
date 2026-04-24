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

  return { parentEmailCol, childNameCol, parentNameCol, sessionIdCol };
}

export function pickResponseRow(
  rows: string[][],
  sessionId: string | undefined,
  sessionIdCol: number,
  registeredParentEmail: string | undefined,
  parentEmailCol: number,
): string[] | null {
  if (rows.length < 2) return null;
  if (sessionIdCol >= 0 && sessionId?.trim()) {
    const sid = sessionId.trim();
    for (let r = rows.length - 1; r >= 1; r--) {
      const cell = (rows[r][sessionIdCol] ?? "").trim();
      if (cell === sid) return rows[r];
    }
  }
  if (parentEmailCol >= 0 && registeredParentEmail?.trim()) {
    const want = registeredParentEmail.trim().toLowerCase();
    for (let r = rows.length - 1; r >= 1; r--) {
      const cell = (rows[r][parentEmailCol] ?? "").trim().toLowerCase();
      if (cell === want) return rows[r];
    }
    return null;
  }
  return rows[rows.length - 1];
}
