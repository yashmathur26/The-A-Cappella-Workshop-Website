import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { CartManager, type CartItem } from '@/lib/cart';
import { WEEKS } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { PaymentOptions } from '@/components/PaymentOptions';
import { useLocation } from 'wouter';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, X } from "lucide-react";

export default function Register() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [registrationIds, setRegistrationIds] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState(CartManager.getPromoCode());
  const [promoError, setPromoError] = useState("");
  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setCart(CartManager.getCart());
    setPromoCode(CartManager.getPromoCode());
    
    const handleStorageChange = () => {
      setCart(CartManager.getCart());
      setPromoCode(CartManager.getPromoCode());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cartUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleStorageChange);
    };
  }, []);

  const addWeekToCart = (weekId: string, paymentType: 'full' | 'deposit') => {
    CartManager.addToCart(weekId, paymentType);
    setCart(CartManager.getCart());
    window.dispatchEvent(new Event('cartUpdated'));
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

  const handlePromoCodeSubmit = () => {
    if (!promoCode.trim()) {
      setPromoError("");
      CartManager.removePromoCode();
      return;
    }
    
    const isValid = CartManager.setPromoCode(promoCode.trim());
    if (isValid) {
      setPromoError("");
      toast({
        title: "Promo code applied!",
        description: `You saved $${CartManager.getDiscountAmount()} with code ${promoCode.toUpperCase()}`,
      });
    } else {
      setPromoError("Invalid promo code");
    }
  };

  const handleRemovePromo = () => {
    CartManager.removePromoCode();
    setPromoCode("");
    setPromoError("");
    toast({
      title: "Promo code removed",
    });
  };

  const proceedToPayment = async () => {
    if (cart.length === 0) return;
    
    if (!parentName.trim() || !childName.trim()) {
      toast({
        title: "Names required",
        description: "Please enter both parent and child names before checkout.",
        variant: "destructive",
      });
      return;
    }
    
    // Go directly to Stripe checkout for both authenticated and guest users
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/create-checkout-session', {
        cartItems: cart,
        promoCode: CartManager.getPromoCode(),
        parentName: parentName.trim(),
        childName: childName.trim(),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
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

  const handleSignInFirst = () => {
    setLocation("/login");
  };

  const cartItems = CartManager.getCartItems();
  const cartSubtotal = CartManager.getCartSubtotal();
  const discountAmount = CartManager.getDiscountAmount();
  const cartTotal = CartManager.getCartTotal();
  const hasDiscount = discountAmount > 0;

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
        <h1 className="text-4xl lg:text-5xl font-bold text-center mb-8 gradient-text">Register for Summer 2026</h1>
        
        {/* Payment Options Explanation */}
        <GlassCard className="p-6 mb-12">
          <h2 className="text-xl font-bold mb-4 text-sky-custom">Payment Options</h2>
          <div className="space-y-3 text-white/90">
            <div className="flex items-start space-x-3">
              <span className="text-teal-custom font-bold">💳</span>
              <div>
                <p className="font-semibold">Pay in Full ($500/week)</p>
                <p className="text-sm text-white/70">Complete payment today — no additional fees or invoices</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-sky-custom font-bold">📄</span>
              <div>
                <p className="font-semibold">Pay Deposit ($150/week)</p>
                <p className="text-sm text-white/70">Secure your spot with a non-refundable deposit. We'll email you an invoice for the remaining $350, also available in your account dashboard.</p>
              </div>
            </div>
          </div>
        </GlassCard>
        
        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Step 1: Choose Weeks */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-teal-custom">Step 1 — Choose Your Week(s)</h2>
              <p className="text-white/80 mb-6">Select your preferred weeks and payment option. You can either pay the full amount or secure your spot with a $150 deposit and pay the remaining $350 later through email invoice or your account dashboard.</p>
              <div className="grid gap-6">
                {WEEKS.map((week, index) => (
                  <GlassCard 
                    key={week.id} 
                    className={`p-6 week-card ${CartManager.isInCart(week.id) ? 'selected' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-teal-custom">Week {index + 1}</h3>
                        <p className="text-white/90">{week.label}</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <span className="text-sm text-sky-custom/80">{week.spots} spots remaining</span>
                    </div>
                    
                    {/* Payment Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-white">Full Payment</span>
                          <span className="text-xl font-bold text-sky-custom">${week.price}</span>
                        </div>
                        <p className="text-xs text-white/60 mb-3">Pay today, no additional fees</p>
                        <GradientButton
                          variant={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full' ? 'ghost' : 'primary'}
                          size="sm"
                          className="w-full"
                          disabled={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit'}
                          onClick={() => {
                            if (CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full') {
                              removeWeekFromCart(week.id);
                            } else {
                              addWeekToCart(week.id, 'full');
                            }
                          }}
                        >
                          {CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full' ? 'Remove' : 'Add to Cart'}
                        </GradientButton>
                      </div>
                      
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-white">Deposit</span>
                          <span className="text-xl font-bold text-teal-custom">$150</span>
                        </div>
                        <p className="text-xs text-white/60 mb-3">$350 remaining via invoice</p>
                        <GradientButton
                          variant={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit' ? 'ghost' : 'primary'}
                          size="sm"
                          className="w-full"
                          disabled={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full'}
                          onClick={() => {
                            if (CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit') {
                              removeWeekFromCart(week.id);
                            } else {
                              addWeekToCart(week.id, 'deposit');
                            }
                          }}
                        >
                          {CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit' ? 'Remove' : 'Add to Cart'}
                        </GradientButton>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </section>

            {/* Step 2: Registration Form - Only show after weeks are selected */}
            {showForm && (
              <section>
                <h2 className="text-2xl font-bold mb-6 text-teal-custom">Step 2 — Complete Registration Form</h2>
                <GlassCard className="p-6">
                  <p className="text-white/80 mb-4">Please fill out your student information below.</p>
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
            )}
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
                      <div>
                        <span className="text-white/90">{item.label}</span>
                        <span className="ml-2 text-xs px-2 py-1 rounded bg-white/10 text-white/70">
                          {item.paymentType === 'deposit' ? 'Deposit' : 'Full Payment'}
                        </span>
                      </div>
                      <span className="text-white/90">${item.price}</span>
                    </div>
                  ))
                )}
              </div>
              
              {/* Promo Code Section */}
              {cartItems.length > 0 && (
                <div className="mb-6">
                  <Label className="text-white text-sm mb-2 block">Promo Code</Label>
                  <div className="flex space-x-2">
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter promo code"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handlePromoCodeSubmit()}
                    />
                    {CartManager.getPromoCode() ? (
                      <button
                        onClick={handleRemovePromo}
                        className="px-3 py-2 bg-red-500/20 border border-red-400/30 text-red-200 rounded hover:bg-red-500/30 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={handlePromoCodeSubmit}
                        className="px-3 py-2 bg-sky-custom/20 border border-sky-custom/30 text-sky-200 rounded hover:bg-sky-custom/30 transition-colors"
                      >
                        <Tag size={16} />
                      </button>
                    )}
                  </div>
                  {promoError && (
                    <p className="text-red-400 text-xs mt-1">{promoError}</p>
                  )}
                  {CartManager.getPromoCode() && (
                    <p className="text-green-400 text-xs mt-1">
                      Code "{CartManager.getPromoCode()}" applied!
                    </p>
                  )}
                </div>
              )}
              
              {/* Names Section */}
              {cartItems.length > 0 && showForm && (
                <div className="mb-6 space-y-4">
                  <div>
                    <Label className="text-white text-sm mb-2 block">Parent/Guardian Name</Label>
                    <Input
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Enter parent name"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label className="text-white text-sm mb-2 block">Child's Name</Label>
                    <Input
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      placeholder="Enter child's name"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>
              )}
              
              <div className="border-t border-white/20 pt-4">
                {hasDiscount && (
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between text-white/80">
                      <span>Subtotal:</span>
                      <span>${cartSubtotal}</span>
                    </div>
                    <div className="flex justify-between text-green-400">
                      <span>Discount ({CartManager.getPromoCode()}):</span>
                      <span>-${discountAmount}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold mb-6">
                  <span className="text-white">Total:</span>
                  <span className="text-white">${cartTotal}</span>
                </div>
                <div className="space-y-3">
                  {!showForm ? (
                    <GradientButton
                      className="w-full"
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
                      Proceed to Registration Form
                    </GradientButton>
                  ) : (
                    <>
                      {isAuthenticated ? (
                        <GradientButton
                          className="w-full"
                          onClick={proceedToPayment}
                          disabled={cart.length === 0 || isLoading}
                        >
                          {isLoading ? 'Processing...' : 'Choose Payment Option'}
                        </GradientButton>
                      ) : (
                        <>
                          <GradientButton
                            className="w-full"
                            onClick={proceedToPayment}
                            disabled={cart.length === 0 || isLoading}
                          >
                            {isLoading ? 'Processing...' : 'Pay as Guest'}
                          </GradientButton>
                          <GradientButton
                            variant="ghost"
                            className="w-full bg-transparent border border-white/20 text-white hover:bg-white/10"
                            onClick={handleSignInFirst}
                            disabled={cart.length === 0}
                          >
                            Sign In for Account Benefits
                          </GradientButton>
                        </>
                      )}
                    </>
                  )}
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

        {/* Payment Options Modal for Authenticated Users */}
        {showPayment && isAuthenticated && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <PaymentOptions
                registrationIds={[]} // No registrations yet for new users
                totalAmount={cartTotal}
                onCancel={() => setShowPayment(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
