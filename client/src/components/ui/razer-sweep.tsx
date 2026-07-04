import { useEffect } from "react";

/**
 * A diagonal green "razor" edge sweep played when something is added to the
 * cart: each box's edges light up green in turn, from the lower-left corner to
 * the upper-right corner (delay computed per box from its diagonal position).
 *
 * `trigger` is a counter — bumping it replays the sweep. Renders nothing; the
 * effect just toggles a CSS class on each box.
 */
export function RazerSweep({ trigger }: { trigger: number }) {
  useEffect(() => {
    if (trigger === 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const nodes = document.querySelectorAll<HTMLElement>(".glass-card, [data-razor]");
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const maxMetric = vw + vh || 1;

    nodes.forEach((node) => {
      const r = node.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return; // skip well off-screen boxes
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // Lower-left corner → 0, upper-right corner → 1.
      const progress = Math.max(0, Math.min(1, (cx + (vh - cy)) / maxMetric));
      const delay = progress * 700;
      node.style.setProperty("--razor-delay", `${delay}ms`);
      node.classList.remove("razor-sweep");
      void node.offsetWidth; // force reflow so the animation restarts
      node.classList.add("razor-sweep");
      window.setTimeout(() => node.classList.remove("razor-sweep"), delay + 1100);
    });
  }, [trigger]);

  return null;
}
