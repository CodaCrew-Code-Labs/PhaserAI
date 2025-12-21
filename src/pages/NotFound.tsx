import { Button } from '@/components/ui/button';
import { Star, Heart } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF] flex flex-col items-center justify-center p-6 text-center">
      {/* Whimsical floating shapes */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[#F269BF]/20 rounded-full blur-3xl animate-pulse-slow" />
      
      {/* Decorative elements */}
      <Star className="absolute top-32 left-[15%] w-6 h-6 text-[#F5B485] animate-pulse fill-[#F5B485]" />
      <Star className="absolute bottom-32 right-[20%] w-4 h-4 text-[#F269BF] animate-pulse fill-[#F269BF] animation-delay-2000" />
      <Heart className="absolute top-1/4 right-[10%] w-5 h-5 text-[#F269BF]/60 animate-float fill-[#F269BF]/40" />

      <div className="relative space-y-6 max-w-md">
        <div className="space-y-4">
          <h1 className="text-9xl font-black bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-3xl font-bold text-slate-800">Page Not Found</h2>
          <p className="text-slate-500 text-lg">
            The page you're looking for doesn't exist or may have been moved 🔍
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button 
            asChild
            className="bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white font-bold rounded-full px-8 shadow-lg shadow-[#F269BF]/40"
          >
            <a href="/">Return Home</a>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="border-2 border-[#DDBCEE] text-[#748BF6] hover:bg-[#DDBCEE]/20 hover:border-[#F269BF] font-bold rounded-full px-8"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
