import { useState } from 'react';
import { Link } from 'wouter';
import { X, ShoppingCart } from 'lucide-react';
import { CartManager } from '@/lib/cart';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';

interface CartPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartPopup({ isOpen, onClose }: CartPopupProps) {
  const cartItems = CartManager.getCartItems();
  const cartTotal = CartManager.getCartTotal();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="text-teal-custom" size={20} />
              <h3 className="text-xl font-bold text-white">Your Cart</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
            {cartItems.length === 0 ? (
              <p className="text-white/60 text-center py-4">No weeks selected yet</p>
            ) : (
              cartItems.map(item => (
                <div key={item.weekId} className="flex justify-between items-center text-sm bg-white/5 rounded-lg p-3">
                  <span className="text-white/90">{item.label}</span>
                  <span className="text-sky-custom font-semibold">${item.price}</span>
                </div>
              ))
            )}
          </div>
          
          {cartItems.length > 0 && (
            <div className="border-t border-white/20 pt-4 mb-6">
              <div className="flex justify-between text-lg font-semibold">
                <span className="text-white">Total:</span>
                <span className="text-teal-custom">${cartTotal}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <Link href="/register" onClick={onClose}>
              <GradientButton className="w-full">
                View Cart & Complete Registration
              </GradientButton>
            </Link>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 text-white/80 hover:text-white transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </GlassCard>
      </div>
    </>
  );
}