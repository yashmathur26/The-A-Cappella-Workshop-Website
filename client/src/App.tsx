import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/Footer";
import { LocationProvider, useLocation as useLocationContext } from "@/contexts/LocationContext";
import Home from "@/pages/home";
import About from "@/pages/about";
import FAQ from "@/pages/faq";
import Gallery from "@/pages/gallery";
import CampRegistration from "@/pages/camp-registration";
import Status from "@/pages/status";
import NotFound from "@/pages/not-found";

function LocationRedirect({ toLocation, redirectTo = '/' }: { toLocation: 'newton-wellesley' | 'wayland', redirectTo?: string }) {
  const { setLocation } = useLocationContext();
  const [, setRoute] = useLocation();
  
  useEffect(() => {
    setLocation(toLocation);
    if (redirectTo) {
      setRoute(redirectTo);
    }
  }, [toLocation, redirectTo, setLocation, setRoute]);
  
  return null;
}

function LocationAwareRegistration({ location: routeLocation }: { location: 'lexington' | 'newton-wellesley' | 'wayland' }) {
  const { setLocation, currentLocation } = useLocationContext();
  
  useEffect(() => {
    if (currentLocation !== routeLocation) {
      setLocation(routeLocation);
    }
  }, [routeLocation, currentLocation, setLocation]);
  
  return <CampRegistration />;
}

function Router() {
  const [location] = useLocation();
  
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
          <LocationRedirect toLocation="newton-wellesley" />
        </Route>
        <Route path="/wayland">
          <LocationRedirect toLocation="wayland" />
        </Route>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/faq" component={FAQ} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/camp-registration" component={CampRegistration} />
        <Route path="/register" component={CampRegistration} />
        <Route path="/success" component={Status} />
        <Route component={NotFound} />
      </Switch>
      {showFooter && <Footer />}
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
