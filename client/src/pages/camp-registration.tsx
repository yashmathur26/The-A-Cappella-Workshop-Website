import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { AddToCartButton } from '@/components/ui/add-to-cart-button';
import { AnimatedCheck } from '@/components/ui/animated-check';
import { GradientButton } from '@/components/ui/gradient-button';
import { CartManager, type CartItem } from '@/lib/cart';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation as useWouterLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tag, X, AlertTriangle, MapPin, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useLocation } from '@/contexts/LocationContext';
import { isReferralCode } from '@shared/referral-codes';
import { PromoReferralCodeField } from '@/components/PromoReferralCodeField';


// Set to true to show maintenance message, false to show normal registration
const MAINTENANCE_MODE = false;

// --- Shared motion presets (purely presentational) ---
const springy = { type: 'spring' as const, stiffness: 320, damping: 30 };

const staggerList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const riseItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: springy },
};

const cartRow: Variants = {
  hidden: { opacity: 0, x: 16, height: 0 },
  show: { opacity: 1, x: 0, height: 'auto', transition: springy },
  exit: { opacity: 0, x: -16, height: 0, transition: { duration: 0.2 } },
};

// Backdrop + panel transitions for the modals/drawers.
const backdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalPanel: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { ...springy, damping: 28 } },
  exit: { opacity: 0, y: 30, scale: 0.97, transition: { duration: 0.18 } },
};

const drawerPanel: Variants = {
  hidden: { y: '100%' },
  show: { y: 0, transition: { ...springy, damping: 32 } },
  exit: { y: '100%', transition: { duration: 0.25 } },
};

export default function Register() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [registrationIds, setRegistrationIds] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState(CartManager.getAppliedCodeDisplay());
  const [promoError, setPromoError] = useState("");
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [parentEmail, setParentEmail] = useState("");
  const [childName, setChildName] = useState("");
  const [parentName, setParentName] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<'none' | 'pending' | 'completed' | 'incomplete'>('none');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [bypassMaintenance, setBypassMaintenance] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [autoFillFailed, setAutoFillFailed] = useState(false);
  const [isLoadingContact, setIsLoadingContact] = useState(false);
  const [pendingDiscountCode, setPendingDiscountCode] = useState<{
    code: string;
    displayCode: string;
    discountCents: number;
    discountDollars: number;
    usesRemaining: number;
    type: string;
  } | null>(null);
  const [switchedToFull, setSwitchedToFull] = useState(false);
  const [checkoutTransition, setCheckoutTransition] = useState(false);
  
  const [sessionId] = useState(() => {
    // Generate or retrieve session ID
    const stored = localStorage.getItem('registration-session-id');
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('registration-session-id', newId);
    return newId;
  });
  const paymentWindowRef = useRef<Window | null>(null);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const formCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(false);
  const formReadyRef = useRef(false);
  const { toast } = useToast();
  const [, setWouterLocation] = useWouterLocation();
  const { currentLocation, locationData } = useLocation();
  const parentEmailRef = useRef(parentEmail);
  const currentLocationRef = useRef(currentLocation);

  // Get location-specific weeks and pricing
  const WEEKS = locationData[currentLocation].weeks;
  const locationPricing = locationData[currentLocation].pricing;

  // Weeks closed to new signups: shown with a "Full" badge and a waitlist note
  // instead of payment options. Add a week id (e.g. "lex-wk2") to close it;
  // remove it to reopen. Empty = every week is open.
  const FULL_WEEK_IDS: string[] = ['lex-wk2'];


  useEffect(() => {
    setCart(CartManager.getCart());
    setPromoCode(CartManager.getAppliedCodeDisplay());
    
    const handleStorageChange = () => {
      setCart(CartManager.getCart());
      setPromoCode(CartManager.getAppliedCodeDisplay());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cartUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleStorageChange);
      
      // Cleanup payment monitoring
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      // Cleanup form status checking
      if (formCheckIntervalRef.current) {
        clearInterval(formCheckIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    parentEmailRef.current = parentEmail;
    currentLocationRef.current = currentLocation;
  });

  // Register email with server when user types it (so we can match form submission by email — no "Registration ID" field in form needed)
  useEffect(() => {
    if (!showForm || !parentEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentEmail.trim())) return;
    const t = setTimeout(() => {
      fetch('/api/register-form-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email: parentEmail.trim() }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [showForm, parentEmail, sessionId]);

  // Poll for form submission status (and contact info from Google Sheet or webhook)
  // Keep polling even after formSubmitted=true until we get contact data
  useEffect(() => {
    const hasContactData = parentEmail.trim() && childName.trim();
    
    // Poll if: form is shown AND (form not submitted yet OR submitted but no contact data yet)
    if (showForm && (!formSubmitted || !hasContactData)) {
      const checkFormStatus = async () => {
        try {
          const response = await fetch(`/api/check-form-status/${sessionId}`);
          const data = await response.json();
          if (data.submitted) {
            // Only set formSubmitted if not already set
            if (!formSubmitted) {
              setFormSubmitted(true);
            }
            // Auto-fill contact info if received from webhook
            if (data.parentEmail && data.childName) {
              setParentEmail(data.parentEmail);
              if (data.childName) setChildName(data.childName);
              if (data.parentName) setParentName(data.parentName);
              // Webhook arrived — close the loading state in the contact modal.
              setIsLoadingContact(false);
              setAutoFillFailed(false);
              toast({
                title: "Contact Info Received!",
                description: "Your info from the form has been filled in. You can proceed to checkout.",
              });
              // Stop polling - we have what we need
              if (formCheckIntervalRef.current) {
                clearInterval(formCheckIntervalRef.current);
              }
            }
          }
        } catch (error) {
          console.error('Error checking form status:', error);
        }
      };

      checkFormStatus();
      formCheckIntervalRef.current = setInterval(checkFormStatus, 2000); // Poll every 2s for faster response
    }

    return () => {
      if (formCheckIntervalRef.current) {
        clearInterval(formCheckIntervalRef.current);
      }
    };
  }, [showForm, formSubmitted, sessionId, toast, parentEmail, childName]);

  const addWeekToCart = (weekId: string, paymentType: 'full' | 'deposit') => {
    const week = WEEKS.find(w => w.id === weekId);
    if (week) {
      const result = CartManager.addToCart(weekId, paymentType, week, locationData[currentLocation].name);
      
      if (!result.success && result.error === 'location_mismatch') {
        toast({
          title: "Different Location in Cart",
          description: `Your cart contains items from ${result.currentLocation}. Please complete that purchase first, or clear your cart to add ${locationData[currentLocation].name} weeks.`,
          variant: "destructive",
        });
        return;
      }
      
      setCart(CartManager.getCart());
      window.dispatchEvent(new Event('cartUpdated'));
    }
  };


  const removeWeekFromCart = (weekId: string) => {
    CartManager.removeFromCart(weekId);
    setCart(CartManager.getCart());
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const clearCart = () => {
    CartManager.clearCart();
    setCart([]);
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handlePromoCodeSubmit = async () => {
    if (!promoCode.trim()) {
      setPromoError("");
      CartManager.clearAppliedCode();
      setCart(CartManager.getCart());
      return;
    }

    setIsApplyingCode(true);
    try {
    if (isReferralCode(promoCode.trim())) {
      try {
        const response = await apiRequest('POST', '/api/validate-referral-code', {
          code: promoCode.trim(),
        });
        const data = await response.json();
        if (data.valid) {
          // Discount codes only apply to the final (full) payment. If the cart
          // is deposit-only, ask the customer to switch before applying.
          if (data.discountCents > 0) {
            const items = CartManager.getCartItems();
            const hasFullPayment = items.some(item => item.paymentType === 'full');
            const hasDeposit = items.some(item => item.paymentType === 'deposit');
            if (hasDeposit && !hasFullPayment) {
              setPendingDiscountCode({
                code: data.code,
                displayCode: data.displayCode ?? data.code,
                discountCents: data.discountCents,
                discountDollars: data.discountDollars,
                usesRemaining: data.usesRemaining,
                type: data.type,
              });
              setPromoError("");
              return;
            }
          }
          CartManager.setParentReferralCode(
            data.code,
            data.discountCents,
            data.displayCode ?? data.code,
          );
          setPromoCode(data.displayCode ?? data.code);
          setPromoError("");
          setCart(CartManager.getCart());
          if (data.discountCents > 0) {
            toast({
              title: "Code applied!",
              description: `$${data.discountDollars} off! (${data.usesRemaining} use${data.usesRemaining === 1 ? "" : "s"} remaining)`,
            });
          } else {
            toast({
              title: "Referral recorded!",
              description: `Referred by ${data.displayCode ?? data.code}`,
            });
          }
          return;
        }
        setPromoError(data.message || "Invalid promo/referral code");
        CartManager.clearAppliedCode();
        setCart(CartManager.getCart());
        return;
      } catch {
        setPromoError("Could not validate code. Please try again.");
        return;
      }
    }
    
    const result = CartManager.applyPromoOrReferral(promoCode.trim(), currentLocation);
    if (result === 'cleared') {
      setPromoError("");
      setCart(CartManager.getCart());
      return;
    }

    if (result === 'promo') {
      // Check if EARLYBIRD can be applied (only for full payments)
      if (promoCode.toUpperCase() === 'EARLYBIRD') {
        const today = new Date();
        const expiryDate = new Date('2026-02-15T23:59:59');
        if (today > expiryDate) {
          setPromoError("EARLYBIRD promo code has expired. It was only valid until February 15, 2026.");
          CartManager.clearAppliedCode();
          setCart(CartManager.getCart());
          return;
        }
        
        const cart = CartManager.getCartItems();
        const hasDepositItems = cart.some(item => item.paymentType === 'deposit');
        if (hasDepositItems) {
          setPromoError("EARLYBIRD discount only applies to full payments. Remove deposit items to use this code.");
          CartManager.clearAppliedCode();
          setCart(CartManager.getCart());
          return;
        }
      }

      const appliedCode = CartManager.getPromoCode();
      setPromoError("");
      setPromoCode(appliedCode);
      setCart(CartManager.getCart());
      const saved = CartManager.getDiscountAmount();
      toast({
        title: "Promo code applied!",
        description:
          appliedCode === 'EXTRA'
            ? saved > 0
              ? `EXTRA: 50% off Aug 10–14 & Aug 24–28 — you saved $${saved}`
              : "EXTRA applied — add the Aug 10–14 or Aug 24–28 week to get 50% off"
            : `You saved $${saved} with code ${appliedCode}`,
      });
      return;
    }

    // Invalid
    if (promoCode.toUpperCase() === 'EARLYBIRD') {
      const today = new Date();
      const expiryDate = new Date('2026-02-15T23:59:59');
      if (today > expiryDate) {
        setPromoError("EARLYBIRD promo code has expired. It was only valid until February 15, 2026.");
      } else {
        setPromoError("Invalid promo/referral code");
      }
    } else {
      setPromoError("Invalid promo/referral code");
    }
    } finally {
      setIsApplyingCode(false);
    }
  };

  const handleRemovePromo = () => {
    CartManager.clearAppliedCode();
    setPromoCode("");
    setPromoError("");
    setCart(CartManager.getCart());
    toast({
      title: "Code removed",
    });
  };

  // Resolve the full-payment price for a week (used when switching a deposit to full).
  const resolveFullPrice = (weekId: string): number => {
    const week = WEEKS.find(w => w.id === weekId);
    return week ? week.price : locationPricing.full;
  };

  // Customer confirmed switching their deposit(s) to full payment to use the code.
  const handleConfirmSwitchToFull = () => {
    if (!pendingDiscountCode) return;
    const pending = pendingDiscountCode;
    CartManager.convertDepositsToFull(resolveFullPrice);
    CartManager.setParentReferralCode(
      pending.code,
      pending.discountCents,
      pending.displayCode,
    );
    setPromoCode(pending.displayCode);
    setPromoError("");
    setCart(CartManager.getCart());
    setSwitchedToFull(true);
  };

  // Head to payment from the discount popup (form is already done). Used by both
  // the "go to payment" success action and the "pay with deposit" decline action.
  const goToPaymentFromDiscountPopup = () => {
    setPendingDiscountCode(null);
    setSwitchedToFull(false);
    if (parentEmail.trim() && childName.trim()) {
      setShowContactModal(false);
      proceedToPayment();
    } else {
      setShowContactModal(true);
    }
  };

  // Customer declined switching — keep the deposit (no discount) and pay anyway.
  const handleCancelSwitchToFull = () => {
    CartManager.removeParentReferralCode();
    setPromoCode("");
    setPromoError("");
    setCart(CartManager.getCart());
    goToPaymentFromDiscountPopup();
  };

  // From the success screen, head straight to payment.
  const handleGoToPaymentAfterSwitch = () => {
    goToPaymentFromDiscountPopup();
  };

  // Close the popup without applying the code or going to payment (X button).
  const handleDismissDiscountPopup = () => {
    setPendingDiscountCode(null);
    setSwitchedToFull(false);
  };

  // Reset iframe detection refs when form section is shown/hidden
  useEffect(() => {
    if (showForm) {
      initialLoadRef.current = false;
      formReadyRef.current = false;
    }
  }, [showForm]);

  // Detect Google Form submission via iframe load events
  // When the form is submitted, Google redirects the iframe to a confirmation page,
  // which triggers a new 'load' event we can detect.
  const handleIframeLoad = () => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      // Wait for any redirects (e.g. forms.gle short URLs) to settle
      // before we start tracking submission loads
      setTimeout(() => {
        formReadyRef.current = true;
      }, 3000);
      return;
    }

    if (!formReadyRef.current) {
      // Intermediate load from redirect — ignore
      return;
    }

    // A load event after the form was ready = the user submitted the form
    if (!formSubmitted) {
      setFormSubmitted(true);
      setShowContactModal(true);
      setIsLoadingContact(true);
      setAutoFillFailed(false);

      // Mark session as awaiting contact data (matches Apps Script / Typeform webhooks if configured)
      fetch('/api/google-form-submitted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});

      // Auto-fill races two paths:
      //   A) The Apps Script webhook (instant, cache-free) — handled by the
      //      `/api/check-form-status/:sessionId` poller in another effect.
      //   B) Google's published CSV — which is cached up to ~5 min by Google,
      //      so a "just submitted" row may not appear immediately.
      //
      // We retry the CSV fetch for ~25 seconds with backoff. If neither path
      // yields data by then, we show the modal in "manual entry" mode so the
      // user can type their info and proceed to checkout.
      type ContactInfo = {
        parentEmail?: string;
        childName?: string | null;
        parentName?: string | null;
      };
      const loadContactFromSheet = async (): Promise<ContactInfo | null> => {
        // Backoff schedule (ms): ~25 sec total of retries.
        const delays = [0, 1500, 2500, 3500, 4500, 5500, 7000];
        for (let attempt = 0; attempt < delays.length; attempt++) {
          if (delays[attempt] > 0) {
            await new Promise((r) => setTimeout(r, delays[attempt]));
          }
          // If a webhook already populated the cart fields (via the polling
          // effect), bail out — no need to keep hammering the CSV endpoint.
          if (parentEmailRef.current.trim()) {
            return { parentEmail: parentEmailRef.current.trim() };
          }
          try {
            const pe = parentEmailRef.current.trim();
            const res = await fetch('/api/fetch-form-from-sheet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                location: currentLocationRef.current,
                ...(pe ? { parentEmail: pe } : {}),
              }),
            });
            if (!res.ok) continue;
            const data = (await res.json()) as ContactInfo;
            if (data.parentEmail?.trim()) {
              return data;
            }
          } catch {
            /* retry */
          }
        }
        return null;
      };

      void loadContactFromSheet().then((data) => {
        setIsLoadingContact(false);
        // The webhook poller may have already filled fields; only overwrite
        // empty ones to avoid clobbering anything the user typed manually.
        if (data?.parentEmail) {
          setParentEmail((prev) => prev.trim() || data.parentEmail!);
          if (data.childName) setChildName((prev) => prev.trim() || data.childName!);
          if (data.parentName) setParentName((prev) => prev.trim() || data.parentName!);
          setAutoFillFailed(false);
        } else if (!parentEmailRef.current.trim()) {
          setAutoFillFailed(true);
        }
      });
    }
  };

  const proceedToPayment = async () => {
    if (cart.length === 0) return;
    
    // Check if form has been submitted
    if (!formSubmitted) {
      toast({
        title: "Registration Form Required",
        description: "Please complete the registration form above before proceeding to checkout.",
        variant: "destructive",
      });
      return;
    }
    
    // Require contact info (from form or manual fallback)
    if (!parentEmail.trim() || !childName.trim()) {
      toast({
        title: "Contact info needed",
        description: "Submit the form above so your info appears here, or use the fallback in the cart.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentEmail.trim())) {
      toast({
        title: "Invalid email address",
        description: "Please enter a valid email address (e.g., parent@example.com)",
        variant: "destructive",
      });
      return;
    }

    const referralName = CartManager.getReferralName() || undefined;
    const parentReferralCode = CartManager.getParentReferralCode() || undefined;
    
    // Go directly to Stripe checkout
    setIsLoading(true);
    setPaymentStatus('pending');
    
    try {
      const promoCode = CartManager.getPromoCode();
      const discountedCartItems = parentReferralCode
        ? cart.map(item => ({
            ...item,
            price: item.price,
            weekLabel: item.label,
          }))
        : cart.map(item => {
        // DOLLAR: $1 per week
        if (promoCode === 'DOLLAR') {
          return {
            ...item,
            price: 1,
            weekLabel: item.label,
          };
        }
        // EARLYBIRD: only full payment items
        if (promoCode === 'EARLYBIRD' && item.paymentType === 'full') {
          const discount = CartManager.getDiscount();
          const discountedPrice = item.price * (1 - discount);
          return {
            ...item,
            price: discountedPrice,
            weekLabel: item.label,
          };
        }
        // EXTRA: 50% off Aug 10–14 and Aug 24–28 weeks only
        if (promoCode === 'EXTRA' && CartManager.isExtraEligibleWeek(item.weekId)) {
          return {
            ...item,
            price: item.price * 0.5,
            weekLabel: item.label,
          };
        }
        return {
          ...item,
          price: item.price,
          weekLabel: item.label,
        };
      });
      
      const response = await apiRequest('POST', '/api/create-checkout-session', {
        cartItems: discountedCartItems,
        promoCode: CartManager.getPromoCode(),
        parentEmail: parentEmail.trim(),
        childName: childName.trim(),
        parentName: parentName.trim() || undefined,
        locationName: locationData[currentLocation].name,
        referralName,
        referralCode: parentReferralCode,
      });
      
      const data = await response.json();
      
      if (data.url) {
        // Play a brief success-checkmark transition, then redirect to Stripe.
        setCheckoutTransition(true);
        setTimeout(() => {
          window.location.href = data.url;
        }, 1200);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      setPaymentStatus('none');
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startPaymentMonitoring = (sessionId: string) => {
    let checkCount = 0;
    const maxChecks = 60; // Check for 5 minutes (5 second intervals)
    
    statusCheckIntervalRef.current = setInterval(async () => {
      checkCount++;
      
      try {
        const response = await apiRequest('GET', `/api/payment-status/${sessionId}`);
        const data = await response.json();
        
        if (data.status === 'paid') {
          setPaymentStatus('completed');
          clearInterval(statusCheckIntervalRef.current!);
          
          // Clear cart and show success
          CartManager.clearCart();
          // Force navigation to update immediately
          window.dispatchEvent(new Event('cartUpdated'));
          toast({
            title: "Payment Successful!",
            description: "Your registration has been completed. You will receive a confirmation email shortly.",
          });
          
          // Refresh the page after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          
        } else if (data.sessionStatus === 'expired' || checkCount >= maxChecks) {
          setPaymentStatus('incomplete');
          clearInterval(statusCheckIntervalRef.current!);
        }
      } catch (error) {
        if (checkCount >= maxChecks) {
          setPaymentStatus('incomplete');
          clearInterval(statusCheckIntervalRef.current!);
        }
      }
    }, 5000); // Check every 5 seconds
    
    // Also listen for window focus to check immediately when user returns
    const handleFocus = async () => {
      if (paymentWindowRef.current?.closed) {
        try {
          const response = await apiRequest('GET', `/api/payment-status/${sessionId}`);
          const data = await response.json();
          
          if (data.status === 'paid') {
            setPaymentStatus('completed');
            clearInterval(statusCheckIntervalRef.current!);
            CartManager.clearCart();
            // Force navigation to update immediately
            window.dispatchEvent(new Event('cartUpdated'));
            toast({
              title: "Payment Successful!",
              description: "Your registration has been completed.",
            });
            setTimeout(() => window.location.reload(), 2000);
          } else {
            setPaymentStatus('incomplete');
          }
        } catch (error) {
          setPaymentStatus('incomplete');
        }
        
        window.removeEventListener('focus', handleFocus);
        clearInterval(statusCheckIntervalRef.current!);
      }
    };
    
    window.addEventListener('focus', handleFocus);
  };


  const cartItems = CartManager.getCartItems();
  const cartSubtotal = CartManager.getCartSubtotal();
  const discountAmount = CartManager.getDiscountAmount();
  const cartTotal = CartManager.getCartTotal();
  const hasDiscount = discountAmount > 0;

  const registrationFormBaseUrl = locationData[currentLocation].formUrl;
  const lexingtonFormFallback =
    "https://docs.google.com/forms/d/e/1FAIpQLSdHXYEXmGe39_L3Uq8f-T0653oFF2DEGLQMBDgN0vDC4ox1hA/viewform?embedded=true";
  const formEmbedBase =
    registrationFormBaseUrl ??
    (currentLocation === "lexington" ? lexingtonFormFallback : undefined);
  const registrationIframeSrc =
    formEmbedBase &&
    (() => {
      const base = formEmbedBase;
      if (base.includes("typeform.com")) return base;
      const entryId = locationData[currentLocation].formSessionIdEntryId;
      if (!entryId) return base;
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}entry.${entryId}=${encodeURIComponent(sessionId)}`;
    })();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.reveal-in').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Show maintenance page if enabled (unless bypassed)
  if (MAINTENANCE_MODE && !bypassMaintenance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <GlassCard className="max-w-lg w-full p-8 text-center">
          <div className="mb-6">
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Under Maintenance</h1>
            <p className="text-white/70">
              We're currently updating our registration system to serve you better. 
              Please check back in a few minutes.
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <p className="text-white/60 text-sm">
              If you need immediate assistance, please email us at{' '}
              <a href="mailto:theacappellaworkshop@gmail.com" className="text-blue-400 hover:text-blue-300">
                theacappellaworkshop@gmail.com
              </a>
            </p>
          </div>
          <p className="text-white/50 text-xs mb-3">Admin only:</p>
          <Button
            onClick={() => setBypassMaintenance(true)}
            className="w-full py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg"
          >
            Admin access — View registration
          </Button>
          <p className="text-white/50 text-xs mt-6">We apologize for any inconvenience.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center lg:items-stretch">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springy, damping: 24 }}
          className={`text-4xl lg:text-5xl font-bold text-center mb-8 w-full ${currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text'}`}
        >
          Register for Summer 2026
        </motion.h1>
        
        {/* Payment Status Messages */}
        {paymentStatus === 'pending' && (
          <GlassCard className="p-6 mb-8 w-full max-w-3xl lg:max-w-none">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Payment In Progress</h3>
              <p className="text-blue-200">
                Complete your payment in the new tab that opened. Don't close this page - we're monitoring your payment status.
              </p>
            </div>
          </GlassCard>
        )}

        {paymentStatus === 'incomplete' && (
          <GlassCard className="p-6 mb-8 w-full max-w-3xl lg:max-w-none">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                <X className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Payment Not Completed</h3>
              <p className="text-orange-200 mb-4">
                It looks like you closed the payment window or the payment wasn't completed. Your items are still in your cart.
              </p>
              <button
                onClick={() => setPaymentStatus('none')}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </GlassCard>
        )}

        {paymentStatus === 'completed' && (
          <GlassCard className="p-6 mb-8 w-full max-w-3xl lg:max-w-none">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Tag className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Payment Successful!</h3>
              <p className="text-green-200">
                Thank you for your registration! You'll receive a confirmation email shortly.
              </p>
            </div>
          </GlassCard>
        )}

        {/* Payment Options Explanation */}
        <GlassCard className="p-6 mb-12 w-full max-w-3xl lg:max-w-none">
          <h2 className={`text-xl font-bold mb-4 text-center lg:text-left ${currentLocation === 'wayland' ? 'text-purple-400' : currentLocation === 'newton-wellesley' ? 'text-emerald-400' : 'text-sky-custom'}`}>Payment Options</h2>
          <div className="space-y-3 text-white/90">
            <div className="flex items-start space-x-3">
              <span className="text-teal-custom font-bold">💳</span>
              <div>
                <p className="font-semibold">Pay in Full (${locationData[currentLocation].pricing.full}/week)</p>
                <p className="text-sm text-white/70">Complete payment today — no additional fees or invoices</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-sky-custom font-bold">📄</span>
              <div>
                <p className="font-semibold">Pay Deposit (${locationData[currentLocation].pricing.deposit}/week)</p>
                <p className="text-sm text-white/70">Secure your spot with a non-refundable deposit. We'll email you an invoice for the remaining ${locationData[currentLocation].pricing.full - locationData[currentLocation].pricing.deposit} prior to the start of the program.</p>
              </div>
            </div>
          </div>
        </GlassCard>
        
        <div className="w-full max-w-3xl lg:max-w-none lg:grid lg:grid-cols-3 lg:gap-8 xl:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8 lg:space-y-12 w-full">
            {/* Step 1: Choose Weeks */}
            <section className="w-full">
              <h2 className="text-2xl font-bold mb-4 text-white text-center lg:text-left">Step 1 — Choose Your Week(s)</h2>
              <p className="text-white/80 mb-6 text-center lg:text-left">Select your preferred weeks and payment option.</p>
              <motion.div
                className="grid gap-6 w-full"
                variants={staggerList}
                initial="hidden"
                animate="show"
              >
                {WEEKS.map((week, index) => {
                  const isFull = FULL_WEEK_IDS.includes(week.id);
                  return (
                  <InteractiveCard key={week.id} variants={riseItem}>
                  <GlassCard
                    className={`p-6 week-card ${CartManager.isInCart(week.id) ? 'selected' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-white">Week {index + 1}: <span className="font-normal">{week.label}</span></h3>
                          {isFull && (
                            <span className="px-2.5 py-1 text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 rounded-full uppercase tracking-wide">
                              Full
                            </span>
                          )}
                        </div>
                        {week.venue && (
                          <div className="mt-2">
                            <span className="text-sm text-white/70 flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {week.venue.name} - {week.venue.addressLine2}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Payment Options */}
                    {isFull ? (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-center">
                        <p className="text-white font-semibold mb-1">This week is full</p>
                        <p className="text-white/60 text-sm">
                          Email{' '}
                          <a href="mailto:theacappellaworkshop@gmail.com" className="text-sky-custom underline">
                            theacappellaworkshop@gmail.com
                          </a>{' '}
                          to join the waitlist.
                        </p>
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-white">Full Payment</span>
                          <span className="text-xl font-bold text-white">${week.price}</span>
                        </div>
                        <p className="text-xs text-white/60 mb-3">Pay today, no additional fees</p>
                        <AddToCartButton
                          inCart={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full'}
                          disabled={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit'}
                          onClick={() => {
                            if (CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full') {
                              removeWeekFromCart(week.id);
                            } else {
                              addWeekToCart(week.id, 'full');
                            }
                          }}
                          colorClass={
                            CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full'
                              ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                              : currentLocation === 'wayland' ? 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white border-0 shadow-lg shadow-violet-900/30' : currentLocation === 'newton-wellesley' ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white border-0 shadow-lg shadow-emerald-900/30' : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white border-0 shadow-lg shadow-teal-900/30'
                          }
                        />
                      </div>
                      
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-white">Deposit</span>
                          <span className="text-xl font-bold text-white">$150</span>
                        </div>
                        <p className="text-xs text-white/60 mb-3">${week.price - 150} remaining via invoice</p>
                        <AddToCartButton
                          inCart={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit'}
                          disabled={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full'}
                          onClick={() => {
                            if (CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit') {
                              removeWeekFromCart(week.id);
                            } else {
                              addWeekToCart(week.id, 'deposit');
                            }
                          }}
                          colorClass={
                            CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit'
                              ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                              : currentLocation === 'wayland' ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-fuchsia-900/30' : currentLocation === 'newton-wellesley' ? 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-400 hover:to-teal-500 text-white border-0 shadow-lg shadow-green-900/30' : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white border-0 shadow-lg shadow-blue-900/30'
                          }
                        />
                      </div>
                    </div>
                    )}
                  </GlassCard>
                  </InteractiveCard>
                  );
                })}
              </motion.div>
            </section>

            {/* Step 2: Registration Form - Only show after weeks are selected */}
            {showForm && (
              <motion.section
                className="w-full"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              >
                <motion.h2
                  className="text-2xl font-bold mb-6 text-white text-center lg:text-left"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
                >
                  Step 2 — Complete Registration Form
                </motion.h2>

                {/* Form Submission Status */}
                <GlassCard className={`p-4 mb-2 ${formSubmitted ? 'bg-green-500/20 border-green-500/50 lg:bg-green-500/10 lg:border-green-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formSubmitted ? 'bg-green-500/30 lg:bg-green-500/20' : 'bg-blue-500/20'}`}>
                      {formSubmitted ? (
                        <span className="text-green-400 text-xl">✓</span>
                      ) : (
                        <span className="text-blue-400 text-xl">📝</span>
                      )}
                    </div>
                    <div className="flex-1">
                      {formSubmitted ? (
                        <>
                          <p className={`font-semibold ${formSubmitted ? 'text-green-400 lg:text-green-400' : 'text-blue-400'}`}>Form Submitted Successfully!</p>
                          <p className={`text-sm ${formSubmitted ? 'text-green-300 lg:text-green-300/80' : 'text-blue-300/80'}`}>You can now proceed to checkout</p>
                        </>
                      ) : (
                        <>
                          <p className="text-blue-400 font-semibold">Waiting for Form Submission</p>
                          <p className="text-blue-300/80 text-sm">Complete the form below to unlock checkout</p>
                        </>
                      )}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <p className="text-white/80 mb-4">Fill out the form below. After you submit, a popup will appear to confirm your details before checkout.</p>
                  <div className="rounded-2xl border border-white/15 overflow-hidden bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    {registrationIframeSrc ? (
                      <>
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.05]">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                          <span className="ml-2 text-xs text-white/50">Secure registration form</span>
                        </div>
                        <iframe
                          title="Registration form"
                          src={registrationIframeSrc}
                          width="100%"
                          height={formSubmitted ? "320" : "520"}
                          frameBorder="0"
                          marginHeight={0}
                          marginWidth={0}
                          className="block w-full bg-white transition-[height] duration-500 ease-out"
                          onLoad={handleIframeLoad}
                        >
                          Loading…
                        </iframe>
                      </>
                    ) : (
                      <div className="rounded bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-100/90">
                        <p className="font-semibold text-amber-200 mb-2">
                          {currentLocation === "wayland"
                            ? "Wayland form URL not set"
                            : "Registration form URL not set"}
                        </p>
                        {currentLocation === "wayland" ? (
                          <>
                            <p className="mb-2">
                              Add your Wayland Google Form embed link to{' '}
                              <code className="text-white/90 bg-black/30 px-1 rounded">client/src/lib/registration-form-urls.ts</code>{' '}
                              (<code className="text-white/90 bg-black/30 px-1 rounded">WAYLAND_FORM_EMBED_HARDCODE</code>) or set{' '}
                              <code className="text-white/90 bg-black/30 px-1 rounded">VITE_WAYLAND_FORM_EMBED_URL</code> in the environment, then redeploy.
                            </p>
                            <p className="text-white/70">
                              Use the form’s <code className="text-white/80">/e/…/viewform?embedded=true</code> URL. On the server, publish that form’s response sheet and set{' '}
                              <code className="text-white/80">GOOGLE_SHEET_CSV_URL_WAYLAND</code>.
                            </p>
                          </>
                        ) : (
                          <p className="text-white/70">
                            Set <code className="text-white/80">formUrl</code> for this location in{' '}
                            <code className="text-white/80">LocationContext.tsx</code> / registration config.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {!formSubmitted && (
                    <p className="text-center text-white/50 text-xs mt-3">
                      Already submitted the form but it wasn't detected?{' '}
                      <button
                        onClick={() => {
                          setFormSubmitted(true);
                          setShowContactModal(true);
                          setAutoFillFailed(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Click here to confirm manually
                      </button>
                    </p>
                  )}

                  {formSubmitted && cartItems.length > 0 && (
                    <div className="mt-4 pt-2">
                      {parentEmail.trim() && childName.trim() ? (
                        <>
                          <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                            <p className="text-green-400 font-medium text-sm mb-1">Ready to checkout</p>
                            <p className="text-white/80 text-sm">{childName} ({parentEmail})</p>
                            <button
                              onClick={() => setShowContactModal(true)}
                              className="text-xs text-blue-400 hover:text-blue-300 underline mt-1"
                            >
                              Edit info
                            </button>
                          </div>
                          <Button
                            className="w-full border-0 rounded-full py-4 text-lg font-semibold text-white bg-green-600 hover:bg-green-700"
                            onClick={() => proceedToPayment()}
                            disabled={isLoading}
                            data-testid="button-checkout-form"
                          >
                            {isLoading ? 'Processing...' : `Proceed to Checkout — $${cartTotal.toFixed(2)}`}
                          </Button>
                        </>
                      ) : (
                        <Button
                          className={`w-full border-0 rounded-full py-4 text-lg font-semibold text-white ${
                            currentLocation === 'wayland' 
                              ? 'bg-purple-600 hover:bg-purple-700' 
                              : currentLocation === 'newton-wellesley' 
                                ? 'bg-emerald-600 hover:bg-emerald-700' 
                                : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          onClick={() => setShowContactModal(true)}
                        >
                          Enter Contact Info to Checkout
                        </Button>
                      )}
                    </div>
                  )}
                </GlassCard>
              </motion.section>
            )}
          </div>

          {/* Cart Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1 mt-12 lg:mt-0">
            <GlassCard className="p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-6 text-white">Your Cart</h3>
              <div className="space-y-3 mb-6">
                {cartItems.length === 0 ? (
                  <p className="text-white/60">No weeks selected</p>
                ) : (
                  <AnimatePresence initial={false}>
                  {cartItems.map(item => (
                    <motion.div
                      key={item.weekId}
                      layout
                      variants={cartRow}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      className="flex justify-between items-center text-sm bg-white/5 rounded-lg p-3 border border-white/10 overflow-hidden"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white/90 text-base font-medium">{item.label}</span>
                          {item.location && (
                            <span className="text-xs px-2 py-1 rounded bg-sky-custom/20 text-sky-custom border border-sky-custom/30">
                              {item.location}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/70">
                            {item.paymentType === 'deposit' ? 'Deposit' : 'Full Payment'}
                          </span>
                          <span className="text-white/90 font-medium">${item.price}</span>
                        </div>
                        {false && item.studentName && (
                          <div className="text-xs text-teal-400 mt-1">
                            {item.studentName}
                          </div>
                        )}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => removeWeekFromCart(item.weekId)}
                        className="ml-3 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                        title="Remove from cart"
                      >
                        <X size={16} />
                      </motion.button>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                )}
              </div>
              
              {/* Contact info status */}
              {cartItems.length > 0 && showForm && (
                <div className="mb-6 space-y-4">
                  {!formSubmitted ? (
                    <p className="text-white/70 text-sm">
                      Complete the registration form above. A popup will appear to confirm your info.
                    </p>
                  ) : parentEmail.trim() && childName.trim() ? (
                    <div className="space-y-3">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-1">
                        <p className="text-green-400 font-medium text-sm">Ready to checkout</p>
                        {parentName && <p className="text-white/90 text-sm">Parent: {parentName}</p>}
                        <p className="text-white/90 text-sm">Email: {parentEmail}</p>
                        <p className="text-white/90 text-sm">Student: {childName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowContactModal(true)}
                        className="w-full py-2 px-4 border border-white/20 rounded text-white/70 hover:bg-white/5 text-sm transition-colors"
                      >
                        Edit info
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                        <p className="text-amber-300 text-sm font-medium">Contact info needed</p>
                        <p className="text-white/50 text-xs mt-1">Click below to enter your details</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowContactModal(true)}
                        className={`w-full py-2 px-4 rounded text-white font-medium transition-colors ${
                          currentLocation === 'wayland' 
                            ? 'bg-purple-600 hover:bg-purple-700' 
                            : currentLocation === 'newton-wellesley' 
                              ? 'bg-emerald-600 hover:bg-emerald-700' 
                              : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        Enter Contact Info
                      </button>
                    </div>
                  )}

                  <PromoReferralCodeField
                    promoCode={promoCode}
                    onPromoCodeChange={setPromoCode}
                    promoError={promoError}
                    onSubmit={handlePromoCodeSubmit}
                    onRemove={handleRemovePromo}
                    isApplying={isApplyingCode}
                    variant="sidebar"
                  />
                </div>
              )}
              
              <div className="border-t border-white/20 pt-4">
                {hasDiscount && (
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between text-white/80">
                      <span>Subtotal:</span>
                      <span>${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-400">
                      <span>Discount ({CartManager.getAppliedCodeDisplay()}):</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold mb-2">
                  <span className="text-white">Total:</span>
                  <span className="text-white">${cartTotal.toFixed(2)}</span>
                </div>
                <p className="text-white/50 text-xs mb-4">* 3.6% processing fee will be added at checkout</p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
                  <p className="text-white/70 text-xs text-center">
                    Want to avoid fees? Pay via Zelle or check — email us at{' '}
                    <a href="mailto:theacappellaworkshop@gmail.com" className="text-sky-400 hover:underline">
                      theacappellaworkshop@gmail.com
                    </a>
                  </p>
                </div>
                <div className="space-y-3">
                  {!showForm ? (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-full py-3 font-semibold"
                      onClick={() => {
                        setShowForm(true);
                        // Auto scroll to the registration form
                        setTimeout(() => {
                          const formSection = document.querySelector('section:has(iframe)');
                          if (formSection) {
                            formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                      disabled={cart.length === 0}
                    >
                      Registration Form
                    </Button>
                  ) : (
                    <Button
                      className={`w-full border-0 rounded-full py-3 font-semibold ${
                        !formSubmitted 
                          ? 'bg-gray-600 cursor-not-allowed' 
                          : (parentEmail.trim() && childName.trim())
                            ? 'bg-green-600 hover:bg-green-700'
                            : currentLocation === 'wayland' 
                              ? 'bg-purple-600 hover:bg-purple-700' 
                              : currentLocation === 'newton-wellesley' 
                                ? 'bg-emerald-600 hover:bg-emerald-700' 
                                : 'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                      onClick={() => {
                        if (parentEmail.trim() && childName.trim()) {
                          proceedToPayment();
                        } else if (formSubmitted) {
                          setShowContactModal(true);
                        }
                      }}
                      disabled={cart.length === 0 || isLoading || !formSubmitted}
                      data-testid="button-checkout"
                    >
                      {isLoading ? 'Processing...' : 
                       !formSubmitted ? '⏳ Complete Form First' :
                       !parentEmail.trim() || !childName.trim() ? 'Enter Contact Info' :
                       'Proceed to Checkout'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full py-3"
                    onClick={clearCart}
                  >
                    Clear Cart
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

      </div>

      {/* Mobile Floating Cart Button - Only shows when cart has items */}
      {cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-20 right-4 z-50">
          <button
            onClick={() => setShowMobileCart(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 opacity-100"
          >
            <ShoppingCart size={20} />
            <span className="font-semibold">{cartItems.length}</span>
            <span className="hidden sm:inline">item{cartItems.length !== 1 ? 's' : ''}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer */}
      <AnimatePresence>
      {showMobileCart && (
        <motion.div
          variants={backdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          className="lg:hidden fixed inset-0 z-50"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMobileCart(false)}
          />
          {/* Drawer */}
          <motion.div
            variants={drawerPanel}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-white/20 rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-gray-900">
              <h3 className="text-xl font-bold text-white">Your Cart</h3>
              <button
                onClick={() => setShowMobileCart(false)}
                className="text-white/70 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Cart Items */}
              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.weekId} className="flex justify-between items-start text-sm bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white/90 text-base font-medium">{item.label}</span>
                        {item.location && (
                          <span className="text-xs px-2 py-1 rounded bg-sky-custom/20 text-sky-custom border border-sky-custom/30">
                            {item.location}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/70">
                          {item.paymentType === 'deposit' ? 'Deposit' : 'Full Payment'}
                        </span>
                        <span className="text-white/90 font-medium">${item.price}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        removeWeekFromCart(item.weekId);
                        if (cartItems.length === 1) setShowMobileCart(false);
                      }}
                      className="ml-3 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                      title="Remove from cart"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Contact from form - Mobile */}
              {showForm && (
                <div className="border-t border-white/20 pt-4 space-y-4">
                  {!formSubmitted ? (
                    <p className="text-white/70 text-sm">Complete the form above; your contact info will be filled from the form.</p>
                  ) : parentEmail.trim() && childName.trim() && !showManualEntry ? (
                    <div className="space-y-3">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-1">
                        <p className="text-green-400 font-medium text-sm">Contact (from form)</p>
                        {parentName && <p className="text-white/90 text-sm">Parent: {parentName}</p>}
                        <p className="text-white/90 text-sm">Email: {parentEmail}</p>
                        <p className="text-white/90 text-sm">Student: {childName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowManualEntry(true)}
                        className="w-full py-2 px-4 border border-white/20 rounded text-white/70 hover:bg-white/5 text-sm transition-colors"
                      >
                        Edit manually
                      </button>
                    </div>
                  ) : !showManualEntry ? (
                    <div className="space-y-3">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                          <p className="text-blue-300 text-sm">Waiting for your info from the form...</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowManualEntry(true)}
                        className="w-full py-2 px-4 border border-white/20 rounded text-white/70 hover:bg-white/5 text-sm transition-colors"
                      >
                        Or enter details manually
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-white/70 text-sm">Enter your contact info:</p>
                      <Input
                        value={childName}
                        onChange={(e) => setChildName(e.target.value)}
                        placeholder="Child's name"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <Input
                        type="email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="parent@example.com"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <Input
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder="Parent name"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  )}

                  <PromoReferralCodeField
                    promoCode={promoCode}
                    onPromoCodeChange={setPromoCode}
                    promoError={promoError}
                    onSubmit={handlePromoCodeSubmit}
                    onRemove={handleRemovePromo}
                    isApplying={isApplyingCode}
                    variant="sidebar"
                  />
                </div>
              )}

              {/* Total */}
              <div className="border-t border-white/20 pt-4">
                {hasDiscount && (
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between text-white/80">
                      <span>Subtotal:</span>
                      <span>${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-400">
                      <span>Discount ({CartManager.getAppliedCodeDisplay()}):</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold mb-4">
                  <span className="text-white">Total:</span>
                  <span className="text-white">${cartTotal.toFixed(2)}</span>
                </div>
                
                {/* Mobile Checkout Button in Drawer */}
                {showForm && (
                  <Button
                    className={`w-full border-0 rounded-full py-3 font-semibold text-white ${
                      !formSubmitted || !parentEmail.trim() || !childName.trim()
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                    onClick={() => {
                      if (formSubmitted && parentEmail.trim() && childName.trim()) {
                        setShowMobileCart(false);
                        proceedToPayment();
                      } else {
                        toast({
                          title: "Contact info needed",
                          description: "Fill in the contact info fields in the cart to continue.",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={!formSubmitted || !parentEmail.trim() || !childName.trim()}
                  >
                    {!formSubmitted ? '⏳ Complete Form First' :
                     !parentEmail.trim() || !childName.trim() ? '⏳ Waiting for form info...' :
                     'Proceed to Checkout'}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Mobile "Proceed to Step 2" Button - Fixed at bottom, only shows when cart has items and form not shown */}
      {cartItems.length > 0 && !showForm && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-white/10 p-4 shadow-2xl">
          <Button
            className="w-full border-0 rounded-full py-4 font-semibold text-lg bg-blue-600 hover:bg-blue-700 text-white opacity-100"
            onClick={() => {
              setShowForm(true);
              // Auto scroll to the registration form
              setTimeout(() => {
                const formSection = document.querySelector('section:has(iframe)');
                if (formSection) {
                  formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 100);
            }}
          >
            Next — Fill out form
          </Button>
        </div>
      )}

      {/* Mobile Checkout Button - Shows when form is shown */}
      {cartItems.length > 0 && showForm && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-white/10 p-4 shadow-2xl">
          <Button
            className={`w-full border-0 rounded-full py-4 font-semibold text-lg text-white opacity-100 ${
              formSubmitted && parentEmail.trim() && childName.trim()
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={() => {
              if (formSubmitted && parentEmail.trim() && childName.trim()) {
                proceedToPayment();
              } else if (formSubmitted) {
                setShowContactModal(true);
              } else {
                // Not submitted yet — take them straight to the form.
                const formSection = document.querySelector('section:has(iframe)');
                if (formSection) {
                  formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' :
             !formSubmitted ? 'Next — Fill out form' :
             !parentEmail.trim() || !childName.trim() ? 'Enter Contact Info' :
             'Proceed to Checkout'}
          </Button>
        </div>
      )}

      {/* Contact Info Modal - appears after form submission */}
      <AnimatePresence>
      {showContactModal && (
        <motion.div
          variants={backdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            variants={modalPanel}
            initial="hidden"
            animate="show"
            exit="exit"
            className={`w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-2xl ${
            currentLocation === 'wayland'
              ? 'bg-gradient-to-br from-purple-900/95 to-violet-900/95 border-purple-500/30'
              : currentLocation === 'newton-wellesley'
                ? 'bg-gradient-to-br from-emerald-900/95 to-green-900/95 border-emerald-500/30'
                : 'bg-gradient-to-br from-blue-900/95 to-indigo-900/95 border-blue-500/30'
          }`}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  {autoFillFailed ? 'Enter Your Details' : 'Confirm Your Info'}
                </h2>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {/* Non-blocking auto-fill hint — fields stay usable underneath */}
              {isLoadingContact && (
                <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3">
                  <div className="w-5 h-5 flex-shrink-0 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-white/70 text-xs flex-1">
                    Trying to auto-fill from your form submission… you can just enter your info below.
                  </p>
                  <button
                    onClick={() => setIsLoadingContact(false)}
                    className="text-white/60 text-xs underline hover:text-white/90 flex-shrink-0"
                    type="button"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Auto-fill Failed Warning */}
              {!isLoadingContact && autoFillFailed && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-200 font-medium text-sm">Couldn't auto-fill your info</p>
                      <p className="text-amber-200/70 text-xs mt-1">
                        Please enter the same email and student name you used in the Google Form.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields — always available so customers can enter info manually */}
              {(
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="modal-parent-email" className="text-white/90 text-sm font-medium">
                      Parent/Guardian Email <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="modal-parent-email"
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
                      autoComplete="email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="modal-child-name" className="text-white/90 text-sm font-medium">
                      Student Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="modal-child-name"
                      type="text"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      placeholder="Student's full name"
                      className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="modal-parent-name" className="text-white/90 text-sm font-medium">
                      Parent/Guardian Name
                    </Label>
                    <Input
                      id="modal-parent-name"
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Your full name"
                      className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
                    />
                  </div>

                  <PromoReferralCodeField
                    promoCode={promoCode}
                    onPromoCodeChange={setPromoCode}
                    promoError={promoError}
                    onSubmit={handlePromoCodeSubmit}
                    onRemove={handleRemovePromo}
                    isApplying={isApplyingCode}
                    variant="modal"
                  />

                  {/* Cart Summary */}
                  <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-white/70 text-sm mb-2">Your selection:</p>
                    {cartItems.map(item => (
                      <div key={item.weekId} className="flex justify-between text-sm">
                        <span className="text-white/90">{item.label}</span>
                        <span className="text-white font-medium">${item.price}</span>
                      </div>
                    ))}
                    {hasDiscount && (
                      <>
                        <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-sm text-white/80">
                          <span>Subtotal</span>
                          <span>${cartSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-400">
                          <span>Discount ({CartManager.getAppliedCodeDisplay()})</span>
                          <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="mt-2 pt-2 border-t border-white/10 flex justify-between">
                      <span className="text-white font-semibold">Total</span>
                      <span className="text-white font-bold">${cartTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-white/40 text-xs mt-2">* 3.6% processing fee added at checkout</p>
                  </div>

                  {/* Proceed Button */}
                  <Button
                    className={`w-full py-4 text-lg font-semibold rounded-full transition-all ${
                      !parentEmail.trim() || !childName.trim()
                        ? 'bg-gray-600 cursor-not-allowed text-white/60'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                    onClick={() => {
                      if (parentEmail.trim() && childName.trim()) {
                        setShowContactModal(false);
                        proceedToPayment();
                      }
                    }}
                    disabled={!parentEmail.trim() || !childName.trim() || isLoading || isApplyingCode}
                  >
                    {isLoading ? 'Processing...' : isApplyingCode ? 'Applying code...' : `Proceed to Checkout — $${cartTotal.toFixed(2)}`}
                  </Button>

                  <p className="text-center text-white/40 text-xs">
                    * Use the same email and student name from your Google Form submission
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Deposit -> Full payment switch popup (discount only applies to full payment) */}
      <AnimatePresence>
      {pendingDiscountCode && (
        <motion.div
          variants={backdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            variants={modalPanel}
            initial="hidden"
            animate="show"
            exit="exit"
            className={`w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-2xl ${
            currentLocation === 'wayland'
              ? 'bg-gradient-to-br from-purple-900/95 to-violet-900/95 border-purple-500/30'
              : currentLocation === 'newton-wellesley'
                ? 'bg-gradient-to-br from-emerald-900/95 to-green-900/95 border-emerald-500/30'
                : 'bg-gradient-to-br from-blue-900/95 to-indigo-900/95 border-blue-500/30'
          }`}>
            {switchedToFull ? (
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-300" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Successfully switched!
                </h2>
                <p className="text-white/70 text-sm mt-2">
                  Your deposit is now a full payment and{' '}
                  <span className="font-semibold text-green-300">${pendingDiscountCode.discountDollars} off</span>{' '}
                  has been applied with code{' '}
                  <span className="font-semibold text-white">{pendingDiscountCode.displayCode}</span>.
                </p>
                <Button
                  onClick={handleGoToPaymentAfterSwitch}
                  className="w-full mt-5 py-4 text-lg font-semibold rounded-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Go to payment
                </Button>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-green-300" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">
                      Switch to full payment?
                    </h2>
                    <p className="text-white/70 text-sm mt-1">
                      Code{' '}
                      <span className="font-semibold text-white">{pendingDiscountCode.displayCode}</span>{' '}
                      gives <span className="font-semibold text-green-300">${pendingDiscountCode.discountDollars} off</span>,
                      but the discount only applies to the final (full) payment — not deposits.
                    </p>
                  </div>
                  <button
                    onClick={handleDismissDiscountPopup}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-white/70" />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
                  <p className="text-white/80 text-sm">
                    Switch your deposit to the full payment now to use this code and save{' '}
                    <span className="font-semibold text-green-300">${pendingDiscountCode.discountDollars}</span>.
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <Button
                    onClick={handleCancelSwitchToFull}
                    className="flex-1 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium"
                  >
                    Pay with deposit
                  </Button>
                  <Button
                    onClick={handleConfirmSwitchToFull}
                    className="flex-1 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                  >
                    Switch &amp; save ${pendingDiscountCode.discountDollars}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Checkout transition — cool success checkmark before redirecting to Stripe */}
      <AnimatePresence>
        {checkoutTransition && (
          <motion.div
            variants={backdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-md"
          >
            <motion.div
              variants={modalPanel}
              initial="hidden"
              animate="show"
              exit="exit"
              className="text-center px-8"
            >
              <div className="mx-auto mb-6 w-28 h-28 rounded-full bg-gradient-to-br from-teal-custom to-sky-custom flex items-center justify-center text-white shadow-2xl shadow-teal-500/40">
                <AnimatedCheck size={72} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">You're all set!</h2>
              <p className="text-white/70">Taking you to secure checkout…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
