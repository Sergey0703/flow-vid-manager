import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";
import Agents from "./pages/Agents";
import Shop from "./pages/Shop";
import HotelDemo from "./pages/HotelDemo";

const queryClient = new QueryClient();

const ScrollToHash = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    // Wait for page render then scroll to the element
    const id = hash.slice(1);
    const tryScroll = (attempts: number) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else if (attempts > 0) {
        setTimeout(() => tryScroll(attempts - 1), 100);
      }
    };
    setTimeout(() => tryScroll(10), 50);
  }, [pathname, hash]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToHash />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/hotel-demo" element={<HotelDemo />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
