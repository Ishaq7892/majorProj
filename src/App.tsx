import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Index from "./pages/Index";

// Lazy load pages for performance
const TrafficStatus = lazy(() => import("./pages/TrafficStatus"));
const Upload = lazy(() => import("./pages/Upload"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AIPrediction = lazy(() => import("./pages/AIPrediction"));
const LaneDetail = lazy(() => import("./pages/LaneDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <Index />
                    </main>
                    <Footer />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/status/:area" element={
                <ProtectedRoute>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <TrafficStatus />
                    </main>
                    <Footer />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/upload" element={
                <ProtectedRoute>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <Upload />
                    </main>
                    <Footer />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <Analytics />
                    </main>
                    <Footer />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/ai-prediction" element={
                <ProtectedRoute>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <AIPrediction />
                    </main>
                    <Footer />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/lane/:areaId/:laneId" element={
                <ProtectedRoute>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <LaneDetail />
                    </main>
                    <Footer />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
