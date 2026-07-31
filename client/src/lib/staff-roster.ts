// Teacher / TA roster for the Lexington A Cappella Workshop, organized by week.
// Structure (who teaches/TAs which week) is editorial and lives here.
//
// Photos and full names are DATA-DRIVEN so uploads flow in automatically:
//   • Headshots live in `Website Pictures Lexington/staff/<key>.jpg` and are
//     resolved via import.meta.glob — dropping a file in makes it appear, no
//     code change. `scripts/staff-sync` keeps that folder in sync with the
//     Google Form Drive folder (see scripts/staff-sync/README.md).
//   • Every person always has an image there: a real headshot, or a name-card
//     placeholder ("<Name> — PHOTO COMING SOON") the sync generates.
//   • Surnames come from `staff/names.json` (written by the sync from the
//     uploaded filename), so a person's full name appears once they upload.

import namesData from "../../../Website Pictures Lexington/staff/names.json";

const FULL_NAMES = namesData as Record<string, string>;

// Auto-import every image in the staff folder, keyed by filename (minus ext).
const photoModules = import.meta.glob(
  "../../../Website Pictures Lexington/staff/*.{jpg,jpeg,png,JPG,PNG,JPEG}",
  { eager: true, import: "default" },
) as Record<string, string>;

const PHOTOS: Record<string, string> = {};
for (const [path, url] of Object.entries(photoModules)) {
  const key = path.split("/").pop()!.replace(/\.[^.]+$/, "").toLowerCase();
  PHOTOS[key] = url;
}

export type StaffRole = "teacher" | "ta";

export interface StaffMember {
  /** Stable id; also the photo filename (staff/<key>.jpg). */
  key: string;
  /** Display name — full name once a photo is uploaded, else first name. */
  name: string;
  /** Headshot or name-card image URL. */
  photo?: string;
}

export interface CampWeek {
  id: string;
  number: number;
  dates: string;
  venue: string;
  teachers: StaffMember[];
  tas: StaffMember[];
}

// key -> first name from the schedule (fallback until a surname is known).
const FIRST: Record<string, string> = {
  aman: "Aman", helene: "Helene", abigail: "Abigail",
  rohan: "Rohan", izzi: "Izzi", luke: "Luke", palin: "Palin",
  soham: "Soham", vivian: "Vivian", shriya: "Shriya",
  diya: "Diya", iris: "Iris", krish: "Krish",
  amal: "Amal", niva: "Niva",
  maggie: "Maggie", laila: "Laila", tate: "Tate",
  julian: "Julian", anaya: "Anaya", henry: "Henry",
  lucas: "Lucas", enkhjin: "Enkhjin", ayla: "Ayla", aydin: "Aydin",
  nishka: "Nishka", will: "Will", ella: "Ella",
  sofia: "Sofia", elliot: "Elliot", rowan: "Rowan",
};

/** Build a person from their key, resolving current name + photo. */
function p(key: string): StaffMember {
  return {
    key,
    name: FULL_NAMES[key] ?? FIRST[key] ?? key,
    photo: PHOTOS[key],
  };
}

export const ROSTER: CampWeek[] = [
  {
    id: "lex-wk1",
    number: 1,
    dates: "July 27–31, 2026",
    venue: "Temple Emunah",
    teachers: [p("aman"), p("helene"), p("abigail")],
    tas: [p("rohan"), p("izzi"), p("luke"), p("palin")],
  },
  {
    id: "lex-wk2",
    number: 2,
    dates: "August 3–7, 2026",
    venue: "Follen Church",
    teachers: [p("soham"), p("vivian"), p("shriya")],
    tas: [p("diya"), p("iris"), p("krish")],
  },
  {
    id: "lex-wk3",
    number: 3,
    dates: "August 10–14, 2026",
    venue: "Temple Emunah",
    teachers: [p("amal"), p("niva")],
    tas: [p("maggie"), p("laila"), p("tate")],
  },
  {
    id: "lex-wk4",
    number: 4,
    dates: "August 17–21, 2026",
    venue: "Temple Emunah",
    teachers: [p("julian"), p("anaya"), p("henry")],
    tas: [p("lucas"), p("enkhjin"), p("ayla"), p("aydin")],
  },
  {
    id: "lex-wk5",
    number: 5,
    dates: "August 24–28, 2026",
    venue: "Follen Church",
    teachers: [p("nishka"), p("will"), p("niva")],
    tas: [p("ella"), p("sofia"), p("elliot"), p("rowan"), p("izzi")],
  },
];

/** Initials for the monogram fallback (only if an image is ever missing). */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
