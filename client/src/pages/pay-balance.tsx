import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Check,
  CreditCard,
  Mail,
  Search,
  AlertCircle,
  CalendarDays,
  GraduationCap,
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

export default function PayBalance() {
  const [email, setEmail] = useState("");
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
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

  const handlePay = async () => {
    if (!summary?.hasBalance) return;

    setIsPaying(true);
    try {
      const res = await fetch("/api/balance-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentEmail: summary.parentEmail,
          weekIds: summary.items.map((i) => i.weekId),
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
      setIsPaying(false);
    }
  };

  if (paidSuccess) {
    return (
      <div className="min-h-screen">
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <GlassCard className="p-10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-custom to-sky-custom flex items-center justify-center mx-auto mb-6">
              <Check className="text-white" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-teal-custom mb-4">
              Payment received!
            </h1>
            <p className="text-white/80 mb-6">
              Your remaining camp balance has been paid. You'll receive a receipt
              from Stripe shortly — check your spam folder if you don't see it.
            </p>
            <Link href="/">
              <GradientButton variant="aqua">Return to Home</GradientButton>
            </Link>
          </GlassCard>
        </div>
      </div>
    );
  }

  const signupDate = summary ? formatSignupDate(summary.signedUpAt) : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-7 h-7 text-sky-custom" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Pay Remaining Balance</h1>
          <p className="text-white/60 text-sm">
            Enter the same parent/guardian email you used when you paid your
            deposit. We'll show your remaining balance and take you to secure
            checkout.
          </p>
        </div>

        <GlassCard className="p-6 mb-6">
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <Label htmlFor="parent-email" className="text-white/90 text-sm">
                Parent / Guardian Email
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="parent-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/30"
                  autoComplete="email"
                />
              </div>
            </div>
            <GradientButton
              type="submit"
              variant="aqua"
              className="w-full"
              disabled={isLookingUp}
            >
              <Search className="w-4 h-4 mr-2" />
              {isLookingUp ? "Checking..." : "Check Balance & Pay"}
            </GradientButton>
          </form>

          {lookupError && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{lookupError}</p>
            </div>
          )}
          {noBalanceMsg && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-200 text-sm">{noBalanceMsg}</p>
            </div>
          )}
        </GlassCard>

        {summary && summary.source !== "none" && (
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

                <div className="space-y-3">
                  {summary.items.map((item) => (
                    <div
                      key={item.weekId}
                      className="p-4 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <p className="text-white font-medium">
                            {item.locationName} — {item.weekLabel}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            {formatDollars(item.fullPriceCents)} tuition −{" "}
                            {formatDollars(item.depositPaidCents)} deposit paid
                          </p>
                        </div>
                        <p className="text-lg font-bold text-sky-custom whitespace-nowrap">
                          {formatDollars(item.balanceDueCents)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                  <span className="text-white/80 font-medium">Total due</span>
                  <span className="text-2xl font-bold text-white">
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

                <GradientButton
                  variant="aqua"
                  className="w-full"
                  onClick={handlePay}
                  disabled={isPaying}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {isPaying
                    ? "Redirecting to checkout..."
                    : `Pay ${formatDollars(summary.totalDueCents)} + processing fee`}
                </GradientButton>
              </>
            ) : (
              /* Found the registration, but nothing is owed. */
              <>
                <div className="flex flex-col items-center text-center py-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-custom to-sky-custom flex items-center justify-center mb-4">
                    <Check className="text-white" size={32} />
                  </div>
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
                    <div className="space-y-3">
                      {summary.history.map((h) => (
                        <div
                          key={h.weekId}
                          className="p-4 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <p className="text-white font-medium">
                                {h.locationName} — {h.weekLabel}
                              </p>
                              <span
                                className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                                  h.status === "paid_in_full"
                                    ? "bg-teal-500/20 text-teal-200 border border-teal-500/30"
                                    : "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                                }`}
                              >
                                {h.status === "paid_in_full"
                                  ? "Paid in full"
                                  : "Deposit paid"}
                              </span>
                            </div>
                            <p className="text-lg font-bold text-teal-custom whitespace-nowrap">
                              {formatDollars(h.amountPaidCents)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                  <span className="text-white/80 font-medium">Total paid</span>
                  <span className="text-2xl font-bold text-white">
                    {formatDollars(summary.totalPaidCents)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60">Balance remaining</span>
                  <span className="text-white/80 font-semibold">
                    {formatDollars(0)}
                  </span>
                </div>
              </>
            )}
          </GlassCard>
        )}

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
  );
}
