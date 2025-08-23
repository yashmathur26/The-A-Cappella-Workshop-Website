import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Check, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { CartManager } from '@/lib/cart';

export default function Status() {
  const [location] = useLocation();
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('ok') === '1';
    setIsSuccess(success);
    
    // Clear cart on successful payment
    if (success) {
      CartManager.clearCart();
      console.log('🛒 Cart cleared after successful payment');
    }
  }, [location]);

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        {isSuccess ? (
          <GlassCard className="p-12">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-custom to-sky-custom flex items-center justify-center mx-auto mb-6">
              <Check className="text-white" size={48} />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-teal-custom">Thank you for signing up! ✅</h1>
            <p className="text-white/90 mb-4 text-lg">Your registration has been successfully completed and your payment has been processed.</p>
            <p className="text-sky-custom mb-8">We will send a confirmation email confirming your payment and registration details shortly.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <GradientButton>Back to Home</GradientButton>
              </Link>
              <Link href="/register">
                <GradientButton variant="ghost">Register Another</GradientButton>
              </Link>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-12">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-400 flex items-center justify-center mx-auto mb-6">
              <X className="text-white" size={48} />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-red-400">Payment canceled or failed</h1>
            <p className="text-white/80 mb-8">Please try again or contact us if you continue to experience issues.</p>
            <Link href="/register">
              <GradientButton size="lg">Try Again</GradientButton>
            </Link>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
