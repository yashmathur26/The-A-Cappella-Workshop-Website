import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/Footer";
import { VisitorStats } from "@/components/VisitorStats";
import { LocationProvider, useLocation as useLocationContext } from "@/contexts/LocationContext";
import { useVisitTracker } from "@/hooks/use-visit-tracker";
import Home from "@/pages/home";
import About from "@/pages/about";
import FAQ from "@/pages/faq";
import Gallery from "@/pages/gallery";
import CampRegistration from "@/pages/camp-registration";
import Status from "@/pages/status";
import NotFound from "@/pages/not-found";

function LocationAwareHome({ location: routeLocation }: { location: 'lexington' | 'newton-wellesley' | 'wayland' }) {
  const { setLocation } = useLocationContext();
  
  useEffect(() => {
    setLocation(routeLocation);
  }, [routeLocation, setLocation]);
  
  return <Home />;
}

function LocationAwareRegistration({ location: routeLocation }: { location: 'lexington' | 'newton-wellesley' | 'wayland' }) {
  const { setLocation, currentLocation } = useLocationContext();
  const [location] = useLocation();
  
  useEffect(() => {
    // Always set the location based on the route, regardless of current location
    setLocation(routeLocation);
  }, [routeLocation, setLocation]);
  
  // If user switches location while on registration page, redirect to home for that location
  useEffect(() => {
    if (currentLocation !== routeLocation && (location.includes('/register') || location.includes('/camp-registration'))) {
      // User changed location while on registration page - redirect to home
      if (currentLocation === 'lexington') {
        window.location.href = '/';
      } else if (currentLocation === 'newton-wellesley') {
        window.location.href = '/newton';
      } else if (currentLocation === 'wayland') {
        window.location.href = '/wayland';
      }
    }
  }, [currentLocation, routeLocation, location]);
  
  return <CampRegistration />;
}

function Router() {
  const [location] = useLocation();
  
  // Track visits automatically
  useVisitTracker();
  
  // Show footer on all pages except registration pages
  const showFooter = !location.startsWith('/camp-registration') && 
                     !location.startsWith('/register');
  
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/newton/camp-registration">
          <LocationAwareRegistration location="newton-wellesley" />
        </Route>
        <Route path="/newton/register">
          <LocationAwareRegistration location="newton-wellesley" />
        </Route>
        <Route path="/wayland/camp-registration">
          <LocationAwareRegistration location="wayland" />
        </Route>
        <Route path="/wayland/register">
          <LocationAwareRegistration location="wayland" />
        </Route>
        <Route path="/newton">
          <LocationAwareHome location="newton-wellesley" />
        </Route>
        <Route path="/wayland">
          <LocationAwareHome location="wayland" />
        </Route>
        <Route path="/">
          <LocationAwareHome location="lexington" />
        </Route>
        <Route path="/about" component={About} />
        <Route path="/faq" component={FAQ} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/camp-registration" component={CampRegistration} />
        <Route path="/register" component={CampRegistration} />
        <Route path="/success" component={Status} />
        <Route component={NotFound} />
      </Switch>
      {showFooter && <Footer />}
      {/* Visitor Counter - Fixed bottom left, only on home pages */}
      {(location === '/' || location === '/newton' || location === '/wayland') && (
        <div className="fixed bottom-4 left-4 z-30">
          <VisitorStats />
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocationProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LocationProvider>
    </QueryClientProvider>
  );
}

export default App;
