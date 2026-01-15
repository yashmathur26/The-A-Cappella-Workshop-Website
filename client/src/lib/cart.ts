// Dynamic weeks will be passed to cart methods

export interface CartItem {
  weekId: string;
  label: string;
  price: number;
  paymentType: 'full' | 'deposit';
  studentId?: string; // For authenticated users
  studentName?: string; // For display purposes
  location?: string; // Location name (Lexington or Newton/Wellesley)
}

export interface CartState {
  items: CartItem[];
  promoCode: string;
  discount: number;
}

export class CartManager {
  private static readonly STORAGE_KEY = 'acappella-cart';
  private static readonly PROMO_KEY = 'acappella-promo';
  
  // Promo codes and their discounts
  private static readonly PROMO_CODES = {
    'SHOP': 0.20, // 20% discount
    'ADMIN': 'FIXED_0', // $0 total for admin
    'ADMIN1': 'FIXED_0.50', // $0.50 total for admin
    'ADMIND': 'FIXED_0.50', // $0.50 deposit test (with $499.50 remaining)
    'ADMINF': 'FIXED_0.50', // $0.50 full payment test
    'ARJUN': 'FIXED_1', // $1 total for staff
    'SHUNTAVI': 'FIXED_1', // $1 total for staff
    'YASH': 'FIXED_1' // $1 total for staff
  };

  static getCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];
    
    try {
      const parsed = JSON.parse(stored);
      // Migration: Check if old format (string array) and clear it
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        localStorage.removeItem(this.STORAGE_KEY);
        return [];
      }
      // Validate new format
      if (Array.isArray(parsed) && parsed.every(item => 
        item && typeof item === 'object' && 
        'weekId' in item && 'paymentType' in item && 'price' in item
      )) {
        return parsed;
      }
      // Invalid format, clear it
      localStorage.removeItem(this.STORAGE_KEY);
      return [];
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
      return [];
    }
  }

  static setCart(items: CartItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
  }


  static getCartLocation(): string | null {
    const cart = this.getCart();
    if (cart.length === 0) return null;
    return cart[0].location || null;
  }

  static canAddToCart(location?: string): { allowed: boolean; currentLocation: string | null } {
    const currentLocation = this.getCartLocation();
    if (!currentLocation || !location) {
      return { allowed: true, currentLocation };
    }
    return { 
      allowed: currentLocation === location, 
      currentLocation 
    };
  }

  static addToCart(weekId: string, paymentType: 'full' | 'deposit', week: any, location?: string, studentId?: string, studentName?: string): { success: boolean; error?: string; currentLocation?: string } {
    const cart = this.getCart();
    
    // Check if cart has items from a different location
    if (location && cart.length > 0) {
      const cartLocation = cart[0].location;
      if (cartLocation && cartLocation !== location) {
        return { 
          success: false, 
          error: 'location_mismatch',
          currentLocation: cartLocation
        };
      }
    }
    
    // Remove any existing entry for this week
    const filteredCart = cart.filter(item => item.weekId !== weekId);
    
    if (week) {
      const price = paymentType === 'full' ? week.price : 150;
      filteredCart.push({
        weekId,
        label: week.label,
        price,
        paymentType,
        studentId,
        studentName,
        location
      });
      this.setCart(filteredCart);
      this.triggerCartUpdate();
      return { success: true };
    }
    return { success: false, error: 'invalid_week' };
  }

  static removeFromCart(weekId: string): void {
    const cart = this.getCart().filter(item => item.weekId !== weekId);
    this.setCart(cart);
    this.triggerCartUpdate();
  }

  static clearCart(): void {
    this.setCart([]);
    this.removePromoCode();
    this.triggerCartUpdate();
  }

  static getCartItems(): CartItem[] {
    return this.getCart();
  }

  static getCartTotal(): number {
    const subtotal = this.getCartItems().reduce((total, item) => total + item.price, 0);
    const promoCode = this.getPromoCode();
    
    // Special handling for ADMIN promo codes
    if (promoCode === 'ADMIN') {
      return 0.00; // Fixed $0 for admin
    }
    if (promoCode === 'ADMIN1' || promoCode === 'ADMIND' || promoCode === 'ADMINF') {
      return 0.50; // Fixed $0.50 for admin testing
    }
    if (promoCode === 'ARJUN' || promoCode === 'SHUNTAVI' || promoCode === 'YASH') {
      return 1.00; // Fixed $1 for staff
    }
    
    const discount = this.getDiscount();
    return Math.round((subtotal * (1 - discount)) * 100) / 100;
  }

  static getCartSubtotal(): number {
    return this.getCartItems().reduce((total, item) => total + item.price, 0);
  }

  static getDiscount(): number {
    const promoCode = this.getPromoCode();
    const discount = this.PROMO_CODES[promoCode as keyof typeof this.PROMO_CODES];
    
    // Return 0 for special codes like ADMIN
    if (typeof discount === 'string') return 0;
    return discount || 0;
  }

  static getDiscountAmount(): number {
    const subtotal = this.getCartSubtotal();
    const promoCode = this.getPromoCode();
    
    // Special handling for ADMIN promo codes
    if (promoCode === 'ADMIN') {
      return Math.round((subtotal - 0.00) * 100) / 100;
    }
    if (promoCode === 'ADMIN1' || promoCode === 'ADMIND' || promoCode === 'ADMINF') {
      return Math.round((subtotal - 0.50) * 100) / 100;
    }
    if (promoCode === 'ARJUN' || promoCode === 'SHUNTAVI' || promoCode === 'YASH') {
      return Math.round((subtotal - 1.00) * 100) / 100;
    }
    
    const discount = this.getDiscount();
    return Math.round(subtotal * discount * 100) / 100;
  }

  static getPromoCode(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(this.PROMO_KEY) || '';
  }

  static setPromoCode(code: string): boolean {
    if (typeof window === 'undefined') return false;
    const upperCode = code.toUpperCase();
    if (upperCode === '' || this.PROMO_CODES[upperCode as keyof typeof this.PROMO_CODES]) {
      localStorage.setItem(this.PROMO_KEY, upperCode);
      this.triggerCartUpdate();
      return true;
    }
    return false;
  }

  static removePromoCode(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.PROMO_KEY);
    this.triggerCartUpdate();
  }

  static isValidPromoCode(code: string): boolean {
    return !!this.PROMO_CODES[code.toUpperCase() as keyof typeof this.PROMO_CODES];
  }

  private static triggerCartUpdate(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    }
  }

  static getCartCount(): number {
    return this.getCart().length;
  }

  static isInCart(weekId: string): boolean {
    return this.getCart().some(item => item.weekId === weekId);
  }

  static getPaymentType(weekId: string): 'full' | 'deposit' | null {
    const item = this.getCart().find(item => item.weekId === weekId);
    return item ? item.paymentType : null;
  }

  static updateStudentForWeek(weekId: string, studentId: string, studentName: string): void {
    const cart = this.getCart();
    const updatedCart = cart.map(item => {
      if (item.weekId === weekId) {
        return { ...item, studentId, studentName };
      }
      return item;
    });
    this.setCart(updatedCart);
    this.triggerCartUpdate();
  }

  static getStudentForWeek(weekId: string): { studentId?: string; studentName?: string } {
    const item = this.getCart().find(item => item.weekId === weekId);
    return { studentId: item?.studentId, studentName: item?.studentName };
  }
}
