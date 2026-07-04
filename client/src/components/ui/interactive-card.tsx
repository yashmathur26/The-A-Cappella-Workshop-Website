import { useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type Variants,
} from "framer-motion";

interface InteractiveCardProps {
  children: ReactNode;
  className?: string;
  /** Entrance variants, so it can participate in a parent stagger. */
  variants?: Variants;
  /** Max tilt in degrees. */
  maxTilt?: number;
}

/**
 * A card shell that reacts to the cursor: it tilts in 3D toward the pointer and
 * a soft spotlight glow follows the mouse across its surface. Falls back to a
 * plain lift when the user prefers reduced motion.
 */
export function InteractiveCard({
  children,
  className,
  variants,
  maxTilt = 1.5,
}: InteractiveCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 150, damping: 15 });
  const springY = useSpring(rotateY, { stiffness: 150, damping: 15 });

  const [glow, setGlow] = useState({ x: "50%", y: "50%", on: false });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    rotateY.set((px - 0.5) * (maxTilt * 2));
    rotateX.set(-(py - 0.5) * (maxTilt * 2));
    setGlow({ x: `${px * 100}%`, y: `${py * 100}%`, on: true });
  };

  const handleLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setGlow((g) => ({ ...g, on: false }));
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={reduce ? undefined : { y: -6 }}
      style={
        reduce
          ? undefined
          : {
              rotateX: springX,
              rotateY: springY,
              transformPerspective: 900,
              transformStyle: "preserve-3d",
            }
      }
      className={`relative ${className ?? ""}`}
    >
      {children}
      {/* Cursor-following spotlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity: glow.on ? 1 : 0,
          background: `radial-gradient(420px circle at ${glow.x} ${glow.y}, rgba(56,189,248,0.16), transparent 60%)`,
        }}
      />
    </motion.div>
  );
}
