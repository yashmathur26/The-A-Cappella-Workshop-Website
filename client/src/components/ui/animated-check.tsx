import { motion } from "framer-motion";

/**
 * A circle that draws itself, then a checkmark that draws inside it.
 * Inherits color via `currentColor` — set text color on the wrapper.
 */
export function AnimatedCheck({ size = 72 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      />
      <motion.path
        d="M15 27l7 7 15-15"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.45 }}
      />
    </motion.svg>
  );
}
