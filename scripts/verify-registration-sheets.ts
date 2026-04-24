/**
 * Fetches published CSVs and validates column detection + row picking.
 * Run: npx tsx scripts/verify-registration-sheets.ts
 * Optional env:
 *   GOOGLE_SHEET_CSV_URL_NEWTON, GOOGLE_SHEET_CSV_URL_WAYLAND (defaults to known publish URLs)
 *   VERIFY_SHEET_TEST_EMAIL — if set, Newton sheet must contain a row with this parent/guardian email
 */
import { parse } from "csv-parse/sync";
import { pickResponseRow, resolveSheetColumns } from "../server/sheet-csv.ts";

const DEFAULT_NEWTON =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQFOEXBYhsbWN7bpiQmUiQ2SYhekEEHQGWBGSPjen4_8ZVXLc91isoY6eLpevoNAtxQBafyJCuxtJTl/pub?output=csv";
const DEFAULT_WAYLAND =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTyyEc4hxyYBjKgD3dtumUEIEGzWUTBIy6XEymJm4m5s5smDxP0FgrP0xn5g-zRM8vPlifxbJVCeIDI/pub?output=csv";

async function loadRows(url: string): Promise<string[][]> {
  const res = await fetch(url, { headers: { "User-Agent": "A-Cappella-Workshop/verify" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  let text = await res.text();
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return parse(text, { skip_empty_lines: true, relax_column_count: true, trim: true }) as string[][];
}

function verifySheet(name: string, url: string, testEmail?: string) {
  console.log(`\n--- ${name} ---`);
  return loadRows(url).then((rows) => {
    if (rows.length < 1) throw new Error("Empty CSV");
    const headerRow = rows[0].map((c) => String(c).trim());
    const cols = resolveSheetColumns(headerRow);
    if (cols.parentEmailCol < 0) {
      throw new Error(`Missing parent email column. Headers: ${headerRow.join(" | ")}`);
    }
    console.log(`OK: parent email col ${cols.parentEmailCol}, child name col ${cols.childNameCol}, timestamp col ${cols.timestampCol}`);

    if (rows.length < 2) {
      console.log("Note: no data rows yet (header only). Row picking will work after first submission.");
      return;
    }

    // Test email-based matching (this should always work if test email exists)
    if (testEmail) {
      const byEmail = pickResponseRow(
        rows,
        undefined,
        cols.sessionIdCol,
        testEmail,
        cols.parentEmailCol,
        cols.timestampCol,
        999999999, // Allow any age for email match test
      );
      if (!byEmail) throw new Error(`No row for test email ${testEmail}`);
      const child = cols.childNameCol >= 0 ? (byEmail[cols.childNameCol] ?? "").trim() : "";
      console.log(`OK: email match row — student: ${child || "(n/a)"}`);
    }

    // Show last row info for debugging
    const lastRow = rows[rows.length - 1];
    const lastTs = cols.timestampCol >= 0 ? (lastRow[cols.timestampCol] ?? "") : "(no timestamp col)";
    const lastEmail = (lastRow[cols.parentEmailCol] ?? "").trim();
    console.log(`Info: last row timestamp: ${lastTs}, email: ${lastEmail.slice(0, 30)}${lastEmail.length > 30 ? "…" : ""}`);
  });
}

async function main() {
  const newtonUrl = process.env.GOOGLE_SHEET_CSV_URL_NEWTON?.trim() || DEFAULT_NEWTON;
  const waylandUrl = process.env.GOOGLE_SHEET_CSV_URL_WAYLAND?.trim() || DEFAULT_WAYLAND;
  const optionalEmailTest = process.env.VERIFY_SHEET_TEST_EMAIL?.trim();

  await verifySheet("Newton", newtonUrl, optionalEmailTest);
  await verifySheet("Wayland", waylandUrl);

  console.log("\nAll checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
