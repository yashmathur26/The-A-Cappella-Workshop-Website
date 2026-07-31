# Staff photo sync

Automatically pulls teacher/TA headshots from the Google Form
**"Picture here (File responses)"** Drive folder and drops them into the site,
face-centered and sharpened. Anyone who hasn't uploaded yet gets a name-card
placeholder with their name on it.

## What one run does (`sync.py`)

1. Downloads the Drive folder with `gdown` (public share link — no login).
2. Matches each file to a roster person by the name in the filename
   (`… - Firstname Lastname.ext`). A few aliases handle mismatches
   (`William → will`, `Elliott → elliot`, `VivianSinead → vivian`).
3. Auto-centers the face (OpenCV), crops to a square, sharpens, and saves to
   `Website Pictures Lexington/staff/<key>.jpg`.
4. Writes a name-card image for anyone still missing a photo.
5. Records full names in `staff/names.json` (first name from the schedule +
   the surname from the upload) so the site shows the full name once someone
   uploads.

Existing hand-tuned crops are **adopted** (recorded, never re-cropped) on the
first run. Re-uploads (changed file) are re-processed automatically.

The site's Teachers page reads `staff/` and `names.json` dynamically, so new
photos appear with **no code changes**.

## Schedule (auto-installed)

launchd job `local.acappella.staffsync`, runs 09:00 on each date:

- **Daily:** Jul 31 – Aug 6
- **Every 2 days:** Aug 8, 10, 12, 14, 16, 18, 20
- **Final:** Aug 21 — then `sync.py` **removes the launchd job itself**, so it
  never runs again.

## Publishing note

The sync updates files in the repo. Because the site bundles images at build
time, the live site reflects new photos after the next **build + deploy** (your
usual Cloudflare/Railway deploy). In local `npm run dev` they hot-reload
instantly. (If you want the sync to also auto-commit + deploy, say the word and
I'll add it.)

## Manual use

```bash
scripts/staff-sync/run.sh          # run a sync now (logs to sync.log)
```

## Common tweaks

- **Someone's name didn't match** (see `UNMATCHED` in `sync.log`): add an entry
  to `ALIASES` in `sync.py` (`"uploadedfirstname": "rosterkey"`).
- **A face crop is off:** add `key: (x_frac, y_frac, side_frac)` to `OVERRIDES`
  in `sync.py` and re-run.
- **Stop early:** `launchctl bootout gui/$UID/local.acappella.staffsync` and
  delete `~/Library/LaunchAgents/local.acappella.staffsync.plist`.
- **Reinstall the schedule:**
  ```bash
  cp scripts/staff-sync/local.acappella.staffsync.plist ~/Library/LaunchAgents/
  launchctl bootstrap gui/$UID ~/Library/LaunchAgents/local.acappella.staffsync.plist
  ```

## Files

- `sync.py` — the sync (roster mirror lives here; keep in step with
  `client/src/lib/staff-roster.ts`).
- `run.sh` — venv wrapper the schedule calls.
- `local.acappella.staffsync.plist` — launchd schedule.
- `.venv/`, `staging/`, `sync.log`, `state.json` — local only (git-ignored).
