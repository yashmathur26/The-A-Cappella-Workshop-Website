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
  mapUrl: string;
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
    venue?: {
      name: string;
      address: string;
      addressLine2: string;
      mapUrl: string;
    };
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

// Generate a random number between 15 and 18 (inclusive) based on week ID
// This ensures each week gets a consistent random value
function getRandomSpots(weekId: string): number {
  // Use week ID as seed for consistent randomness
  let hash = 0;
  for (let i = 0; i < weekId.length; i++) {
    hash = ((hash << 5) - hash) + weekId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Generate number between 15-18
  return 15 + (Math.abs(hash) % 4);
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [currentLocation, setCurrentLocation] = useState<Location>('lexington');

  const locationData: Record<Location, LocationData> = {
    lexington: {
      name: 'Lexington',
      fullName: 'Lexington A Cappella Camp',
      heroTitle: 'Lexington A Cappella Workshop',
      heroSubtitle: 'Join us for a week of learning, music, and fun!',
      phone: '(781) 357-7819',
      address: 'Temple Emunah',
      addressLine2: '9 Piper Rd, Lexington, MA 02421',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2944.123456789!2d-71.2271715!3d42.4208445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39da7cf60964d%3A0xb9185605b60e37d8!2sTemple%20Emunah!5e0!3m2!1sen!2sus!4v1692820800000!5m2!1sen!2sus',
      colors: {
        primary: 'from-blue-custom via-indigo-custom to-teal-custom',
        accent: 'text-sky-custom',
        gradient: 'bg-gradient-to-r from-blue-600 to-indigo-600',
      },
      weeks: [
        { 
          id: "lex-wk1", 
          label: "July 27–31, 2026", 
          price: 500, 
          spots: getRandomSpots("lex-wk1"),
          venue: {
            name: "Temple Emunah",
            address: "Temple Emunah",
            addressLine2: "9 Piper Rd, Lexington, MA 02421",
            mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2944.123456789!2d-71.2271715!3d42.4208445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39da7cf60964d%3A0xb9185605b60e37d8!2sTemple%20Emunah!5e0!3m2!1sen!2sus!4v1692820800000!5m2!1sen!2sus"
          }
        },
        { 
          id: "lex-wk2", 
          label: "August 3–7, 2026", 
          price: 500, 
          spots: getRandomSpots("lex-wk2"),
          venue: {
            name: "Follen Church",
            address: "Follen Church",
            addressLine2: "755 Massachusetts Avenue, Lexington, MA 02420",
            mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5889.806471077892!2d-71.20957172382262!3d42.4297945306929!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39d9180f2a243%3A0xcb6c786189931c66!2sFollen%20Church!5e0!3m2!1sen!2sus!4v1768470391604!5m2!1sen!2sus"
          }
        },
        { 
          id: "lex-wk3", 
          label: "August 10–14, 2026", 
          price: 500, 
          spots: getRandomSpots("lex-wk3"),
          venue: {
            name: "Temple Emunah",
            address: "Temple Emunah",
            addressLine2: "9 Piper Rd, Lexington, MA 02421",
            mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2944.123456789!2d-71.2271715!3d42.4208445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39da7cf60964d%3A0xb9185605b60e37d8!2sTemple%20Emunah!5e0!3m2!1sen!2sus!4v1692820800000!5m2!1sen!2sus"
          }
        },
        { 
          id: "lex-wk4", 
          label: "August 17–21, 2026", 
          price: 500, 
          spots: getRandomSpots("lex-wk4"),
          venue: {
            name: "Temple Emunah",
            address: "Temple Emunah",
            addressLine2: "9 Piper Rd, Lexington, MA 02421",
            mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2944.123456789!2d-71.2271715!3d42.4208445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39da7cf60964d%3A0xb9185605b60e37d8!2sTemple%20Emunah!5e0!3m2!1sen!2sus!4v1692820800000!5m2!1sen!2sus"
          }
        },
        { 
          id: "lex-wk5", 
          label: "August 24–28, 2026", 
          price: 500, 
          spots: getRandomSpots("lex-wk5"),
          venue: {
            name: "Follen Church",
            address: "Follen Church",
            addressLine2: "755 Massachusetts Avenue, Lexington, MA 02420",
            mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5889.806471077892!2d-71.20957172382262!3d42.4297945306929!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39d9180f2a243%3A0xcb6c786189931c66!2sFollen%20Church!5e0!3m2!1sen!2sus!4v1768470391604!5m2!1sen!2sus"
          }
        }
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
      heroSubtitle: 'Join us for a week of learning, music, and fun!',
      phone: '(781) 879-4539',
      address: 'Hebrew College',
      addressLine2: '1860 Washington St, Newton, MA 02466',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3160.5309634794144!2d-71.24349952382687!3d42.33576543663596!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e3789ce4b32ab9%3A0x592d306c4d44fe37!2sHebrew%20College!5e1!3m2!1sen!2sus!4v1766546337890!5m2!1sen!2sus',
      colors: {
        primary: 'from-emerald-600 via-green-500 to-teal-400',
        accent: 'text-emerald-400',
        gradient: 'bg-gradient-to-r from-emerald-600 to-green-600',
      },
      weeks: [
        { id: "nw-wk1", label: "August 10–14, 2026", price: 600, spots: getRandomSpots("nw-wk1") },
        { id: "nw-wk2", label: "August 17–21, 2026", price: 600, spots: getRandomSpots("nw-wk2") }
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
      heroSubtitle: 'Join us for a week of learning, music, and fun!',
      phone: '(781) 879-4539',
      address: 'Wayland Location',
      addressLine2: '141 Boston Post Rd, Wayland, MA 01778',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3159.317477380504!2d-71.34912842382583!3d42.35990583511107!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e385a89cc2a215%3A0xb42b711833c755b9!2s141%20Boston%20Post%20Rd%2C%20Wayland%2C%20MA%2001778!5e1!3m2!1sen!2sus!4v1766546376182!5m2!1sen!2sus',
      colors: {
        primary: 'from-purple-500 via-violet-500 to-fuchsia-400',
        accent: 'text-violet-400',
        gradient: 'bg-gradient-to-r from-purple-600 to-violet-600',
      },
      weeks: [
        { id: "way-wk1", label: "August 3–7, 2026", price: 600, spots: getRandomSpots("way-wk1") }
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
