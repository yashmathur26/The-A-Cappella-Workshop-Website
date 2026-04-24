# Google Sheet — contact info for registration

The registration page can fill in contact info (parent email, student name, parent name) from your **Google Sheet** that’s linked to the form. No webhook or Apps Script required.

## 1. Publish the sheet as CSV

1. Open the Google Sheet that receives form responses.
2. **File → Share → Publish to web**.
3. Under **Link**, choose the correct sheet tab (the one with form responses).
4. Under **Format**, choose **Comma-separated values (.csv)**.
5. Click **Publish** and copy the URL (e.g. `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv&gid=914273778`).

## 2. Set the URL on the server

Set environment variables where the app runs (e.g. Railway, Replit, or local `.env`).

**One sheet for everything (simplest):** use the legacy variable — it applies to every location if you do not set overrides:

```bash
GOOGLE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv&gid=914273778
```

**Separate forms per camp (recommended):** Each location has its own Google Form → its own response spreadsheet. Set the published CSV URL for each so registration pulls the **correct** sheet after submit:

```bash
# Optional overrides (if unset, falls back to GOOGLE_SHEET_CSV_URL)
GOOGLE_SHEET_CSV_URL_LEXINGTON=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv&gid=...
GOOGLE_SHEET_CSV_URL_NEWTON=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv&gid=...
GOOGLE_SHEET_CSV_URL_WAYLAND=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv&gid=...
# Legacy: if only one CSV exists for both Newton + Wayland, you can still use:
# GOOGLE_SHEET_CSV_URL_NEWTON_WAYLAND=...
```

Use the **exact** URL from “Publish to web” for each spreadsheet that receives responses for that camp.

## 3. Sheet columns

The server looks for these column headers (order doesn’t matter):

- **Parent/guardian email:** (or `Parent/guardian email`) — required
- **Student name:** (or `Student name`)
- **Parent/guardian name:** (or `Parent/guardian name`)

These match the Lexington form. When the user submits the form, the site fetches the **last row** of the published CSV and uses it to fill the cart.

## If something doesn’t work

- **503 Form sheet not configured** — No CSV URL is set for that location (set `GOOGLE_SHEET_CSV_URL` and/or the per-location vars above).
- **502 Could not load form responses** — The published URL is wrong, or the sheet isn’t published. Re-publish and update the env var.
- **404 No form responses** — The sheet has no data rows (only a header). Submit a test response first.
- If contact info still doesn’t load, the user can use **“Or enter details manually”** and type their info in the cart.
