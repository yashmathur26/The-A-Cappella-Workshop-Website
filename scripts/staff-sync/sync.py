#!/usr/bin/env python3
"""
Staff photo sync for The A Cappella Workshop.

On each run it:
  1. Pulls the Google Form "Picture here (File responses)" Drive folder (public
     link, no auth) with gdown.
  2. Matches each uploaded file to a roster person by the name in the filename
     ("<original> - Firstname Lastname.ext"), with a few aliases.
  3. Auto-centers the face (OpenCV), crops to a square, and sharpens
     (same PIL sharpening the image-editor skill uses) -> staff/<key>.jpg.
  4. Writes a name-card image for anyone still missing a photo, so every person
     always has an image with their name in it.
  5. Records full display names (first name from the schedule + the surname from
     the upload) into staff/names.json for the site to show.
  6. Removes its own launchd schedule after END_DATE (hard "stop fully").

Existing hand-tuned crops are adopted (never re-cropped) on first run.
"""

import os
import sys
import json
import shutil
import unicodedata
import datetime
import subprocess

from PIL import Image, ImageOps, ImageEnhance
import numpy as np
import cv2

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except Exception:
    pass

# --- Paths ------------------------------------------------------------------
SYNC_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SYNC_DIR, "..", ".."))
STAFF_DIR = os.path.join(REPO, "Website Pictures Lexington", "staff")
STAGING = os.path.join(SYNC_DIR, "staging")
STATE_FILE = os.path.join(SYNC_DIR, "state.json")
NAMES_JSON = os.path.join(STAFF_DIR, "names.json")

FOLDER_URL = "https://drive.google.com/drive/folders/1ztG5Tjr60s4tAeKB64INIA0G7X2z8nCgAnHZyBxX--JbAkEwGMmGTzzN3OjRBMi5Lr260ng6"

# After this date the schedule removes itself. Camp's last week ends Aug 21.
END_DATE = datetime.date(2026, 8, 21)
LAUNCHD_LABEL = "local.acappella.staffsync"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"}
OUT_SIZE = 800
SHARPEN = 1.6

# --- Roster (mirror of client/src/lib/staff-roster.ts) ----------------------
# key -> first name as written on the schedule.
ROSTER_FIRST = {
    "aman": "Aman", "helene": "Helene", "abigail": "Abigail",
    "rohan": "Rohan", "izzi": "Izzi", "luke": "Luke", "palin": "Palin",
    "soham": "Soham", "vivian": "Vivian", "shriya": "Shriya",
    "diya": "Diya", "iris": "Iris", "krish": "Krish",
    "amal": "Amal", "niva": "Niva",
    "maggie": "Maggie", "laila": "Laila", "tate": "Tate",
    "julian": "Julian", "anaya": "Anaya", "henry": "Henry",
    "lucas": "Lucas", "enkhjin": "Enkhjin", "ayla": "Ayla", "aydin": "Aydin",
    "nishka": "Nishka", "will": "Will", "ella": "Ella",
    "sofia": "Sofia", "elliot": "Elliot", "rowan": "Rowan",
}
KEYS = set(ROSTER_FIRST)

# Uploaded first name (normalized) -> roster key, for mismatches.
ALIASES = {
    "william": "will",
    "elliott": "elliot",
    "viviansinead": "vivian",
    "izzy": "izzi",
}

# Optional manual crop overrides for edge cases the face detector handles poorly.
# key -> (face_center_x_frac, face_center_y_frac, square_side_frac_of_min_dim)
OVERRIDES = {}


def log(*a):
    print("[staff-sync]", *a, flush=True)


def normalize(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return "".join(c for c in s.lower() if c.isalpha())


def name_part(filename):
    base = os.path.basename(filename)
    part = base.rsplit(" - ", 1)[-1]           # "Firstname Lastname.ext"
    return os.path.splitext(part)[0].strip()   # "Firstname Lastname"


def resolve_key(filename):
    toks = name_part(filename).split()
    if not toks:
        return None
    first = normalize(toks[0])
    if first in KEYS:
        return first
    return ALIASES.get(first)


def display_name(key, filename):
    toks = name_part(filename).split()
    first = ROSTER_FIRST[key]
    if len(toks) >= 2:
        return f"{first} {toks[-1]}"
    return first


# --- Image processing -------------------------------------------------------
_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


def detect_face(pil_img):
    """Return (x, y, w, h) of the largest detected face, or None."""
    gray = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2GRAY)
    m = min(pil_img.size)
    faces = _CASCADE.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=6,
        minSize=(int(m * 0.08), int(m * 0.08)),
    )
    if len(faces) == 0:
        return None
    return max(faces, key=lambda f: f[2] * f[3])


def crop_person(pil_img, key):
    """Square, face-centered, sharpened OUT_SIZE image."""
    img = ImageOps.exif_transpose(pil_img).convert("RGB")
    W, H = img.size
    if key in OVERRIDES:
        fx, fy, sf = OVERRIDES[key]
        side = int(sf * min(W, H))
        cx, cy = fx * W, fy * H
    else:
        box = detect_face(img)
        if box is not None:
            x, y, w, h = box
            cx, cy = x + w / 2, y + h / 2
            side = int(min(min(W, H), max(w, h) * 2.3))
        else:
            cx, cy = W * 0.5, H * 0.42          # sensible portrait default
            side = min(W, H)
    left = max(0, min(int(round(cx - side / 2)), W - side))
    top = max(0, min(int(round(cy - side / 2)), H - side))
    crop = img.crop((left, top, left + side, top + side))
    crop = crop.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    return ImageEnhance.Sharpness(crop).enhance(SHARPEN)



# --- State ------------------------------------------------------------------
def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            s = json.load(f)
        s.setdefault("real", {})
        s.setdefault("namecards", [])
        return s
    return {"real": {}, "namecards": []}


def save_json(path, obj):
    with open(path, "w") as f:
        json.dump(obj, f, indent=2, sort_keys=True, ensure_ascii=False)
        f.write("\n")


# --- Drive download ---------------------------------------------------------
def download_folder():
    if os.path.isdir(STAGING):
        shutil.rmtree(STAGING)
    os.makedirs(STAGING, exist_ok=True)
    import gdown
    gdown.download_folder(url=FOLDER_URL, output=STAGING, quiet=True,
                          use_cookies=False)
    files = [os.path.join(STAGING, f) for f in os.listdir(STAGING)
             if os.path.splitext(f)[1].lower() in IMAGE_EXTS]
    return files


def self_terminate():
    """Remove the launchd schedule so it never runs again."""
    plist = os.path.expanduser(
        f"~/Library/LaunchAgents/{LAUNCHD_LABEL}.plist")
    try:
        subprocess.run(
            ["launchctl", "bootout", f"gui/{os.getuid()}/{LAUNCHD_LABEL}"],
            capture_output=True)
    except Exception as e:
        log("bootout failed:", e)
    if os.path.exists(plist):
        os.remove(plist)
    log("schedule complete — removed launchd job. Sync will not run again.")


def main():
    os.makedirs(STAFF_DIR, exist_ok=True)
    today = datetime.date.today()
    log(f"run {today.isoformat()}")

    try:
        files = download_folder()
    except Exception as e:
        log("ERROR downloading folder:", e)
        sys.exit(1)
    if not files:
        log("no image files downloaded (network/sharing issue?) — aborting to "
            "avoid clobbering real photos.")
        sys.exit(1)
    log(f"downloaded {len(files)} files")

    state = load_state()
    real, namecards = state["real"], set(state["namecards"])
    names = {}
    if os.path.exists(NAMES_JSON):
        with open(NAMES_JSON) as f:
            names = json.load(f)

    unmatched, processed, adopted = [], [], []
    for fp in sorted(files):
        key = resolve_key(fp)
        if not key:
            unmatched.append(os.path.basename(fp))
            continue
        full = display_name(key, fp)
        sig = str(os.path.getsize(fp))
        target = os.path.join(STAFF_DIR, f"{key}.jpg")
        prev = real.get(key)

        up_to_date = (prev and prev.get("sig") == sig
                      and os.path.exists(target) and key not in namecards)
        if up_to_date:
            names[key] = full
            continue

        # Adopt a pre-existing hand-tuned crop untouched (first run only).
        if (os.path.exists(target) and key not in real
                and key not in namecards):
            real[key] = {"sig": sig, "src": os.path.basename(fp), "name": full}
            names[key] = full
            adopted.append(key)
            continue

        # Otherwise process (new upload, changed upload, or replacing a card).
        try:
            out = crop_person(Image.open(fp), key)
            out.save(target, "JPEG", quality=92, optimize=True)
        except Exception as e:
            log(f"failed to process {key}: {e}")
            continue
        real[key] = {"sig": sig, "src": os.path.basename(fp), "name": full}
        names[key] = full
        namecards.discard(key)
        processed.append(key)

    # Missing people show an initials monogram in the app (no image file).
    # Remove any stale placeholder image we may have generated previously.
    removed = []
    for key in ROSTER_FIRST:
        if key in real:
            continue
        target = os.path.join(STAFF_DIR, f"{key}.jpg")
        if key in namecards and os.path.exists(target):
            os.remove(target)
            removed.append(key)
        namecards.discard(key)
        names.pop(key, None)

    state["namecards"] = sorted(namecards)
    save_json(STATE_FILE, state)
    save_json(NAMES_JSON, names)

    log(f"processed={processed}")
    log(f"adopted={adopted}")
    if removed:
        log(f"removed-stale-placeholders={removed}")
    if unmatched:
        log(f"UNMATCHED (add an alias in sync.py): {unmatched}")

    if today >= END_DATE:
        self_terminate()


if __name__ == "__main__":
    main()
