import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Check, X, Mail, FileText } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { CartManager } from '@/lib/cart';

export default function Status() {
  const [location] = useLocation();
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Success when Stripe redirects with ok=1, or when session_id is present (legacy/redirect)
    const success = params.get('ok') === '1' || !!params.get('session_id');
    setIsSuccess(success);
    
    // Clear cart on successful payment
    if (success) {
      CartManager.clearCart();
      console.log('🛒 Cart cleared after successful payment');
      
      // Force navigation to update cart count immediately
      window.dispatchEvent(new Event('cartUpdated'));
      // Also trigger storage event for cross-tab compatibility
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'acappella-cart',
        newValue: null,
        oldValue: localStorage.getItem('acappella-cart')
      }));
    }
  }, [location]);

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        {isSuccess ? (
          <div className="space-y-6">
            <GlassCard className="p-12">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-custom to-sky-custom flex items-center justify-center mx-auto mb-6">
                <Check className="text-white" size={48} />
              </div>
              <h1 className="text-3xl font-bold mb-6 text-teal-custom">Thank you for signing up! ✅</h1>
              <p className="text-white/90 mb-6 text-lg">Your registration has been successfully completed and your payment has been processed.</p>
              
              {/* Receipt and Future Information Section */}
              <div className="bg-white/5 rounded-lg p-6 mb-6 space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Payment Receipt</h3>
                    <p className="text-white/70 text-sm">
                      You'll receive a payment receipt from Stripe in your email shortly. 
                      <span className="text-orange-300"> Check your spam folder</span> if you don't see it in your inbox.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">What's Next?</h3>
                    <p className="text-white/70 text-sm">
                      We'll send you additional forms and camp information closer to your session date. 
                      Keep an eye on your email for important updates and preparation materials.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Link href="/">
                  <GradientButton className="w-full sm:w-auto">Return to Home</GradientButton>
                </Link>
              </div>
            </GlassCard>
          </div>
        ) : (
          <div className="space-y-6">
            <GlassCard className="p-12">
              <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                <X className="text-red-400" size={48} />
              </div>
              <h1 className="text-3xl font-bold mb-4 text-white">Payment Cancelled</h1>
              <p className="text-white/70 mb-8">
                Your payment was cancelled. No charges have been made to your account.
              </p>
              <div className="space-y-4">
                <Link href="/camp-registration">
                  <GradientButton className="w-full sm:w-auto">Try Again</GradientButton>
                </Link>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
