import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Check, CreditCard, Mail, Search, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type BalanceItem = {
  registrationId: string;
  childName: string;
  weekId: string;
  weekLabel: string;
  locationName: string;
  depositPaidCents: number;
  balanceDueCents: number;
  paymentType: string;
};

type BalanceSummary = {
  parentEmail: string;
  items: BalanceItem[];
  totalDueCents: number;
  hasBalance: boolean;
};

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PayBalance() {
  const [email, setEmail] = useState("");
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [lookupError, setLookupError] = useState("");
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
      setSummary(data as BalanceSummary);
      if (!data.hasBalance) {
        setLookupError(
          "No outstanding balance found for this email. If you paid in full already, you're all set!",
        );
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
          registrationIds: summary.items.map((i) => i.registrationId),
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
              <GradientButton>Return to Home</GradientButton>
            </Link>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-7 h-7 text-sky-custom" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Pay Remaining Balance</h1>
          <p className="text-white/60 text-sm">
            Enter the parent/guardian email you used when registering. We'll show
            any outstanding deposit balances for all camp weeks.
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
              className="w-full"
              disabled={isLookingUp}
            >
              <Search className="w-4 h-4 mr-2" />
              {isLookingUp ? "Looking up..." : "Find My Balance"}
            </GradientButton>
          </form>

          {lookupError && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-200 text-sm">{lookupError}</p>
            </div>
          )}
        </GlassCard>

        {summary?.hasBalance && (
          <GlassCard className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Outstanding balances</h2>
            <div className="space-y-3">
              {summary.items.map((item) => (
                <div
                  key={item.registrationId}
                  className="p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="text-white font-medium">{item.childName}</p>
                      <p className="text-white/60 text-sm">
                        {item.locationName} — {item.weekLabel}
                      </p>
                      <p className="text-white/40 text-xs mt-1">
                        Deposit paid: {formatDollars(item.depositPaidCents)}
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
              A 3.6% card processing fee is added at checkout. To avoid the fee,
              pay via Zelle or check — email{" "}
              <a
                href="mailto:theacappellaworkshop@gmail.com"
                className="text-sky-custom underline"
              >
                theacappellaworkshop@gmail.com
              </a>
              .
            </p>

            <GradientButton
              className="w-full"
              onClick={handlePay}
              disabled={isPaying}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isPaying
                ? "Redirecting to checkout..."
                : `Pay ${formatDollars(summary.totalDueCents)} + processing fee`}
            </GradientButton>
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
