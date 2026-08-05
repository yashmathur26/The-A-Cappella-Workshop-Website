# Staff photo sync

Automatically pulls teacher/TA headshots from the Google Form
**"Picture here (File responses)"** Drive folder and adds them to the site,
face-centered and sharpened.

## How it runs (cloud, GitHub Actions)

The sync runs on GitHub, **not** a laptop — the workflow
[`.github/workflows/staff-photo-sync.yml`](../../.github/workflows/staff-photo-sync.yml):

- **Schedule:** daily at ~9:10 AM US Eastern, through **Aug 21, 2026** (a date
  guard makes it a no-op after that).
- **Steps:** pull the Drive folder → process new photos → `git commit` + push
  any new/changed photos → Cloudflare Pages redeploys automatically.
- **Manual run:** GitHub → **Actions** tab → *Staff photo sync* → **Run
  workflow** (or `gh workflow run staff-photo-sync.yml`).

> Why cloud, not local? A macOS `launchd` agent can't reliably run from
> `~/Desktop` (TCC blocks background agents → exit 126 "Operation not
> permitted"), and it only fires when the Mac is awake. The Action has none of
> those problems. The old `local.acappella.staffsync.plist` approach is retired.

## What one run does (`sync.py`)

1. Downloads the Drive folder with `gdown` (public share link — no login).
2. Matches each file to a roster person by the name in the filename
   (`… - Firstname Lastname.ext`). Aliases handle mismatches
   (`William → will`, `Elliott → elliot`, `VivianSinead → vivian`).
3. Auto-centers the face (OpenCV), crops to a square, sharpens, and saves to
   `Website Pictures Lexington/staff/<key>.jpg`.
4. Records full names in `staff/names.json` (schedule first name + surname from
   the upload). People without a photo stay first-name-only (or use the
   `MANUAL_NAMES` overrides in `client/src/lib/staff-roster.ts`).

Existing crops are **adopted** (recorded, never re-cropped). Re-uploads (changed
file) are re-processed. The Teachers page reads `staff/` + `names.json`
dynamically, so new photos appear on the next deploy with no code changes.

## Run it locally (optional)

```bash
scripts/staff-sync/run.sh          # uses scripts/staff-sync/.venv
```
Local venv is git-ignored; the workflow installs deps fresh each run
(`Pillow pillow-heif gdown opencv-python-headless==4.10.0.84 numpy`).

## Common tweaks

- **Name didn't match** (see `UNMATCHED` in the Action log): add to `ALIASES` in
  `sync.py`.
- **A face crop is off:** add `key: (x_frac, y_frac, side_frac)` to `OVERRIDES`
  in `sync.py`.
- **Stop early:** disable/delete the workflow in the GitHub Actions tab.
