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
    console.log(`OK: parent email column index ${cols.parentEmailCol}, child name ${cols.childNameCol}`);

    if (rows.length < 2) {
      console.log("Note: no data rows yet (header only). Row picking will work after first submission.");
      return;
    }

    const last = pickResponseRow(rows, undefined, cols.sessionIdCol, undefined, cols.parentEmailCol);
    if (!last) throw new Error("pickResponseRow returned null with fallback");
    const pe = (last[cols.parentEmailCol] ?? "").trim();
    console.log(`OK: last-row parent email sample: ${pe.slice(0, 40)}${pe.length > 40 ? "…" : ""}`);

    if (testEmail) {
      const byEmail = pickResponseRow(
        rows,
        undefined,
        cols.sessionIdCol,
        testEmail,
        cols.parentEmailCol,
      );
      if (!byEmail) throw new Error(`No row for test email ${testEmail}`);
      const child = cols.childNameCol >= 0 ? (byEmail[cols.childNameCol] ?? "").trim() : "";
      console.log(`OK: email match row — student: ${child || "(n/a)"}`);
    }
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
