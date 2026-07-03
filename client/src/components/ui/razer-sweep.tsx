import { useEffect } from "react";
import { motion } from "framer-motion";

/**
 * A diagonal green "razor" sweep played when something is added to the cart.
 * A green light band travels from the lower-left corner to the upper-right
 * corner; as it passes each box, that box's edges light up green (timed by the
 * box's position along the diagonal), and glossy surfaces catch a green hint.
 *
 * `trigger` is a counter — bumping it replays the sweep.
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

  if (trigger === 0) return null;

  return (
    <div key={trigger} className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {/* Traveling diagonal light band — the "razor". */}
      <motion.div
        className="absolute"
        style={{
          inset: "-45%",
          background:
            "linear-gradient(45deg, transparent 47%, rgba(52,211,153,0.10) 49%, rgba(110,231,183,0.35) 50%, rgba(52,211,153,0.10) 51%, transparent 53%)",
        }}
        initial={{ x: "-55%", y: "55%", opacity: 0 }}
        animate={{ x: "55%", y: "-55%", opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.95, ease: [0.23, 1, 0.32, 1], times: [0, 0.15, 0.8, 1] }}
      />
    </div>
  );
}
