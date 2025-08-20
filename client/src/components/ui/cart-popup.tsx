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

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Side Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md z-50 transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <GlassCard className="h-full rounded-none rounded-l-lg border-r-0 flex flex-col">
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="text-teal-custom" size={24} />
                <h3 className="text-2xl font-bold text-white">My Shopping Bag</h3>
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-white/60 text-sm mt-2">({cartItems.length} Items)</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="text-white/30 mx-auto mb-4" size={48} />
                <p className="text-white/60">There are no items in your shopping bag.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map(item => (
                  <div key={item.weekId} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-white font-medium">{item.label}</h4>
                        <p className="text-white/60 text-sm">Week Duration: 5 days</p>
                      </div>
                      <span className="text-sky-custom font-bold text-lg">${item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-white/20 space-y-4">
              <div className="flex justify-between text-xl font-bold">
                <span className="text-white">Subtotal</span>
                <span className="text-teal-custom">${cartTotal}.00</span>
              </div>
              <Link href="/register" onClick={onClose}>
                <GradientButton className="w-full text-lg py-3">
                  Complete Registration
                </GradientButton>
              </Link>
              <button
                onClick={onClose}
                className="w-full py-3 px-4 text-white/80 hover:text-white transition-colors border border-white/20 rounded-lg hover:bg-white/5"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </GlassCard>
      </div>
    </>
  );
}