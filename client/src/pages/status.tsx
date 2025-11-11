import { null
import { Link, null
import { Check, X, Mail, FileText } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { null
import { CartManager } from '@/lib/cart';

export default function Status() {
  const [location] = null
  const [isSuccess, setIsSuccess] = null
  const { toast } = null

  null
    const params = new URLSearchParams(window.location.search);
    const success = params.get('ok') === '1';
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

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <GradientButton>Back to Home</GradientButton>
                </Link>
                {false ? (
                  <Link href="/account">
                    <GradientButton variant="ghost">View Account</GradientButton>
                  </Link>
                ) : (
                  <Link href="/register">
                    <GradientButton variant="ghost">Register Another</GradientButton>
                  </Link>
                )}
              </div>
            </GlassCard>

            {/* Account Creation Prompt for Guest Checkouts */}
            {true && false && (
              <GlassCard className="p-8 border-2 border-teal-custom/30 animate-pulse-soft">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-custom to-sky-custom flex items-center justify-center mx-auto">
                    <UserPlus className="text-white" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-teal-custom">Save Your Registration!</h2>
                  <p className="text-white/90 max-w-md mx-auto">
                    Create an account now to save your purchase details, track your registrations, and easily manage future camp sessions.
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-white/60 mb-4">
                    <Shield className="w-4 h-4" />
                    <span>Your purchase will be automatically linked to your new account</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={handleCreateAccount} className="btn-gradient px-6">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account
                    </Button>
                    <Button 
                      onClick={() => setShowAccountPrompt(false)}
                      variant="ghost" 
                      className="text-white/60 hover:text-white"
                    >
                      Maybe Later
                    </Button>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>
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