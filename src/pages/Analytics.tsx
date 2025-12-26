import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface Language {
  id: string;
  name: string;
  user_id: string;
}

export default function Analytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [language, setLanguage] = useState<Language | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) {
      navigate('/dashboard');
      return;
    }
    loadLanguage();
  }, [user, id, navigate]);

  const loadLanguage = async () => {
    if (!id) return;

    try {
      const data = await api.getLanguage(id);

      if (!data) {
        toast.error('Language not found');
        navigate('/dashboard');
        return;
      }

      // Check ownership
      if (data.user_id !== user?.userId) {
        toast.error('You do not have permission to access this language');
        navigate('/dashboard');
        return;
      }

      setLanguage(data);
    } catch (error) {
      console.error('Error loading language:', error);
      toast.error('Failed to load language');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF] flex items-center justify-center">
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
        <div className="relative text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/40 mx-auto mb-4 animate-bounce-gentle">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <p className="text-slate-500 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!language) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF]">
      {/* Whimsical floating shapes */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[#F269BF]/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-[#F5B485]/25 rounded-full blur-3xl animate-float" />

      <div className="relative container max-w-7xl mx-auto py-12 px-6">
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/language/${id}`)}
            className="text-slate-600 hover:text-[#F269BF] hover:bg-[#DDBCEE]/20 rounded-full px-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Language
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Analytics</h1>
          <p className="text-slate-600 text-lg">
            Insights and statistics for <span className="font-semibold text-[#F269BF]">{language.name}</span>
          </p>
        </div>

        {/* Placeholder content */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#A1FBFC]/40 hover:border-[#A1FBFC] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#A1FBFC]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A1FBFC]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2 text-slate-700 font-semibold">
                <div className="w-10 h-10 bg-gradient-to-br from-[#A1FBFC] to-[#748BF6] rounded-xl flex items-center justify-center shadow-lg shadow-[#A1FBFC]/40">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                Usage Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-slate-500 text-sm">
                Coming soon! Track how your language usage evolves over time.
              </p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#DDBCEE]/40 hover:border-[#DDBCEE] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#DDBCEE]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#DDBCEE]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2 text-slate-700 font-semibold">
                <div className="w-10 h-10 bg-gradient-to-br from-[#DDBCEE] to-[#F269BF] rounded-xl flex items-center justify-center shadow-lg shadow-[#DDBCEE]/40">
                  <PieChart className="h-5 w-5 text-white" />
                </div>
                Phoneme Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-slate-500 text-sm">
                Coming soon! Visualize the distribution of phonemes in your language.
              </p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#F5B485]/40 hover:border-[#F5B485] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#F5B485]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5B485]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2 text-slate-700 font-semibold">
                <div className="w-10 h-10 bg-gradient-to-br from-[#F5B485] to-[#F269BF] rounded-xl flex items-center justify-center shadow-lg shadow-[#F5B485]/40">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                Word Complexity
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-slate-500 text-sm">
                Coming soon! Analyze syllable patterns and word complexity metrics.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 relative overflow-hidden bg-white/80 border-2 border-[#DDBCEE]/40 rounded-3xl shadow-xl backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#A1FBFC]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="relative border-b border-[#DDBCEE]/30">
            <CardTitle className="text-2xl font-bold text-slate-800">Analytics Dashboard</CardTitle>
            <CardDescription className="text-slate-500">
              Comprehensive insights into your constructed language
            </CardDescription>
          </CardHeader>
          <CardContent className="relative pt-6">
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-3xl flex items-center justify-center shadow-xl shadow-[#F269BF]/40 mx-auto mb-6 rotate-6">
                <BarChart3 className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">Analytics Coming Soon!</h3>
              <p className="text-slate-600 mb-6 text-lg max-w-2xl mx-auto">
                We're building powerful analytics tools to help you understand your language's patterns, 
                usage statistics, and evolution over time. Stay tuned for exciting insights! ✨
              </p>
              <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto text-sm text-slate-500">
                <div className="p-4 bg-[#A1FBFC]/10 rounded-xl border border-[#A1FBFC]/30">
                  <TrendingUp className="h-6 w-6 text-[#748BF6] mx-auto mb-2" />
                  <p className="font-medium">Usage Patterns</p>
                </div>
                <div className="p-4 bg-[#DDBCEE]/10 rounded-xl border border-[#DDBCEE]/30">
                  <PieChart className="h-6 w-6 text-[#F269BF] mx-auto mb-2" />
                  <p className="font-medium">Phoneme Analysis</p>
                </div>
                <div className="p-4 bg-[#F5B485]/10 rounded-xl border border-[#F5B485]/30">
                  <Activity className="h-6 w-6 text-[#F5B485] mx-auto mb-2" />
                  <p className="font-medium">Complexity Metrics</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}