import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Get or create a unique visitor ID for this browser session
 * Uses sessionStorage so it resets when browser is closed
 */
function getVisitorId(): string {
  const STORAGE_KEY = 'aquawave_visitor_id';
  
  // Try to get existing visitor ID from this session
  let visitorId = sessionStorage.getItem(STORAGE_KEY);
  
  // If no visitor ID exists, create a new one
  if (!visitorId) {
    // Generate a unique ID: timestamp + random string
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(STORAGE_KEY, visitorId);
  }
  
  return visitorId;
}

/**
 * Check if visitor has already been counted today in this session
 * This prevents counting the same visitor multiple times per day
 */
function hasVisitedToday(visitorId: string): boolean {
  const STORAGE_KEY = `aquawave_visit_date_${visitorId}`;
  const today = new Date().toDateString();
  const lastVisitDate = sessionStorage.getItem(STORAGE_KEY);
  
  if (lastVisitDate === today) {
    return true; // Already visited today in this session
  }
  
  // Mark as visited today
  sessionStorage.setItem(STORAGE_KEY, today);
  return false; // First visit today
}

/**
 * Hook to automatically track page visits
 * Records a visit whenever the route changes, but only once per visitor per day
 */
export function useVisitTracker() {
  const [location] = useLocation();

  useEffect(() => {
    // Track visit when location changes
    const trackVisit = async () => {
      try {
        const visitorId = getVisitorId();
        
        // Check if this visitor has already been counted today
        // We still send the visit for analytics, but the server will deduplicate
        const isFirstVisitToday = !hasVisitedToday(visitorId);
        
        await fetch('/api/visits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            path: location,
            visitorId: visitorId,
            isFirstVisitToday: isFirstVisitToday,
          }),
        });
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.debug('Failed to track visit:', error);
      }
    };

    // Small delay to ensure page is loaded
    const timeoutId = setTimeout(trackVisit, 100);
    
    return () => clearTimeout(timeoutId);
  }, [location]);
}
