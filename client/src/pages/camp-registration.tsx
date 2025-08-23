import { useState, useEffect, useRef } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { CartManager, type CartItem } from '@/lib/cart';
import { WEEKS } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { PaymentOptions } from '@/components/PaymentOptions';
import { AddStudentModal } from '@/components/AddStudentModal';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, X, AlertTriangle, Plus, Users } from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  notes?: string;
  createdAt: string;
}

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
  const paymentWindowRef = useRef<Window | null>(null);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch students for authenticated users
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    enabled: isAuthenticated,
  });

  // Fetch registrations to check for duplicates
  const { data: registrations = [] } = useQuery<any[]>({
    queryKey: ["/api/registrations"],
    enabled: isAuthenticated,
  });

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
    };
  }, []);

  const addWeekToCart = (weekId: string, paymentType: 'full' | 'deposit') => {
    // Check if user already has a registration for this week
    const existingRegistration = registrations.find(reg => reg.weekId === weekId);
    
    if (existingRegistration) {
      toast({
        title: "Already Registered",
        description: "A student is already registered for this week. Students cannot be registered twice for the same week.",
        variant: "destructive",
      });
      return;
    }
    
    CartManager.addToCart(weekId, paymentType);
    setCart(CartManager.getCart());
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const updateStudentForWeek = (weekId: string, studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      CartManager.updateStudentForWeek(weekId, studentId, `${student.firstName} ${student.lastName}`);
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
    
    // Only require contact info for guest users
    if (!isAuthenticated && (!parentName.trim() || !parentEmail.trim() || !childName.trim())) {
      toast({
        title: "Contact information required",
        description: "Please enter parent name, email, and child name before checkout.",
        variant: "destructive",
      });
      return;
    }

    // For authenticated users, verify students are assigned to all cart items
    if (isAuthenticated) {
      const unassignedItems = cart.filter(item => {
        const studentInfo = CartManager.getStudentForWeek(item.weekId);
        return !studentInfo.studentId;
      });
      
      if (unassignedItems.length > 0) {
        toast({
          title: "Students not assigned",
          description: "Please assign a student to each week in your cart before checkout.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Go directly to Stripe checkout for both authenticated and guest users
    setIsLoading(true);
    setPaymentStatus('pending');
    
    try {
      const response = await apiRequest('POST', '/api/create-checkout-session', {
        cartItems: cart,
        promoCode: CartManager.getPromoCode(),
        parentName: isAuthenticated ? `${user?.firstName} ${user?.lastName}` : parentName.trim(),
        parentEmail: isAuthenticated ? user?.email : parentEmail.trim(),
        childName: isAuthenticated ? 'Student Registration' : childName.trim(),
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
        
        <div className="lg:grid lg:grid-cols-3 lg:gap-8 xl:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8 lg:space-y-12">
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
                        <h3 className="text-xl font-bold text-teal-custom">Week {index + 1}: <span className="font-normal">{week.label}</span></h3>
                      </div>
                    </div>
                    <div className="mb-4">
                      <span className="text-sm text-sky-custom/80">{week.spots}/20 spots</span>
                    </div>
                    
                    {/* Payment Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-white">Full Payment</span>
                          <span className="text-xl font-bold text-sky-custom">${week.price}</span>
                        </div>
                        <p className="text-xs text-white/60 mb-3">Pay today, no additional fees</p>
                        <Button
                          variant={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full' ? 'outline' : 'default'}
                          size="sm"
                          className={`w-full py-2.5 text-sm font-medium min-h-[44px] rounded-full transition-all ${
                            CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'full' 
                              ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                              : 'bg-teal-600 hover:bg-teal-700 text-white border-0'
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
                          <span className="text-xl font-bold text-teal-custom">$150</span>
                        </div>
                        <p className="text-xs text-white/60 mb-3">$350 remaining via invoice</p>
                        <Button
                          variant={CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit' ? 'outline' : 'default'}
                          size="sm"
                          className={`w-full py-2.5 text-sm font-medium min-h-[44px] rounded-full transition-all ${
                            CartManager.isInCart(week.id) && CartManager.getPaymentType(week.id) === 'deposit' 
                              ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                              : 'bg-sky-600 hover:bg-sky-700 text-white border-0'
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
              {/* Student Assignment for Authenticated Users */}
              {isAuthenticated && cartItems.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 text-white">Assign Students</h3>
                  <div className="space-y-4">
                    {cartItems.map((item) => {
                      const studentInfo = CartManager.getStudentForWeek(item.weekId);
                      return (
                        <div key={item.weekId} className="p-3 bg-white/5 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-white text-sm">{item.label}</p>
                              <p className="text-xs text-white/60">{item.paymentType === 'full' ? 'Full Payment' : 'Deposit'} - ${item.price}</p>
                            </div>
                          </div>
                          <Select
                            value={studentInfo.studentId || ""}
                            onValueChange={(value) => updateStudentForWeek(item.weekId, value)}
                          >
                            <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select student" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-white/20">
                              {students.map((student) => (
                                <SelectItem key={student.id} value={student.id} className="text-white">
                                  {student.firstName} {student.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                    
                    <div className="text-center">
                      <Button
                        onClick={() => setShowAddStudentModal(true)}
                        size="sm"
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 w-full"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Student
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <h3 className="text-xl font-bold mb-6 text-white">Your Cart</h3>
              <div className="space-y-3 mb-6">
                {cartItems.length === 0 ? (
                  <p className="text-white/60">No weeks selected</p>
                ) : (
                  cartItems.map(item => (
                    <div key={item.weekId} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-white/90 text-base font-medium">{item.label}</span>
                        <span className="ml-2 text-xs px-2 py-1 rounded bg-white/10 text-white/70">
                          {item.paymentType === 'deposit' ? 'Deposit' : 'Full Payment'}
                        </span>
                        {isAuthenticated && item.studentName && (
                          <div className="text-xs text-teal-400 mt-1">
                            {item.studentName}
                          </div>
                        )}
                      </div>
                      <span className="text-white/90">${item.price}</span>
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
              
              {/* Contact Information - Only for guest checkout */}
              {cartItems.length > 0 && showForm && !isAuthenticated && (
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
                      placeholder="Enter parent email"
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

              {/* Student assignment reminder for authenticated users */}
              {cartItems.length > 0 && showForm && isAuthenticated && (
                <div className="mb-6 p-4 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-300" />
                    <p className="text-blue-200 text-sm">
                      {cartItems.every(item => CartManager.getStudentForWeek(item.weekId).studentId) 
                        ? 'All students assigned! Ready for checkout.' 
                        : 'Please assign students to each week in the cart above.'}
                    </p>
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
                    <>
                      {isAuthenticated ? (
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 text-white border-0 rounded-full py-3 font-semibold"
                          onClick={proceedToPayment}
                          disabled={cart.length === 0 || isLoading || !cartItems.every(item => CartManager.getStudentForWeek(item.weekId).studentId)}
                        >
                          {isLoading ? 'Processing...' : 
                           !cartItems.every(item => CartManager.getStudentForWeek(item.weekId).studentId) ? 'Assign Students First' :
                           'Choose Payment Option'}
                        </Button>
                      ) : (
                        <>
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white border-0 rounded-full py-3 font-semibold"
                            onClick={proceedToPayment}
                            disabled={cart.length === 0 || isLoading || !parentName.trim() || !childName.trim()}
                          >
                            {isLoading ? 'Processing...' : 
                             !parentName.trim() || !childName.trim() ? 'Fill in Names First' :
                             'Pay as Guest'}
                          </Button>
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

        {/* Add Student Modal */}
        <AddStudentModal
          isOpen={showAddStudentModal}
          onClose={() => setShowAddStudentModal(false)}
        />
      </div>
    </div>
  );
}
