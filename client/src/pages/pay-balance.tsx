import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence, MotionConfig, type Variants } from "framer-motion";
import {
  Check,
  CreditCard,
  Mail,
  Search,
  AlertCircle,
  CalendarDays,
  GraduationCap,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type BalanceItem = {
  weekId: string;
  weekLabel: string;
  locationName: string;
  fullPriceCents: number;
  depositPaidCents: number;
  balanceDueCents: number;
};

type HistoryItem = {
  weekId: string;
  weekLabel: string;
  locationName: string;
  fullPriceCents: number;
  amountPaidCents: number;
  status: "paid_in_full" | "deposit_paid";
};

type BalanceSummary = {
  parentEmail: string;
  studentName: string;
  signedUpAt: string | null;
  source: "stripe" | "sheet" | "mixed" | "none";
  items: BalanceItem[];
  totalDueCents: number;
  hasBalance: boolean;
  history: HistoryItem[];
  totalPaidCents: number;
};

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatSignupDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// --- Motion presets -------------------------------------------------------
const spring = { type: "spring" as const, stiffness: 320, damping: 30 };

const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const rowItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring },
};

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { ...spring, damping: 26 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18 } },
};

export default function PayBalance() {
  const [email, setEmail] = useState("");
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [payingWeek, setPayingWeek] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [noBalanceMsg, setNoBalanceMsg] = useState("");
  const [paidSuccess, setPaidSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      setPaidSuccess(true);
      window.history.replaceState({}, "", "/pay-balance");
    }
  }, []);

  const handleLookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLookupError("");
    setNoBalanceMsg("");
    setSummary(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setLookupError("Please enter your email address.");
      return;
    }

    setIsLookingUp(true);
    try {
      const res = await fetch(
        `/api/balance-summary?email=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not look up balance");
      }
      if (data.source === "none") {
        // No record at all in Stripe or the registration sheet.
        setNoBalanceMsg(
          "We couldn't find a registration for this email. Make sure you use the same email you registered with.",
        );
      } else {
        // Found them — show the summary screen even when the balance is $0.
        setSummary(data as BalanceSummary);
      }
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLookingUp(false);
    }
  };

  // Each week is paid in its own checkout — multi-week parents check out once
  // per week rather than in one lump sum.
  const handlePay = async (weekId: string) => {
    if (!summary) return;

    setPayingWeek(weekId);
    try {
      const res = await fetch("/api/balance-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentEmail: summary.parentEmail,
          weekIds: [weekId],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not start checkout");
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      toast({
        title: "Payment Error",
        description:
          err instanceof Error ? err.message : "Failed to start checkout",
        variant: "destructive",
      });
      setPayingWeek(null);
    }
  };

  if (paidSuccess) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen">
          <div className="max-w-lg mx-auto px-6 py-20 text-center">
            <motion.div initial="hidden" animate="show" variants={cardReveal}>
              <GlassCard className="p-10">
                <motion.div
                  initial={{ scale: 0, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-custom to-sky-custom flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-500/30"
                >
                  <Check className="text-white" size={40} strokeWidth={3} />
                </motion.div>
                <h1 className="text-2xl font-bold text-teal-custom mb-4">
                  Payment received!
                </h1>
                <p className="text-white/80 mb-6">
                  Your remaining camp balance has been paid. You'll receive a receipt
                  from Stripe shortly — check your spam folder if you don't see it.
                </p>
                <Link href="/">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <GradientButton variant="aqua">Return to Home</GradientButton>
                  </motion.div>
                </Link>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </MotionConfig>
    );
  }

  const signupDate = summary ? formatSignupDate(summary.signedUpAt) : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        <div className="max-w-lg mx-auto px-6 py-16">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, damping: 24 }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 15, delay: 0.05 }}
              className="relative w-16 h-16 mx-auto mb-5"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-500 opacity-30 blur-lg" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-indigo-500/25 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                <CreditCard className="w-7 h-7 text-sky-custom" />
              </div>
            </motion.div>
            <h1 className="gradient-text text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
              Pay Remaining Balance
            </h1>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto">
              Enter the same parent/guardian email you used when you paid your
              deposit. We'll show your remaining balance and take you to secure
              checkout.
            </p>
          </motion.div>

          {/* Lookup card */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, damping: 26, delay: 0.08 }}
          >
            <GlassCard className="p-6 mb-6">
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <Label htmlFor="parent-email" className="text-white/90 text-sm">
                    Parent / Guardian Email
                  </Label>
                  <div className="relative mt-1.5 group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 transition-colors group-focus-within:text-sky-custom" />
                    <Input
                      id="parent-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/30 transition-all focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:border-sky-500/50"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}>
                  <GradientButton
                    type="submit"
                    variant="aqua"
                    className="w-full"
                    disabled={isLookingUp}
                  >
                    {isLookingUp ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    {isLookingUp ? "Checking..." : "Check Balance & Pay"}
                  </GradientButton>
                </motion.div>
              </form>

              <AnimatePresence mode="wait">
                {lookupError && (
                  <motion.div
                    key="err"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-red-200 text-sm">{lookupError}</p>
                    </div>
                  </motion.div>
                )}
                {noBalanceMsg && (
                  <motion.div
                    key="nobal"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-200 text-sm">{noBalanceMsg}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {summary && summary.source !== "none" && (
              <motion.div
                key={summary.parentEmail + summary.hasBalance}
                variants={cardReveal}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <GlassCard className="p-6 space-y-5">
                  {/* Who this is for */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    {summary.studentName && (
                      <span className="flex items-center gap-1.5 text-white/80">
                        <GraduationCap className="w-4 h-4 text-sky-custom" />
                        {summary.studentName}
                      </span>
                    )}
                    {signupDate && (
                      <span className="flex items-center gap-1.5 text-white/50">
                        <CalendarDays className="w-4 h-4" />
                        Registered {signupDate}
                      </span>
                    )}
                  </div>

                  {summary.hasBalance ? (
                    <>
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          Your remaining balance
                        </h2>
                        <p className="text-white/50 text-sm">
                          You've paid your deposit — here's what's left for each week.
                        </p>
                      </div>

                      {summary.items.length > 1 && (
                        <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-100 text-xs">
                          You registered for {summary.items.length} weeks — each
                          week is paid separately, so you'll check out once per
                          week below.
                        </div>
                      )}

                      <motion.div
                        className="space-y-3"
                        variants={listContainer}
                        initial="hidden"
                        animate="show"
                      >
                        {summary.items.map((item) => (
                          <motion.div
                            key={item.weekId}
                            variants={rowItem}
                            className="p-4 rounded-xl bg-white/5 border border-white/10"
                          >
                            <div className="flex justify-between items-start gap-3 mb-3">
                              <div>
                                <p className="text-white font-medium">
                                  {item.locationName} — {item.weekLabel}
                                </p>
                                <p className="text-white/40 text-xs mt-1 tabular-nums">
                                  {formatDollars(item.fullPriceCents)} tuition −{" "}
                                  {formatDollars(item.depositPaidCents)} deposit paid
                                </p>
                              </div>
                              <p className="text-lg font-bold whitespace-nowrap tabular-nums bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">
                                {formatDollars(item.balanceDueCents)}
                              </p>
                            </div>
                            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}>
                              <GradientButton
                                variant="aqua"
                                className="w-full"
                                onClick={() => handlePay(item.weekId)}
                                disabled={payingWeek !== null}
                              >
                                {payingWeek === item.weekId ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <CreditCard className="w-4 h-4 mr-2" />
                                )}
                                {payingWeek === item.weekId
                                  ? "Redirecting to checkout..."
                                  : `Pay ${formatDollars(item.balanceDueCents)} + fee`}
                              </GradientButton>
                            </motion.div>
                          </motion.div>
                        ))}
                      </motion.div>

                      <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                        <span className="text-white/80 font-medium">
                          Total remaining
                        </span>
                        <span className="text-2xl font-bold text-white tabular-nums">
                          {formatDollars(summary.totalDueCents)}
                        </span>
                      </div>

                      <p className="text-white/40 text-xs">
                        A 3.6% card processing fee is added at checkout. To avoid the
                        fee, pay via Zelle or check — email{" "}
                        <a
                          href="mailto:theacappellaworkshop@gmail.com"
                          className="text-sky-custom underline"
                        >
                          theacappellaworkshop@gmail.com
                        </a>
                        .
                      </p>

                      <p className="flex items-center justify-center gap-1.5 text-white/30 text-xs">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Secure checkout powered by Stripe
                      </p>
                    </>
                  ) : (
                    /* Found the registration, but nothing is owed. */
                    <>
                      <div className="flex flex-col items-center text-center py-2">
                        <motion.div
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 240, damping: 15, delay: 0.05 }}
                          className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-custom to-sky-custom flex items-center justify-center mb-4 shadow-lg shadow-teal-500/30"
                        >
                          <Check className="text-white" size={32} strokeWidth={3} />
                        </motion.div>
                        <h2 className="text-xl font-bold text-white mb-1">
                          You're all paid up!
                        </h2>
                        <p className="text-white/50 text-sm">
                          There's no remaining balance on your account. Nothing more to
                          pay.
                        </p>
                      </div>

                      {summary.history.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-3">
                            Purchase history
                          </h3>
                          <motion.div
                            className="space-y-3"
                            variants={listContainer}
                            initial="hidden"
                            animate="show"
                          >
                            {summary.history.map((h) => (
                              <motion.div
                                key={h.weekId}
                                variants={rowItem}
                                className="p-4 rounded-xl bg-white/5 border border-white/10 transition-colors hover:bg-white/[0.08]"
                              >
                                <div className="flex justify-between items-start gap-3">
                                  <div>
                                    <p className="text-white font-medium">
                                      {h.locationName} — {h.weekLabel}
                                    </p>
                                    <span
                                      className={`inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full ${
                                        h.status === "paid_in_full"
                                          ? "bg-teal-500/20 text-teal-200 border border-teal-500/30"
                                          : "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                                      }`}
                                    >
                                      {h.status === "paid_in_full" && (
                                        <Check className="w-3 h-3" strokeWidth={3} />
                                      )}
                                      {h.status === "paid_in_full"
                                        ? "Paid in full"
                                        : "Deposit paid"}
                                    </span>
                                  </div>
                                  <p className="text-lg font-bold text-teal-custom whitespace-nowrap tabular-nums">
                                    {formatDollars(h.amountPaidCents)}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        </div>
                      )}

                      <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                        <span className="text-white/80 font-medium">Total paid</span>
                        <span className="text-2xl font-bold text-white tabular-nums">
                          {formatDollars(summary.totalPaidCents)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/60">Balance remaining</span>
                        <span className="text-white/80 font-semibold tabular-nums">
                          {formatDollars(0)}
                        </span>
                      </div>
                    </>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-white/40 text-xs mt-8">
            Questions? Email{" "}
            <a
              href="mailto:theacappellaworkshop@gmail.com"
              className="text-sky-custom underline"
            >
              theacappellaworkshop@gmail.com
            </a>
          </p>
        </div>
      </div>
    </MotionConfig>
  );
}
