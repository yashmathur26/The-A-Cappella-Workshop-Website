import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Music, ShoppingCart, Menu, X } from 'lucide-react';
import { CartManager } from '@/lib/cart';

interface NavigationProps {
  cartCount?: number;
}

export function Navigation({ cartCount = 0 }: NavigationProps) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentCartCount, setCurrentCartCount] = useState(cartCount);

  useEffect(() => {
    setCurrentCartCount(CartManager.getCartCount());
    
    const handleStorageChange = () => {
      setCurrentCartCount(CartManager.getCartCount());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cartUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleStorageChange);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About Us' },
    { href: '/faq', label: 'FAQ' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-custom to-teal-custom flex items-center justify-center">
              <Music className="text-white text-lg" size={20} />
            </div>
            <h1 className="text-2xl font-bold text-white brand-text">The A Cappella Workshop</h1>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link text-white/80 hover:text-white transition-colors relative ${
                  isActive(link.href) ? 'active' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/register"
              className={`btn-gradient px-6 py-2 rounded-full text-white font-medium nav-link ${
                isActive('/register') ? 'active' : ''
              }`}
            >
              Register
            </Link>
            <Link href="/register" className="relative">
              <ShoppingCart className="text-white/80 hover:text-white cursor-pointer" size={20} />
              {currentCartCount > 0 && (
                <span className="cart-badge absolute -top-2 -right-2 text-xs text-white rounded-full w-5 h-5 flex items-center justify-center">
                  {currentCartCount}
                </span>
              )}
            </Link>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-white/10">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-white/80 hover:text-white transition-colors ${
                    isActive(link.href) ? 'text-sky-custom' : ''
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/register"
                className="btn-gradient px-6 py-2 rounded-full text-white font-medium inline-block text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
