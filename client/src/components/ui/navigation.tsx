import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { CartManager } from '@/lib/cart';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import shopLogo from "@assets/Screenshot_2025-12-23_at_10.11.39_PM_1766545901890.png";

interface NavigationProps {
  cartCount?: number;
}

export function Navigation({ cartCount = 0 }: NavigationProps) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentCartCount, setCurrentCartCount] = useState(cartCount);
  const { currentLocation } = useLocationContext();

  useEffect(() => {
    // Force a fresh cart count on mount
    const count = CartManager.getCartCount();
    setCurrentCartCount(count);
    
    const handleStorageChange = () => {
      const freshCount = CartManager.getCartCount();
      setCurrentCartCount(freshCount);
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
    if (path === '/newton' && (location === '/newton' || location.startsWith('/newton/'))) return true;
    if (path === '/wayland' && (location === '/wayland' || location.startsWith('/wayland/'))) return true;
    if (path !== '/' && !path.startsWith('/newton') && !path.startsWith('/wayland') && location.startsWith(path)) return true;
    return false;
  };

  const getHomeUrl = () => {
    if (currentLocation === 'newton-wellesley') return '/newton';
    if (currentLocation === 'wayland') return '/wayland';
    return '/';
  };

  const getRegistrationUrl = () => {
    if (currentLocation === 'newton-wellesley') {
      return '/newton/register';
    } else if (currentLocation === 'wayland') {
      return '/wayland/register';
    }
    return '/camp-registration';
  };

  const navLinks = [
    { href: getHomeUrl(), label: 'Home' },
    { href: '/about', label: 'About Us' },
    { href: '/staff', label: 'Teachers & TAs' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/faq', label: 'FAQ' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-white/10">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        {/* Balanced 3-zone bar: logo left · centered links · actions right.
            Fixed ~64px height with cohesive (not stretched) link spacing. */}
        <div className="flex md:grid md:grid-cols-[1fr_auto_1fr] items-center justify-between h-16 gap-4">
          {/* Logo (left) */}
          <Link href={getHomeUrl()} className="flex items-center gap-3 justify-self-start min-w-0">
            <img
              src={shopLogo}
              alt="The A Cappella Workshop Logo"
              className="w-9 h-9 rounded-full object-cover logo-no-white shrink-0"
            />
            <span className="text-base lg:text-lg font-bold text-white brand-text whitespace-nowrap">The A Cappella Workshop</span>
          </Link>

          {/* Primary nav (centered) */}
          <div className="hidden md:flex items-center gap-6 lg:gap-9 justify-self-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link text-sm text-white/75 hover:text-white transition-colors relative ${
                  isActive(link.href) ? 'active' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions (right) */}
          <div className="flex items-center gap-4 justify-self-end">
            <Link
              href={getRegistrationUrl()}
              className="hidden md:inline-flex btn-gradient px-5 py-2 rounded-full text-white font-medium hover:text-white text-sm whitespace-nowrap"
            >
              Register Now
            </Link>

            <Link href={getRegistrationUrl()} className="hidden md:block relative">
              <ShoppingCart className="text-white/80 hover:text-white cursor-pointer" size={18} />
              {currentCartCount > 0 && (
                <span className="cart-badge absolute -top-2 -right-2 text-xs text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {currentCartCount}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-white/10">
            <div className="flex flex-col space-y-4 items-center text-center">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-white/80 hover:text-white transition-colors ${
                    isActive(link.href) ? (currentLocation === 'wayland' ? 'text-purple-400' : currentLocation === 'newton-wellesley' ? 'text-emerald-400' : 'text-sky-custom') : ''
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="space-y-3 w-full flex justify-center">
                <Link
                  href={getRegistrationUrl()}
                  className="btn-gradient px-6 py-2 rounded-full text-white font-medium inline-block text-center flex items-center justify-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Register Now
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
