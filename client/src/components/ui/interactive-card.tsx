import { type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface InteractiveCardProps {
  children: ReactNode;
  className?: string;
  /** Entrance variants, so it can participate in a parent stagger. */
  variants?: Variants;
}

/**
 * Card shell with a subtle, purposeful lift on hover (no 3D tilt or glow).
 * Keeps entrance variants for staggered reveals.
 */
export function InteractiveCard({ children, className, variants }: InteractiveCardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={variants}
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`relative ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}
