import { useState, useEffect, useRef } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { CartManager, type CartItem } from '@/lib/cart';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation as useWouterLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tag, X, AlertTriangle, MapPin, ShoppingCart } from "lucide-react";
import { useLocation } from '@/contexts/LocationContext';


export default function Register() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [registrationIds, setRegistrationIds] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState(CartManager.getPromoCode());
  const [promoError, setPromoError] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [childName, setChildName] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<'none' | 'pending' | 'completed' | 'incomplete'>('none');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
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
  const { toast } = useToast();
  const [, setWouterLocation] = useWouterLocation();
  const { currentLocation, locationData } = useLocation();

  // Get location-specific weeks and pricing
  const WEEKS = locationData[currentLocation].weeks;
  const locationPricing = locationData[currentLocation].pricing;


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

  // Poll for form submission status
  useEffect(() => {
    if (showForm && !formSubmitted) {
      const checkFormStatus = async () => {
        try {
          const response = await fetch(`/api/check-form-status/${sessionId}`);
          const data = await response.json();
          if (data.submitted) {
            setFormSubmitted(true);
            toast({
              title: "Form Received! ✅",
              description: "Your registration form has been submitted. You can now proceed to checkout.",
            });
            if (formCheckIntervalRef.current) {
              clearInterval(formCheckIntervalRef.current);
            }
          }
        } catch (error) {
          console.error('Error checking form status:', error);
        }
      };

      // Check immediately
      checkFormStatus();
      
      // Then check every 3 seconds
      formCheckIntervalRef.current = setInterval(checkFormStatus, 3000);
    }

    return () => {
      if (formCheckIntervalRef.current) {
        clearInterval(formCheckIntervalRef.current);
      }
    };
  }, [showForm, formSubmitted, sessionId, toast]);

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
    
    // Check if form has been submitted
    if (!formSubmitted) {
      toast({
        title: "Registration Form Required",
        description: "Please complete the registration form above before proceeding to checkout.",
        variant: "destructive",
      });
      return;
    }
    
    // Require contact info for guest checkout
    if (!parentName.trim() || !parentEmail.trim() || !childName.trim()) {
      toast({
        title: "Contact information required",
        description: "Please enter parent name, email, and child name before checkout.",
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
    
    // Go directly to Stripe checkout
    setIsLoading(true);
    setPaymentStatus('pending');
    
    try {
      const response = await apiRequest('POST', '/api/create-checkout-session', {
        cartItems: cart,
        promoCode: CartManager.getPromoCode(),
        parentName: parentName.trim(),
        parentEmail: parentEmail.trim(),
        childName: childName.trim(),
        locationName: locationData[currentLocation].name,
      });
      
      const data = await response.json();
      
      if (data.url) {
        // Always redirect in the same window for cleaner UX
        window.location.href = data.url;
        
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
    <div className="min-h-screen pb-24 lg:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h1 className={`text-4xl lg:text-5xl font-bold text-center mb-8 ${currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text'}`}>Register for Summer 2026</h1>
        
        {/* Payment Status Messages */}
        {paymentStatus === 'pending' && (
          <GlassCard className="p-6 mb-8">
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
          <GlassCard className="p-6 mb-8">
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
          <GlassCard className="p-6 mb-8">
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
        <GlassCard className="p-6 mb-12">
          <h2 className={`text-xl font-bold mb-4 ${currentLocation === 'wayland' ? 'text-purple-400' : currentLocation === 'newton-wellesley' ? 'text-emerald-400' : 'text-sky-custom'}`}>Payment Options</h2>
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
                <p className="text-sm text-white/70">Secure your spot with a non-refundable deposit. We'll email you an invoice for the remaining ${locationData[currentLocation].pricing.full - locationData[currentLocation].pricing.deposit}, also available in your account dashboard.</p>
              </div>
            </div>
          </div>
        </GlassCard>
        
        <div className="lg:grid lg:grid-cols-3 lg:gap-8 xl:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8 lg:space-y-12">
            {/* Step 1: Choose Weeks */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">Step 1 — Choose Your Week(s)</h2>
              <p className="text-white/80 mb-6">Select ur preferred weeks and payment option.</p>
              <div className="grid gap-6">
                {WEEKS.map((week, index) => (
                  <GlassCard 
                    key={week.id} 
                    className={`p-6 week-card ${CartManager.isInCart(week.id) ? 'selected' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">Week {index + 1}: <span className="font-normal">{week.label}</span></h3>
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
                    <div className="mb-4">
                      <span className="text-sm text-white/80">{week.spots}/20 spots</span>
                    </div>
                    
                    {/* Payment Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-white">Full Payment</span>
                          <span className="text-xl font-bold text-white">${week.price}</span>
                        </div>
                        <p className="text-xs text-white/60 mb-3">Pay today, no additional fees</p>
                        <Button
                          variant={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full' ? 'outline' : 'default'}
                          size="sm"
                          className={`w-full py-2.5 text-sm font-medium min-h-[44px] rounded-full transition-all ${
                            CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full' 
                              ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                              : currentLocation === 'wayland' ? 'bg-purple-600 hover:bg-purple-700 text-white border-0' : currentLocation === 'newton-wellesley' ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-0' : 'bg-teal-600 hover:bg-teal-700 text-white border-0'
                          }`}
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
                        </Button>
                      </div>
                      
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-white">Deposit</span>
                          <span className="text-xl font-bold text-white">$150</span>
                        </div>
                        <p className="text-xs text-white/60 mb-3">${week.price - 150} remaining via invoice</p>
                        <Button
                          variant={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit' ? 'outline' : 'default'}
                          size="sm"
                          className={`w-full py-2.5 text-sm font-medium min-h-[44px] rounded-full transition-all ${
                            CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit' 
                              ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                              : currentLocation === 'wayland' ? 'bg-violet-600 hover:bg-violet-700 text-white border-0' : currentLocation === 'newton-wellesley' ? 'bg-green-600 hover:bg-green-700 text-white border-0' : 'bg-sky-600 hover:bg-sky-700 text-white border-0'
                          }`}
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
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </section>

            {/* Step 2: Registration Form - Only show after weeks are selected */}
            {showForm && (
              <section>
                <h2 className="text-2xl font-bold mb-6 text-white">Step 2 — Complete Registration Form</h2>
                
                {/* Form Submission Status */}
                <GlassCard className={`p-4 mb-4 ${formSubmitted ? 'bg-green-500/10 border-green-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formSubmitted ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                      {formSubmitted ? (
                        <span className="text-green-400 text-xl">✓</span>
                      ) : (
                        <span className="text-blue-400 text-xl">📝</span>
                      )}
                    </div>
                    <div className="flex-1">
                      {formSubmitted ? (
                        <>
                          <p className="text-green-400 font-semibold">Form Submitted Successfully!</p>
                          <p className="text-green-300/80 text-sm">You can now proceed to checkout</p>
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
                  <p className="text-white/80 mb-4">Please fill out your student information below.</p>
                  
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
                    <iframe 
                      src="https://docs.google.com/forms/d/e/1FAIpQLSdHXYEXmGe39_L3Uq8f-T0653oFF2DEGLQMBDgN0vDC4ox1hA/viewform?embedded=true" 
                      width="100%" 
                      height="3729" 
                      frameBorder="0" 
                      marginHeight={0}
                      marginWidth={0}
                      className="rounded"
                    >
                      Loading…
                    </iframe>
                  </div>

                  {!formSubmitted && (
                    <Button
                      onClick={() => {
                        setFormSubmitted(true);
                        toast({
                          title: "Form Confirmed! ✅",
                          description: "You can now proceed to checkout.",
                        });
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      I've Submitted the Form — Proceed to Checkout
                    </Button>
                  )}
                </GlassCard>
              </section>
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
                  cartItems.map(item => (
                    <div key={item.weekId} className="flex justify-between items-center text-sm bg-white/5 rounded-lg p-3 border border-white/10">
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
                      <button
                        onClick={() => removeWeekFromCart(item.weekId)}
                        className="ml-3 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                        title="Remove from cart"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              {/* Promo Code Section */}
              {cartItems.length > 0 && (
                <div className="mb-6">
                  <Label className="text-white text-xs mb-2 block">Promo Code</Label>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
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
              
              {/* Contact Information */}
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
                    <Label className="text-white text-sm mb-2 block">Parent Email</Label>
                    <Input
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      required
                      data-testid="input-parent-email"
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
                      <span>${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-400">
                      <span>Discount ({CartManager.getPromoCode()}):</span>
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
                      Proceed to Registration Form
                    </Button>
                  ) : (
                    <Button
                      className={`w-full border-0 rounded-full py-3 font-semibold ${
                        !formSubmitted 
                          ? 'bg-gray-600 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white`}
                      onClick={proceedToPayment}
                      disabled={cart.length === 0 || isLoading || !formSubmitted || !parentName.trim() || !parentEmail.trim() || !childName.trim()}
                      data-testid="button-checkout"
                    >
                      {isLoading ? 'Processing...' : 
                       !formSubmitted ? '⏳ Complete Form First' :
                       !parentName.trim() || !parentEmail.trim() || !childName.trim() ? 'Fill in Contact Info First' :
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
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMobileCart(false)}
          />
          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-white/20 rounded-t-2xl max-h-[80vh] overflow-y-auto">
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

              {/* Contact Information - Mobile Only */}
              {showForm && (
                <div className="border-t border-white/20 pt-4 space-y-4">
                  <h4 className="text-white font-semibold mb-2">Contact Information</h4>
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
                    <Label className="text-white text-sm mb-2 block">Parent Email</Label>
                    <Input
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      required
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

              {/* Total */}
              <div className="border-t border-white/20 pt-4">
                {hasDiscount && (
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between text-white/80">
                      <span>Subtotal:</span>
                      <span>${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-400">
                      <span>Discount ({CartManager.getPromoCode()}):</span>
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
                      !formSubmitted || !parentName.trim() || !parentEmail.trim() || !childName.trim()
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    onClick={() => {
                      if (formSubmitted && parentName.trim() && parentEmail.trim() && childName.trim()) {
                        setShowMobileCart(false);
                        proceedToPayment();
                      } else {
                        toast({
                          title: "Complete Required Fields",
                          description: "Please fill in all contact information and submit the form first.",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={!formSubmitted || !parentName.trim() || !parentEmail.trim() || !childName.trim()}
                  >
                    {!formSubmitted ? '⏳ Complete Form First' :
                     !parentName.trim() || !parentEmail.trim() || !childName.trim() ? 'Fill in Contact Info' :
                     'Proceed to Checkout'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
            Proceed to Step 2 ({cartItems.length} {cartItems.length === 1 ? 'week' : 'weeks'})
          </Button>
        </div>
      )}

      {/* Mobile Checkout Button - Shows when form is shown (always visible when form is shown) */}
      {cartItems.length > 0 && showForm && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-white/10 p-4 shadow-2xl">
          <Button
            className={`w-full border-0 rounded-full py-4 font-semibold text-lg text-white opacity-100 ${
              !formSubmitted || !parentName.trim() || !parentEmail.trim() || !childName.trim()
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={() => {
              if (formSubmitted && parentName.trim() && parentEmail.trim() && childName.trim()) {
                proceedToPayment();
              } else {
                // Open cart drawer to fill in info
                setShowMobileCart(true);
                toast({
                  title: "Complete Required Fields",
                  description: "Please fill in all contact information in the cart.",
                  variant: "destructive",
                });
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 
             !formSubmitted ? '⏳ Complete Form First' :
             !parentName.trim() || !parentEmail.trim() || !childName.trim() ? 'Fill in Contact Info' :
             'Proceed to Checkout'}
          </Button>
        </div>
      )}
    </div>
  );
}
