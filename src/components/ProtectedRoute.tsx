import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import { Sparkles, Star, Heart } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, initializeAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize auth on mount
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF] flex items-center justify-center">
        {/* Whimsical floating shapes */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[#F269BF]/20 rounded-full blur-3xl animate-pulse-slow" />
        
        {/* Decorative elements */}
        <Star className="absolute top-32 left-[15%] w-6 h-6 text-[#F5B485] animate-pulse fill-[#F5B485]" />
        <Star className="absolute bottom-32 right-[20%] w-4 h-4 text-[#F269BF] animate-pulse fill-[#F269BF] animation-delay-2000" />
        <Heart className="absolute top-1/4 right-[10%] w-5 h-5 text-[#F269BF]/60 animate-float fill-[#F269BF]/40" />

        <div className="relative text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/40 mx-auto mb-4 animate-bounce-gentle">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <p className="text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
