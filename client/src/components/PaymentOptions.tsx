import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, AlertCircle } from "lucide-react";

interface PaymentOptionsProps {
  registrationIds: string[];
  totalAmount: number;
  onCancel: () => void;
}

export function PaymentOptions({ registrationIds, totalAmount, onCancel }: PaymentOptionsProps) {
  const [paymentType, setPaymentType] = useState<"full" | "deposit">("full");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkoutMutation = useMutation({
    mutationFn: async (data: { registrationIds: string[]; paymentType: "full" | "deposit" }) => {
      const response = await apiRequest("POST", "/api/checkout", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  const depositAmount = Math.round(totalAmount * 0.3); // $150 per $500 registration
  const remainingBalance = totalAmount - depositAmount;

  const handlePayment = () => {
    checkoutMutation.mutate({
      registrationIds,
      paymentType,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/20 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-sky-custom" />
            Choose Payment Option
          </CardTitle>
          <CardDescription className="text-white/60">
            Select how you'd like to pay for your camp registration(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={paymentType} onValueChange={(value) => setPaymentType(value as "full" | "deposit")}>
            {/* Full Payment Option */}
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full" className="flex-1 cursor-pointer">
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-white font-semibold">Pay in Full</h3>
                        <p className="text-white/60 text-sm">Complete payment today</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                        Save Money
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">${totalAmount}</span>
                      <span className="text-green-400 text-sm">✓ No additional fees</span>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            </div>

            {/* Deposit Option */}
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="deposit" id="deposit" />
              <Label htmlFor="deposit" className="flex-1 cursor-pointer">
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-white font-semibold">Pay Deposit</h3>
                        <p className="text-white/60 text-sm">Secure your spot with a deposit</p>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        Popular
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-white">${depositAmount}</span>
                        <span className="text-white/60 text-sm">Today</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/80">Remaining balance:</span>
                        <span className="text-orange-400 font-semibold">${remainingBalance}</span>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mt-2">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                          <div className="text-orange-300 text-xs">
                            <p className="font-medium mb-1">Non-refundable deposit</p>
                            <p>We'll email you an invoice for the remaining ${remainingBalance}, which will also be available in your account dashboard.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            </div>
          </RadioGroup>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Payment Methods Accepted</h4>
            <div className="flex flex-wrap gap-2 text-sm text-white/60">
              <span className="bg-white/10 px-2 py-1 rounded">💳 Credit/Debit Cards</span>
              <span className="bg-white/10 px-2 py-1 rounded">🏦 Bank Transfer</span>
              <span className="bg-white/10 px-2 py-1 rounded">📱 Apple Pay</span>
              <span className="bg-white/10 px-2 py-1 rounded">📱 Google Pay</span>
              <span className="bg-white/10 px-2 py-1 rounded">💙 PayPal</span>
              <span className="bg-white/10 px-2 py-1 rounded">💜 Venmo</span>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              className="flex-1 btn-gradient"
              disabled={checkoutMutation.isPending}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {checkoutMutation.isPending 
                ? "Processing..." 
                : `Pay ${paymentType === "full" ? `$${totalAmount}` : `$${depositAmount} Deposit`}`
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}