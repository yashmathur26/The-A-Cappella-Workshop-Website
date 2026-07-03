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

/**
 * Add-to-cart button with a celebratory checkmark animation: on add, the label
 * swaps for a self-drawing checkmark, a success tint flashes, and a ring of
 * sparks bursts outward — then it settles into the "Remove" state.
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
    // Trigger the celebration only on the not-in-cart -> in-cart transition.
    if (!prevInCart.current && inCart) {
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), 1100);
      prevInCart.current = inCart;
      return () => clearTimeout(t);
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
        "relative w-full py-2.5 text-sm font-medium min-h-[44px] rounded-full overflow-hidden inline-flex items-center justify-center ring-1 ring-inset ring-white/15 transition-colors disabled:opacity-50",
        colorClass,
      )}
    >
      {/* Success tint flash */}
      <AnimatePresence>
        {celebrating && (
          <motion.span
            key="tint"
            className="absolute inset-0 bg-emerald-400/30"
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
            className="relative inline-flex items-center gap-1.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: easeOutQuint }}
          >
            <motion.svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
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
                transition={{ duration: 0.35, ease: easeOutQuint, delay: 0.06 }}
              />
            </motion.svg>
            Added!
          </motion.span>
        ) : (
          <motion.span
            key={inCart ? "remove" : "add"}
            className="relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: easeOutQuint }}
          >
            {inCart ? removeLabel : addLabel}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Spark burst */}
      <AnimatePresence>
        {celebrating && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = (i / 10) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-white"
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{
                    opacity: 0,
                    x: Math.cos(angle) * 40,
                    y: Math.sin(angle) * 22,
                    scale: 0.3,
                  }}
                  transition={{ duration: 0.7, ease: easeOutQuint }}
                />
              );
            })}
          </span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
