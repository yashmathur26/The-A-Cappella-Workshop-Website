# Google Form auto-fill — how it actually works

The site fills the cart with parent/student info from your Google Form **after the parent submits it**. There are two paths the data can take, and they have very different reliability:

| Path | When data arrives | Reliable? |
| --- | --- | --- |
| **A. Apps Script webhook** | Instantly on submit | ✅ Yes — recommended |
| **B. Published CSV fetch** | Up to **5 minutes later** (Google caches it) | ⚠️ Best-effort fallback only |

> **Important:** The "Publish to web → CSV" URL is cached by Google for **up to 5 minutes** (`cache-control: private, max-age=300`). New form submissions don't appear in the CSV until that cache expires. **Do not rely on the CSV alone.** Set up the Apps Script webhook on each form.

---

## Recommended setup (Apps Script webhook)

**Do this once for each form** (Lexington, Newton, Wayland):

1. Open the Google Form → **Extensions → Apps Script**.
2. Replace the contents with `docs/google-form-webhook.gs`.
3. Update the top:
   ```js
   var WEBHOOK_URL = 'https://theacappellaworkshop.com/api/google-form-submitted';
   var FIELD_MAP = {
     parentEmail: 'Parent/guardian email:',  // your form's exact question title
     childName:   'Student name:',
     parentName:  'Parent/guardian name:'
   };
   ```
4. Save (Cmd/Ctrl+S).
5. Click **Triggers** (clock icon, left sidebar) → **+ Add Trigger**:
   - Function: `onFormSubmit`
   - Event source: **From form**
   - Event type: **On form submit**
6. Approve the Google permissions prompt.
7. Submit a test response and check **Executions** in Apps Script — you should see `onFormSubmit` ran successfully.

That's it. The webhook fires instantly on every submission and POSTs the email/name to `/api/google-form-submitted`. The site picks it up within ~2 seconds.

See [`docs/google-form-webhook-setup.md`](./google-form-webhook-setup.md) for screenshots / troubleshooting.

---

## Fallback: published CSV

This is only used when the webhook isn't set up (or hasn't fired yet). Set the env vars below so the server has a CSV to fetch from.

### 1. Publish each sheet as CSV

For each form's response spreadsheet:

1. **File → Share → Publish to web**.
2. Pick the **Form Responses 1** tab and **Comma-separated values (.csv)**.
3. Copy the URL — it looks like
   `https://docs.google.com/spreadsheets/d/e/2PACX-…/pub?output=csv` (with optional `&gid=…`).

### 2. Set environment variables (Railway / Replit / `.env`)

```bash
# Per-camp URLs (recommended — each camp has its own form/sheet):
GOOGLE_SHEET_CSV_URL_LEXINGTON=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv
GOOGLE_SHEET_CSV_URL_NEWTON=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv
GOOGLE_SHEET_CSV_URL_WAYLAND=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv

# (optional) global fallback if a per-camp var isn't set:
# GOOGLE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv
```

### 3. Sheet columns

The server matches by column header, so order doesn't matter:

- **Parent/guardian email:** — required
- **Student name:** — recommended
- **Parent/guardian name:** — optional
- **Timestamp** — automatic in any Google Form sheet

The server picks the row by, in priority order: (1) hidden session-ID column if present, (2) the parent email the user typed on the site, (3) most-recent row within the last 10 minutes.

---

## Diagnose problems

The server exposes a diagnostic endpoint that fetches your CSV and reports what it sees:

```bash
curl 'https://your-site.com/api/sheet-diagnostic?location=lexington'
curl 'https://your-site.com/api/sheet-diagnostic?location=newton-wellesley'
curl 'https://your-site.com/api/sheet-diagnostic?location=wayland'
```

It returns the URL it's hitting, the resolved column indices, and the last 3 rows of the sheet. If a recent submission isn't in `lastRows`, **that's the cache**, not a bug — set up the webhook (above).

You can also run locally:

```bash
GOOGLE_SHEET_CSV_URL_LEXINGTON='…' npm run verify:sheets
```

## Common errors

| Symptom | Likely cause |
| --- | --- |
| **503 "Form sheet not configured"** | No `GOOGLE_SHEET_CSV_URL[_<LOCATION>]` set for that camp. |
| **502 "Sheet format unexpected"** | Header row missing the `Parent/guardian email` column (or it's spelled differently — see column list above). |
| **404 "No matching form response found"** | CSV is stale (Google's 5 min cache). The webhook is the cure. |
| Modal shows "Couldn't auto-fill your info" | Same as 404 — webhook didn't fire and CSV doesn't have the row yet. User can type info manually and proceed. |
