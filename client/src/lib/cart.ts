import { WEEKS } from './constants';

export interface CartItem {
  weekId: string;
  label: string;
  price: number;
}

export class CartManager {
  private static readonly STORAGE_KEY = 'acappella-cart';

  static getCart(): string[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static setCart(weekIds: string[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(weekIds));
  }

  static addToCart(weekId: string): void {
    const cart = this.getCart();
    if (!cart.includes(weekId)) {
      cart.push(weekId);
      this.setCart(cart);
    }
  }

  static removeFromCart(weekId: string): void {
    const cart = this.getCart().filter(id => id !== weekId);
    this.setCart(cart);
  }

  static clearCart(): void {
    this.setCart([]);
  }

  static getCartItems(): CartItem[] {
    const cart = this.getCart();
    return WEEKS.filter(week => cart.includes(week.id)).map(week => ({
      weekId: week.id,
      label: week.label,
      price: week.price
    }));
  }

  static getCartTotal(): number {
    return this.getCartItems().reduce((total, item) => total + item.price, 0);
  }

  static getCartCount(): number {
    return this.getCart().length;
  }
}
