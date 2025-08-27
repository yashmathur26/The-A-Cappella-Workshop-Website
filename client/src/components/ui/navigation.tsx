import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingCart, Menu, X, User, LogOut, MapPin, ChevronDown } from 'lucide-react';
import { CartManager } from '@/lib/cart';
import { useAuth, useLogout } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Using a custom SVG logo that matches the microphone design
const LogoSVG = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none">
    <circle cx="50" cy="50" r="45" fill="rgba(56, 189, 248, 0.3)" stroke="rgba(56, 189, 248, 0.6)" strokeWidth="2"/>
    <path d="M35 55L45 35L65 35L75 55L75 75C75 80 70 85 65 85L45 85C40 85 35 80 35 75Z" fill="#374151"/>
    <circle cx="55" cy="30" r="8" fill="#374151"/>
    <path d="M55 40L55 70" stroke="#374151" strokeWidth="3" strokeLinecap="round"/>
    <path d="M45 45L50 40" stroke="#374151" strokeWidth="2"/>
    <path d="M65 45L60 40" stroke="#374151" strokeWidth="2"/>
    <path d="M40 65L45 60" stroke="#374151" strokeWidth="2"/>
    <path d="M70 65L65 60" stroke="#374151" strokeWidth="2"/>
    <circle cx="35" cy="45" r="1.5" fill="#374151"/>
    <circle cx="75" cy="45" r="1.5" fill="#374151"/>
    <path d="M30 35C28 37 30 40 32 38" stroke="#374151" strokeWidth="1.5" fill="none"/>
    <path d="M80 35C82 37 80 40 78 38" stroke="#374151" strokeWidth="1.5" fill="none"/>
  </svg>
);

interface NavigationProps {
  cartCount?: number;
}

export function Navigation({ cartCount = 0 }: NavigationProps) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentCartCount, setCurrentCartCount] = useState(cartCount);
  const { user, isAuthenticated } = useAuth();
  const logoutMutation = useLogout();
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
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-sky-custom/20 to-teal-custom/20 border-2 border-sky-custom/30 flex items-center justify-center">
              <LogoSVG />
            </div>
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
                <DropdownMenuItem 
                  onClick={() => setAppLocation('newton-wellesley')}
                  className={`cursor-pointer hover:bg-gray-800 ${currentLocation === 'newton-wellesley' ? 'bg-emerald-900/50' : ''}`}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Newton
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Link
              href="/camp-registration"
              className="btn-gradient px-4 py-2 rounded-full text-white font-medium hover:text-white text-sm whitespace-nowrap"
            >
              Register
            </Link>
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link href="/account" className="flex items-center space-x-1 text-white/80 hover:text-white whitespace-nowrap">
                  <User size={16} />
                  <span className="hidden lg:inline text-sm">{user?.firstName}</span>
                </Link>
                <Button
                  onClick={() => logoutMutation.mutate()}
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10 p-2"
                  disabled={logoutMutation.isPending}
                >
                  <LogOut size={16} />
                </Button>
              </div>
            ) : (
              <Link
                href="/login"
                className="btn-gradient-secondary px-4 py-2 rounded-full text-white font-medium hover:text-white text-sm whitespace-nowrap"
              >
                Sign In
              </Link>
            )}
            
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
                    isActive(link.href) ? 'text-sky-custom' : ''
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <div className="space-y-4">
                  <Link href="/account" className="flex items-center space-x-2 text-white/80 hover:text-white">
                    <User size={18} />
                    <span>Account ({user?.email?.split('@')[0]})</span>
                  </Link>
                  <Button
                    onClick={() => logoutMutation.mutate()}
                    variant="ghost"
                    className="w-full text-white/80 hover:text-white hover:bg-white/10"
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut size={16} className="mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link
                    href="/login"
                    className="btn-gradient-secondary px-6 py-2 rounded-full text-white font-medium inline-block text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/camp-registration"
                    className="btn-gradient px-6 py-2 rounded-full text-white font-medium inline-block text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
