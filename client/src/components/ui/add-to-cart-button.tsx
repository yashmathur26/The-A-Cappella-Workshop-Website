import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  /** Is this exact option currently in the cart? */
  inCart: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** State-dependent color classes. */
  colorClass?: string;
  addLabel?: string;
  removeLabel?: string;
}

const softSpring = { type: "spring" as const, stiffness: 420, damping: 32 };
const CELEBRATE_MS = 1100;

/**
 * Add-to-cart button with an understated, Apple-style confirmation: on add, the
 * label softly blurs/slides away and a checkmark draws itself in with a gentle
 * spring, reading "Added", then eases into the "Remove" state. Same size
 * throughout; no color flash. Removing mid-celebration cancels it.
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
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), CELEBRATE_MS);
      prevInCart.current = inCart;
      return () => clearTimeout(t);
    }
    if (prevInCart.current && !inCart) {
      setCelebrating(false);
    }
    prevInCart.current = inCart;
  }, [inCart]);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative w-full py-2.5 text-sm font-medium min-h-[44px] rounded-full inline-flex items-center justify-center overflow-hidden ring-1 ring-inset ring-white/15 disabled:opacity-50",
        colorClass,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {celebrating ? (
          <motion.span
            key="added"
            className="inline-flex items-center gap-2"
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -14, filter: "blur(4px)" }}
            transition={softSpring}
          >
            <motion.svg
              viewBox="0 0 24 24"
              className="w-[18px] h-[18px]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.04 }}
            >
              <motion.path
                d="M5 12.5l4.5 4.5L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1], delay: 0.12 }}
              />
            </motion.svg>
            Added
          </motion.span>
        ) : (
          <motion.span
            key={inCart ? "remove" : "add"}
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -14, filter: "blur(4px)" }}
            transition={softSpring}
          >
            {inCart ? removeLabel : addLabel}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
