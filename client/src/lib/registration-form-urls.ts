/**
 * Google Form embed URLs for camp registration (must be the `/e/.../viewform?embedded=true` style link).
 * Each location has its own form → its own response spreadsheet → its own published CSV on the server.
 */

/** Newton — linked spreadsheet should be published as CSV under `GOOGLE_SHEET_CSV_URL_NEWTON`. */
export const NEWTON_FORM_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeeFLDB-7tkzrLEABkk95VEIroB16XghwyVwb0evzuJRQ_Z9A/viewform?embedded=true";

/**
 * Wayland — separate form. Set one of:
 * 1. Environment: `VITE_WAYLAND_FORM_EMBED_URL` (e.g. in `.env` or your host’s env UI), full URL with `?embedded=true`, or
 * 2. Paste the same URL string into `WAYLAND_FORM_EMBED_HARDCODE` below (fine for a single deploy).
 *
 * Get the URL: Google Form → Send → link (<> ) → copy, then add `?embedded=true` if not already present.
 */
const WAYLAND_FORM_EMBED_HARDCODE =
  "https://docs.google.com/forms/d/e/1FAIpQLSe1HvEQUQ_4GeQWN66aWNvZ2PoHV2ZwFTBqm8h5EUsN-bxzEQ/viewform?embedded=true";

export function getWaylandFormEmbedUrl(): string | undefined {
  const fromEnv = (import.meta.env.VITE_WAYLAND_FORM_EMBED_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv;
  const hard = WAYLAND_FORM_EMBED_HARDCODE.trim();
  return hard || undefined;
}
