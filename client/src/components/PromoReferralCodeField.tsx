import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CartManager } from "@/lib/cart";
import { Tag, X } from "lucide-react";

interface PromoReferralCodeFieldProps {
  promoCode: string;
  onPromoCodeChange: (value: string) => void;
  promoError: string;
  onSubmit: () => void;
  onRemove: () => void;
  isApplying?: boolean;
  variant?: "sidebar" | "modal";
}

export function PromoReferralCodeField({
  promoCode,
  onPromoCodeChange,
  promoError,
  onSubmit,
  onRemove,
  isApplying = false,
  variant = "sidebar",
}: PromoReferralCodeFieldProps) {
  const isModal = variant === "modal";
  const inputClass = isModal
    ? "mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
    : "bg-white/10 border-white/20 text-white placeholder:text-white/50";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div>
      <Label
        htmlFor={isModal ? "modal-promo-code" : undefined}
        className={`text-white text-sm mb-2 block ${isModal ? "text-white/90 font-medium" : ""}`}
      >
        Promo/Referral Code (Optional)
      </Label>
      {isModal && (
        <p className="text-white/50 text-xs mb-2">
          Parent code (e.g. BOWS) or teacher/TA name (e.g. Aman)
        </p>
      )}
      <div className={`flex ${isModal ? "gap-2" : "flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2"}`}>
        <Input
          id={isModal ? "modal-promo-code" : undefined}
          value={promoCode}
          onChange={(e) => onPromoCodeChange(e.target.value)}
          placeholder="Promo or teacher/TA name"
          className={`${inputClass} flex-1`}
          onKeyDown={handleKeyDown}
          disabled={isApplying}
        />
        {CartManager.hasAppliedCode() ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={isApplying}
            className="px-3 py-2 shrink-0 bg-red-500/20 border border-red-400/30 text-red-200 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50"
            aria-label="Remove code"
          >
            <X size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isApplying || !promoCode.trim()}
            className="px-3 py-2 shrink-0 bg-sky-custom/20 border border-sky-custom/30 text-sky-200 rounded hover:bg-sky-custom/30 transition-colors disabled:opacity-50"
            aria-label="Apply code"
          >
            <Tag size={16} />
          </button>
        )}
      </div>
      {promoError && <p className="text-red-400 text-xs mt-1">{promoError}</p>}
      {CartManager.getPromoCode() && (
        <p className="text-green-400 text-xs mt-1">
          Code &quot;{CartManager.getPromoCode()}&quot; applied!
        </p>
      )}
      {CartManager.getParentReferralCode() && (
        <p className="text-green-400 text-xs mt-1">
          {CartManager.getReferralDiscountCents() > 0
            ? `Code "${CartManager.getReferralCodeDisplay()}" applied — $${CartManager.getReferralDiscountCents() / 100} off!`
            : `Referral from ${CartManager.getReferralCodeDisplay()} recorded!`}
        </p>
      )}
    </div>
  );
}
