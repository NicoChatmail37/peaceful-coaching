import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyProvider } from "@/hooks/useCompany";
import { SelectedClientProvider } from "@/contexts/SelectedClientContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useModelOnboarding } from "@/hooks/useModelOnboarding";
import { PrepareDayModal } from "@/components/transcription/PrepareDayModal";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  // Enable session timeout for authenticated users
  useSessionTimeout({ 
    timeoutMinutes: 30, 
    warningMinutes: 5, 
    enabled: true 
  });

  // Model onboarding for transcription
  const {
    showModal,
    environment,
    preferences,
    downloadProgress,
    probeAndShow,
    handlePrepareModel,
    handleSkip,
    handleNeverShow,
    setShowModal
  } = useModelOnboarding();

  // Probe environment on mount
  useEffect(() => {
    probeAndShow();
  }, []);
  
  return (
    <>
      <PrepareDayModal
        open={showModal}
        onOpenChange={setShowModal}
        environment={environment}
        onPrepareModel={handlePrepareModel}
        onSkip={handleSkip}
        onNeverShow={handleNeverShow}
      />
    <BrowserRouter>
      <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/clients" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/products" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CompanyProvider>
        <SelectedClientProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </SelectedClientProvider>
      </CompanyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
