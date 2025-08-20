import { WEEKS } from './constants';

export interface CartItem {
  weekId: string;
  label: string;
  price: number;
  paymentType: 'full' | 'deposit';
}

export class CartManager {
  private static readonly STORAGE_KEY = 'acappella-cart';

  static getCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static setCart(items: CartItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
  }

  static addToCart(weekId: string, paymentType: 'full' | 'deposit'): void {
    const cart = this.getCart();
    // Remove any existing entry for this week
    const filteredCart = cart.filter(item => item.weekId !== weekId);
    
    const week = WEEKS.find(w => w.id === weekId);
    if (week) {
      const price = paymentType === 'full' ? week.price : 150;
      filteredCart.push({
        weekId,
        label: week.label,
        price,
        paymentType
      });
      this.setCart(filteredCart);
    }
  }

  static removeFromCart(weekId: string): void {
    const cart = this.getCart().filter(item => item.weekId !== weekId);
    this.setCart(cart);
  }

  static clearCart(): void {
    this.setCart([]);
  }

  static getCartItems(): CartItem[] {
    return this.getCart();
  }

  static getCartTotal(): number {
    return this.getCartItems().reduce((total, item) => total + item.price, 0);
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
}
