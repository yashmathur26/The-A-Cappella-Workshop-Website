import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { CartManager } from '@/lib/cart';
import { WEEKS } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Register() {
  const [cart, setCart] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCart(CartManager.getCart());
    
    const handleStorageChange = () => {
      setCart(CartManager.getCart());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cartUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleStorageChange);
    };
  }, []);

  const toggleWeek = (weekId: string) => {
    if (cart.includes(weekId)) {
      CartManager.removeFromCart(weekId);
    } else {
      CartManager.addToCart(weekId);
    }
    setCart(CartManager.getCart());
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const clearCart = () => {
    CartManager.clearCart();
    setCart([]);
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const proceedToPayment = async () => {
    if (cart.length === 0) return;
    
    setIsLoading(true);
    try {
      const selectedWeeks = WEEKS.filter(week => cart.includes(week.id)).map(week => week.label);
      
      const response = await apiRequest('POST', '/api/create-checkout-session', {
        weeks: selectedWeeks
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cartItems = CartManager.getCartItems();
  const cartTotal = CartManager.getCartTotal();

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

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h1 className="text-4xl lg:text-5xl font-bold text-center mb-16 gradient-text">Register for Summer 2026</h1>
        
        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Step 1: Student Information */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-white">Step 1 — Student Information</h2>
              <GlassCard className="p-6">
                <p className="text-white/80 mb-4">Submit the form, then pick your week(s) below.</p>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <iframe 
                    src="https://docs.google.com/forms/d/e/1FAIpQLSfU3ReIcBMTJge0QnuX-G1JaQo9av-pqt7AGHGA7PclvlRfKg/viewform?embedded=true" 
                    width="100%" 
                    height="400" 
                    frameBorder="0" 
                    marginHeight={0}
                    marginWidth={0}
                    className="rounded"
                  >
                    Loading…
                  </iframe>
                </div>
              </GlassCard>
            </section>

            {/* Step 2: Choose Weeks */}
            <section>
              <h2 className="text-2xl font-bold mb-6 text-white">Step 2 — Choose Your Week(s)</h2>
              <div className="grid gap-6">
                {WEEKS.map((week, index) => (
                  <GlassCard 
                    key={week.id} 
                    className={`p-6 week-card ${cart.includes(week.id) ? 'selected' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">Week {index + 1}</h3>
                        <p className="text-white/80">{week.label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold gradient-text">${week.price}</p>
                      </div>
                    </div>
                    <p className="text-white/70 mb-4">Learn, rehearse, and perform — perfect for beginners and returning singers.</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/60">{week.spots} spots remaining</span>
                      <GradientButton
                        variant={cart.includes(week.id) ? 'ghost' : 'primary'}
                        size="sm"
                        onClick={() => toggleWeek(week.id)}
                      >
                        {cart.includes(week.id) ? 'Remove' : 'Add to Cart'}
                      </GradientButton>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </section>
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1 mt-12 lg:mt-0">
            <GlassCard className="p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-6 text-white">Your Cart</h3>
              <div className="space-y-3 mb-6">
                {cartItems.length === 0 ? (
                  <p className="text-white/60">No weeks selected</p>
                ) : (
                  cartItems.map(item => (
                    <div key={item.weekId} className="flex justify-between items-center text-sm">
                      <span className="text-white/90">{item.label}</span>
                      <span className="text-white/90">${item.price}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-white/20 pt-4">
                <div className="flex justify-between text-lg font-semibold mb-6">
                  <span className="text-white">Total:</span>
                  <span className="text-white">${cartTotal}</span>
                </div>
                <div className="space-y-3">
                  <GradientButton
                    className="w-full"
                    onClick={proceedToPayment}
                    disabled={cart.length === 0 || isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Proceed to Payment'}
                  </GradientButton>
                  <GradientButton
                    variant="ghost"
                    className="w-full"
                    onClick={clearCart}
                  >
                    Clear Cart
                  </GradientButton>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
