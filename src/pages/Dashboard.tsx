import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LogOut, Plus, Languages, BookOpen, AlertCircle, Sparkles, Star, Heart } from 'lucide-react';

interface Language {
  id: string;
  name: string;
  phonemes: {
    consonants: string[];
    vowels: string[];
    diphthongs: string[];
  };
  syllables: string;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    setEmailVerified(user.emailVerified);
    loadLanguages();
  }, [user, navigate]);

  const loadLanguages = async () => {
    if (!user) return;

    try {
      const data = await api.getLanguages(user.userId);
      setLanguages(data || []);
    } catch (error) {
      console.error('Error loading languages:', error);
      toast.error('Failed to load languages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) return;
    
    try {
      // For Cognito, we need to use the resend code function
      const { cognitoResendCode } = await import('@/lib/auth');
      await cognitoResendCode(user.email);
      toast.success('Verification email sent! Check your inbox.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send verification email';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF]">
      {/* Whimsical floating shapes */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[#F269BF]/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-[#F5B485]/25 rounded-full blur-3xl animate-float" />
      
      {/* Decorative elements */}
      <Star className="absolute top-32 left-[15%] w-6 h-6 text-[#F5B485] animate-pulse fill-[#F5B485]" />
      <Star className="absolute top-48 right-[20%] w-4 h-4 text-[#F269BF] animate-pulse fill-[#F269BF] animation-delay-2000" />
      <Heart className="absolute bottom-1/3 left-[10%] w-5 h-5 text-[#F269BF]/60 animate-float fill-[#F269BF]/40" />
      
      <div className="relative container max-w-7xl mx-auto py-12 px-6">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/30 rotate-3">
                <span className="text-white font-black text-2xl">P</span>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] bg-clip-text text-transparent">
                  PhaserAI
                </h1>
                <p className="text-sm text-[#748BF6] font-semibold">Dashboard</p>
              </div>
            </div>
            <p className="text-slate-600 text-lg">Welcome back, <span className="text-[#F269BF] font-semibold relative z-10">{user?.username || user?.email?.split('@')[0] || 'User'}</span> ✨</p>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleSignOut}
            className="text-slate-600 hover:text-[#F269BF] hover:bg-[#DDBCEE]/20 rounded-full px-6 transition-all duration-300"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {!emailVerified && (
          <Alert className="mb-8 bg-gradient-to-r from-[#F5B485]/20 to-[#F269BF]/20 border-2 border-[#F5B485]/40 rounded-2xl">
            <AlertCircle className="h-5 w-5 text-[#F5B485]" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">
                Please verify your email address to access all features ✉️
              </span>
              <Button 
                variant="link" 
                onClick={resendVerificationEmail} 
                className="text-[#F269BF] hover:text-[#748BF6] font-bold"
              >
                Resend Email
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#A1FBFC]/40 hover:border-[#A1FBFC] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#A1FBFC]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A1FBFC]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-14 h-14 bg-gradient-to-br from-[#A1FBFC] to-[#748BF6] rounded-2xl flex items-center justify-center shadow-lg shadow-[#A1FBFC]/40 group-hover:rotate-6 transition-transform duration-300">
                  <Languages className="h-7 w-7 text-white" />
                </div>
                <div className="h-3 w-3 rounded-full bg-[#A1FBFC] animate-pulse" />
              </div>
              <CardTitle className="text-slate-600 text-sm font-semibold uppercase tracking-wider">Languages</CardTitle>
              <CardDescription className="text-slate-500 text-xs">Constructed languages</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-5xl font-black text-slate-800">{languages.length}</div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#DDBCEE]/40 hover:border-[#DDBCEE] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#DDBCEE]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#DDBCEE]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-14 h-14 bg-gradient-to-br from-[#DDBCEE] to-[#F269BF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#DDBCEE]/40 group-hover:rotate-6 transition-transform duration-300">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <div className="h-3 w-3 rounded-full bg-[#DDBCEE] animate-pulse" />
              </div>
              <CardTitle className="text-slate-600 text-sm font-semibold uppercase tracking-wider">Total Words</CardTitle>
              <CardDescription className="text-slate-500 text-xs">Lexicon entries</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-5xl font-black text-slate-800">0</div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#F5B485]/40 hover:border-[#F5B485] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#F5B485]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5B485]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-14 h-14 bg-gradient-to-br from-[#F5B485] to-[#F269BF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F5B485]/40 group-hover:rotate-6 transition-transform duration-300">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div className="h-3 w-3 rounded-full bg-[#F5B485] animate-pulse" />
              </div>
              <CardTitle className="text-slate-600 text-sm font-semibold uppercase tracking-wider">AI Checks</CardTitle>
              <CardDescription className="text-slate-500 text-xs">Collision detections</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-5xl font-black text-slate-800">0</div>
            </CardContent>
          </Card>
        </div>

        {/* Languages Section Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800 mb-1">Your Languages</h2>
            <p className="text-slate-500">Manage and explore your constructed languages ✨</p>
          </div>
          <Button 
            onClick={() => navigate('/language/new')}
            className="bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white font-bold rounded-full px-8 shadow-lg shadow-[#F269BF]/40 hover:shadow-[#F269BF]/60 hover:scale-105 transition-all duration-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Language
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/40 mx-auto mb-4 animate-bounce-gentle">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <p className="text-slate-500 font-medium">Loading your languages...</p>
            </div>
          </div>
        ) : languages.length === 0 ? (
          <Card className="relative overflow-hidden bg-gradient-to-br from-[#DDBCEE]/30 via-[#F269BF]/20 to-[#F5B485]/30 border-2 border-[#F269BF]/30 rounded-[2rem] shadow-xl backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#A1FBFC]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#748BF6]/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            <Star className="absolute top-8 right-12 w-8 h-8 text-[#F5B485] animate-pulse fill-[#F5B485]" />
            <CardContent className="relative flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-3xl flex items-center justify-center shadow-xl shadow-[#F269BF]/40 mb-6 rotate-6">
                <Languages className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-3xl font-black text-slate-800 mb-3">No languages yet</h3>
              <p className="text-slate-600 mb-8 text-center max-w-md">Create your first constructed language and start building your unique linguistic system ✨</p>
              <Button 
                onClick={() => navigate('/language/new')}
                className="bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white font-bold text-lg px-10 py-6 rounded-full shadow-xl shadow-[#F269BF]/40 hover:shadow-[#F269BF]/60 hover:scale-105 transition-all duration-300"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Language
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {languages.map((language, index) => {
              const colors = [
                { border: 'border-[#A1FBFC]', bg: 'from-[#A1FBFC]/20 to-[#748BF6]/20', shadow: 'shadow-[#A1FBFC]/30', accent: '#A1FBFC' },
                { border: 'border-[#DDBCEE]', bg: 'from-[#DDBCEE]/20 to-[#F269BF]/20', shadow: 'shadow-[#DDBCEE]/30', accent: '#DDBCEE' },
                { border: 'border-[#F269BF]', bg: 'from-[#F269BF]/20 to-[#F5B485]/20', shadow: 'shadow-[#F269BF]/30', accent: '#F269BF' },
                { border: 'border-[#F5B485]', bg: 'from-[#F5B485]/20 to-[#748BF6]/20', shadow: 'shadow-[#F5B485]/30', accent: '#F5B485' },
                { border: 'border-[#748BF6]', bg: 'from-[#748BF6]/20 to-[#A1FBFC]/20', shadow: 'shadow-[#748BF6]/30', accent: '#748BF6' },
              ];
              const color = colors[index % colors.length];
              
              return (
                <Card 
                  key={language.id} 
                  className={`group relative overflow-hidden bg-white/70 border-2 ${color.border}/40 hover:${color.border} rounded-3xl transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-xl hover:${color.shadow} backdrop-blur-sm`}
                  onClick={() => navigate(`/language/${language.id}`)}
                >
                  <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${color.bg} rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />
                  
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-2xl font-black text-slate-800 mb-1">
                          {language.name}
                        </CardTitle>
                        <CardDescription className="text-slate-500 text-xs">
                          Created {new Date(language.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge className="bg-gradient-to-r from-[#748BF6] to-[#F269BF] text-white border-0 font-bold rounded-full px-3">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-slate-200/50">
                      <span className="text-slate-600 text-sm font-medium">Consonants</span>
                      <span className="text-slate-800 font-black text-lg">{language.phonemes.consonants.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-slate-200/50">
                      <span className="text-slate-600 text-sm font-medium">Vowels</span>
                      <span className="text-slate-800 font-black text-lg">{language.phonemes.vowels.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-slate-200/50">
                      <span className="text-slate-600 text-sm font-medium">Syllable Pattern</span>
                      <span className="text-slate-800 font-mono font-bold">{language.syllables}</span>
                    </div>
                  </CardContent>
                  
                  {/* Hover Arrow */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#748BF6] to-[#F269BF] flex items-center justify-center shadow-lg">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
