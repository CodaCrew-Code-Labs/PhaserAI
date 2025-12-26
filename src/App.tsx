import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { useAuthStore } from '@/lib/auth-store';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import LanguageSetup from './pages/LanguageSetup';
import LanguageDetail from './pages/LanguageDetail';
import LexiconManager from './pages/LexiconManager';
import Analytics from './pages/Analytics';
import EtymologyTree from './pages/EtymologyTree';
import NotFound from './pages/NotFound';
import { AlertCircle, Star, Heart } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,
    },
  },
});

const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => (
  <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF] flex items-center justify-center">
    {/* Whimsical floating shapes */}
    <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
    <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
    <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[#F269BF]/20 rounded-full blur-3xl animate-pulse-slow" />

    {/* Decorative elements */}
    <Star className="absolute top-32 left-[15%] w-6 h-6 text-[#F5B485] animate-pulse fill-[#F5B485]" />
    <Heart className="absolute bottom-1/3 right-[10%] w-5 h-5 text-[#F269BF]/60 animate-float fill-[#F269BF]/40" />

    <div className="relative max-w-md w-full mx-4">
      <div className="bg-white/80 border-2 border-red-200 rounded-3xl p-8 text-center backdrop-blur-sm shadow-xl">
        <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200">
          <AlertCircle className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h1>
        <p className="text-slate-500 mb-4">We encountered an unexpected error 😢</p>
        <pre className="text-xs text-left bg-red-50 p-4 rounded-xl mb-4 overflow-auto max-h-32 text-red-600 border border-red-200">
          {error.message}
        </pre>
        <div className="flex gap-2 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="px-6 py-2 bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] text-white rounded-full font-bold shadow-lg shadow-[#F269BF]/40 hover:opacity-90 transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-2 bg-white border-2 border-[#DDBCEE] text-slate-600 rounded-full font-bold hover:bg-[#DDBCEE]/20 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Auth initializer component
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary
    FallbackComponent={ErrorFallback}
    onError={(error, errorInfo) => {
      if (import.meta.env.DEV) {
        console.error('Error caught by boundary:', error, errorInfo);
      }
    }}
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthInitializer>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/language/new"
                element={
                  <ProtectedRoute>
                    <LanguageSetup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/language/:id"
                element={
                  <ProtectedRoute>
                    <LanguageDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/language/:id/words"
                element={
                  <ProtectedRoute>
                    <LexiconManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/language/:id/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/language/:id/etymology/:wordId"
                element={
                  <ProtectedRoute>
                    <EtymologyTree />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthInitializer>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
