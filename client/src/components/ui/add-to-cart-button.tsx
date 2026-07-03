import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  /** Is this exact option currently in the cart? */
  inCart: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** State-dependent color classes (gradient for "add", muted for "remove"). */
  colorClass?: string;
  addLabel?: string;
  removeLabel?: string;
}

const easeOutQuint = [0.23, 1, 0.32, 1] as const;
const CELEBRATE_MS = 1000;

/**
 * Add-to-cart button with a big celebratory moment: on add, the button expands,
 * a checkmark draws itself over a success-green flash while sparks burst outward,
 * then it eases back down and settles into "Remove". Removing mid-celebration
 * cancels it immediately.
 */
export function AddToCartButton({
  inCart,
  disabled,
  onClick,
  colorClass,
  addLabel = "Add to Cart",
  removeLabel = "Remove",
}: AddToCartButtonProps) {
  const [celebrating, setCelebrating] = useState(false);
  const prevInCart = useRef(inCart);

  useEffect(() => {
    if (!prevInCart.current && inCart) {
      // Just added → celebrate.
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), CELEBRATE_MS);
      prevInCart.current = inCart;
      return () => clearTimeout(t);
    }
    if (prevInCart.current && !inCart) {
      // Removed (possibly mid-celebration) → cancel immediately.
      setCelebrating(false);
    }
    prevInCart.current = inCart;
  }, [inCart]);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative w-full py-2.5 text-sm font-medium min-h-[44px] rounded-full inline-flex items-center justify-center ring-1 ring-inset ring-white/15 transition-colors disabled:opacity-50",
        colorClass,
      )}
    >
      {/* Success tint flash */}
      <AnimatePresence>
        {celebrating && (
          <motion.span
            key="tint"
            className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400/50 to-teal-400/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Label / checkmark swap */}
      <AnimatePresence mode="popLayout" initial={false}>
        {celebrating ? (
          <motion.span
            key="added"
            className="relative inline-flex items-center gap-2 text-base font-semibold"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: easeOutQuint }}
          >
            <motion.svg
              viewBox="0 0 24 24"
              className="w-7 h-7"
              initial={{ scale: 0.2, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 16, delay: 0.05 }}
            >
              <motion.path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: easeOutQuint, delay: 0.12 }}
              />
            </motion.svg>
            Added!
          </motion.span>
        ) : (
          <motion.span
            key={inCart ? "remove" : "add"}
            className="relative"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: easeOutQuint }}
          >
            {inCart ? removeLabel : addLabel}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Spark burst (allowed to fly beyond the button) */}
      <AnimatePresence>
        {celebrating && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i / 12) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-white"
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{
                    opacity: 0,
                    x: Math.cos(angle) * 60,
                    y: Math.sin(angle) * 34,
                    scale: 0.3,
                  }}
                  transition={{ duration: 0.8, ease: easeOutQuint }}
                />
              );
            })}
          </span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
