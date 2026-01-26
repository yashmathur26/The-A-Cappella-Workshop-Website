import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingCart, Menu, X, MapPin, ChevronDown } from 'lucide-react';
import { CartManager } from '@/lib/cart';
import { Button } from '@/components/ui/button';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import shopLogo from "@assets/Screenshot_2025-12-23_at_10.11.39_PM_1766545901890.png";

interface NavigationProps {
  cartCount?: number;
}

export function Navigation({ cartCount = 0 }: NavigationProps) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentCartCount, setCurrentCartCount] = useState(cartCount);
  const { currentLocation, setLocation: setAppLocation, locationData } = useLocationContext();

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
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About Us' },
    { href: '/faq', label: 'FAQ' },
    { href: '/gallery', label: 'Gallery' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
            <img 
              src={shopLogo} 
              alt="The A Cappella Workshop Logo" 
              className="w-10 h-10 rounded-full object-cover logo-no-white"
            />
            <h1 className="text-xl font-bold text-white brand-text whitespace-nowrap">The A Cappella Workshop</h1>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 flex-1 justify-center">
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
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center space-x-3 flex-shrink-0">
            {/* Location Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm whitespace-nowrap">
                  <MapPin className="w-4 h-4 mr-1" />
                  {locationData[currentLocation].name}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-900 border-gray-700 text-white">
                <DropdownMenuItem 
                  onClick={() => setAppLocation('lexington')}
                  className={`cursor-pointer hover:bg-gray-800 ${currentLocation === 'lexington' ? 'bg-blue-900/50' : ''}`}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Lexington
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link 
                    href="/newton"
                    className={`cursor-pointer hover:bg-gray-800 flex items-center ${currentLocation === 'newton-wellesley' ? 'bg-emerald-900/50' : ''}`}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Newton
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link 
                    href="/wayland"
                    className={`cursor-pointer hover:bg-gray-800 flex items-center ${currentLocation === 'wayland' ? 'bg-purple-900/50' : ''}`}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Wayland
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Link
              href="/camp-registration"
              className="btn-gradient px-4 py-2 rounded-full text-white font-medium hover:text-white text-sm whitespace-nowrap"
            >
              Register Now
            </Link>
            
            <Link href="/camp-registration" className="relative">
              <ShoppingCart className="text-white/80 hover:text-white cursor-pointer" size={18} />
              {currentCartCount > 0 && (
                <span className="cart-badge absolute -top-2 -right-2 text-xs text-white rounded-full w-4 h-4 flex items-center justify-center">
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
                    isActive(link.href) ? (currentLocation === 'wayland' ? 'text-purple-400' : currentLocation === 'newton-wellesley' ? 'text-emerald-400' : 'text-sky-custom') : ''
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="space-y-3">
                <Link
                  href="/camp-registration"
                  className="btn-gradient px-6 py-2 rounded-full text-white font-medium inline-block text-center"
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
