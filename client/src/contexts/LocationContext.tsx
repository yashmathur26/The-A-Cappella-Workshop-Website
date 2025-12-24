import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Location = 'lexington' | 'newton-wellesley' | 'wayland';

interface LocationData {
  name: string;
  fullName: string;
  heroTitle: string;
  heroSubtitle: string;
  phone: string;
  address: string;
  addressLine2: string;
  colors: {
    primary: string;
    accent: string;
    gradient: string;
  };
  weeks: Array<{
    id: string;
    label: string;
    price: number;
    spots: number;
  }>;
  pricing: {
    full: number;
    deposit: number;
  };
  formUrl?: string;
}

interface LocationContextType {
  currentLocation: Location;
  setLocation: (location: Location) => void;
  locationData: Record<Location, LocationData>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [currentLocation, setCurrentLocation] = useState<Location>('lexington');

  const locationData: Record<Location, LocationData> = {
    lexington: {
      name: 'Lexington',
      fullName: 'Lexington A Cappella Camp',
      heroTitle: 'Lexington A Cappella Workshop',
      heroSubtitle: 'Sing. Collaborate. Perform.',
      phone: '(781) 357-7819',
      address: 'Temple Emunah',
      addressLine2: '9 Piper Rd, Lexington, MA 02421',
      colors: {
        primary: 'from-blue-custom via-indigo-custom to-teal-custom',
        accent: 'text-sky-custom',
        gradient: 'bg-gradient-to-r from-blue-600 to-indigo-600',
      },
      weeks: [
        { id: "lex-wk1", label: "June 22–26, 2026", price: 500, spots: 20 },
        { id: "lex-wk2", label: "July 27–31, 2026", price: 500, spots: 20 },
        { id: "lex-wk3", label: "August 3–7, 2026", price: 500, spots: 20 },
        { id: "lex-wk4", label: "August 10–14, 2026", price: 500, spots: 20 },
        { id: "lex-wk5", label: "August 17–21, 2026", price: 500, spots: 20 }
      ],
      pricing: {
        full: 500,
        deposit: 150,
      },
    },
    'newton-wellesley': {
      name: 'Newton',
      fullName: 'Newton A Cappella Camp',
      heroTitle: 'Newton A Cappella Workshop',
      heroSubtitle: 'Discover Your Voice. Create Harmony.',
      phone: '(781) 879-4539',
      address: 'Hebrew College',
      addressLine2: '1860 Washington St, Newton, MA 02466',
      colors: {
        primary: 'from-emerald-600 via-green-500 to-teal-400',
        accent: 'text-emerald-400',
        gradient: 'bg-gradient-to-r from-emerald-600 to-green-600',
      },
      weeks: [
        { id: "nw-wk1", label: "August 10–14, 2026", price: 600, spots: 20 },
        { id: "nw-wk2", label: "August 17–21, 2026", price: 600, spots: 20 }
      ],
      pricing: {
        full: 600,
        deposit: 150,
      },
    },
    wayland: {
      name: 'Wayland',
      fullName: 'Wayland A Cappella Camp',
      heroTitle: 'Wayland A Cappella Workshop',
      heroSubtitle: 'Find Your Harmony. Share Your Voice.',
      phone: '(781) 879-4539',
      address: 'Wayland Location',
      addressLine2: '141 Boston Post Rd, Wayland, MA 01778',
      colors: {
        primary: 'from-purple-500 via-violet-500 to-fuchsia-400',
        accent: 'text-violet-400',
        gradient: 'bg-gradient-to-r from-purple-600 to-violet-600',
      },
      weeks: [
        { id: "way-wk1", label: "August 3–7, 2026", price: 600, spots: 20 }
      ],
      pricing: {
        full: 600,
        deposit: 150,
      },
    },
  };

  const setLocation = (location: Location) => {
    setCurrentLocation(location);
    localStorage.setItem('acapella-location', location);
  };

  // Load saved location on mount and apply theme
  useEffect(() => {
    const saved = localStorage.getItem('acapella-location') as Location;
    if (saved && (saved === 'lexington' || saved === 'newton-wellesley' || saved === 'wayland')) {
      setCurrentLocation(saved);
    }
  }, []);

  // Apply location-based CSS class to body
  useEffect(() => {
    // Remove any existing location classes
    document.body.classList.remove('location-lexington', 'location-newton-wellesley', 'location-wayland');
    // Add the current location class
    document.body.classList.add(`location-${currentLocation}`);
    
    return () => {
      document.body.classList.remove('location-lexington', 'location-newton-wellesley', 'location-wayland');
    };
  }, [currentLocation]);

  return (
    <LocationContext.Provider value={{ 
      currentLocation, 
      setLocation, 
      locationData 
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
