import { motion } from "framer-motion";

/**
 * A green shine that floods the screen edges and border for a moment — played
 * whenever something is added to the cart. `trigger` is a counter: bumping it
 * remounts the element (via the key) so the flash replays on every add.
 */
export function ScreenFlash({ trigger }: { trigger: number }) {
  if (trigger === 0) return null;
  return (
    <div key={trigger} className="pointer-events-none fixed inset-0 z-[80]">
      {/* Green shine flooding in from every edge */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.1, times: [0, 0.2, 1], ease: [0.23, 1, 0.32, 1] }}
        style={{
          boxShadow:
            "inset 0 0 220px 50px rgba(16,185,129,0.75), inset 0 0 70px rgba(52,211,153,0.65)",
          background:
            "radial-gradient(120% 80% at 50% -20%, rgba(16,185,129,0.22), transparent 55%), radial-gradient(120% 80% at 50% 120%, rgba(16,185,129,0.22), transparent 55%)",
        }}
      />
      {/* Brief full-screen wash */}
      <motion.div
        className="absolute inset-0 bg-emerald-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.28, 0] }}
        transition={{ duration: 0.9, times: [0, 0.2, 1], ease: "easeOut" }}
      />
      {/* Crisp expanding border ring */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 1, scale: 1.015 }}
        animate={{ opacity: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ boxShadow: "inset 0 0 0 3px rgba(52,211,153,0.85)" }}
      />
    </div>
  );
}
