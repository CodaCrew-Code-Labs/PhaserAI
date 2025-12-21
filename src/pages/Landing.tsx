import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Languages, Search, Sparkles, Zap, Shield, Star, Heart, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF]">
      {/* Whimsical floating shapes */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[#F269BF]/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-[#F5B485]/25 rounded-full blur-3xl animate-float" />
      <div className="absolute top-1/2 right-10 w-48 h-48 bg-[#748BF6]/30 rounded-full blur-2xl animate-float-delayed" />
      
      {/* Decorative stars */}
      <Star className="absolute top-32 left-[15%] w-6 h-6 text-[#F5B485] animate-pulse fill-[#F5B485]" />
      <Star className="absolute top-48 right-[20%] w-4 h-4 text-[#F269BF] animate-pulse fill-[#F269BF] animation-delay-2000" />
      <Star className="absolute bottom-1/3 left-[10%] w-5 h-5 text-[#748BF6] animate-pulse fill-[#748BF6] animation-delay-4000" />
      <Star className="absolute top-[60%] right-[15%] w-4 h-4 text-[#DDBCEE] animate-pulse fill-[#DDBCEE]" />
      <Heart className="absolute top-40 right-[30%] w-5 h-5 text-[#F269BF]/60 animate-float fill-[#F269BF]/40" />
      <Heart className="absolute bottom-[40%] left-[25%] w-4 h-4 text-[#F5B485]/60 animate-float-delayed fill-[#F5B485]/40" />

      {/* Header */}
      <header className="relative border-b border-[#DDBCEE]/30 bg-white/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/30 rotate-3 hover:rotate-6 transition-transform duration-300">
              <span className="text-white font-black text-2xl drop-shadow-sm">P</span>
            </div>
            <div>
              <span className="text-2xl font-black bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] bg-clip-text text-transparent">
                PhaserAI
              </span>
              <p className="text-xs text-[#748BF6] font-semibold tracking-wide">From a Conlanger For Conlangers</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-[#748BF6] hover:text-[#F269BF] hover:bg-[#DDBCEE]/20 font-semibold rounded-full px-6 transition-all duration-300">
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white font-bold rounded-full px-6 shadow-lg shadow-[#F269BF]/40 hover:shadow-[#F269BF]/60 hover:scale-105 transition-all duration-300">
                Sign Up Free ✨
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 py-20 text-center">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="inline-block animate-bounce">
            <span className="px-5 py-2.5 bg-gradient-to-r from-[#DDBCEE]/50 via-[#A1FBFC]/50 to-[#F5B485]/50 border-2 border-[#F269BF]/30 rounded-full text-[#748BF6] text-sm font-bold tracking-wide backdrop-blur-sm shadow-lg">
              ✨ AI-Powered Conlang Creation ✨
            </span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-slate-800 leading-tight tracking-tight">
            Build Phonologically-Valid
            <br />
            <span className="bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] bg-clip-text text-transparent">
              Lexicons with AI
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            PhaserAI empowers conlang creators with <span className="text-[#748BF6] font-bold">AI-powered collision detection</span>, 
            <span className="text-[#F269BF] font-bold"> multi-language search</span>, 
            and <span className="text-[#F5B485] font-bold">phonological validation</span>. Build consistent, authentic constructed languages.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link to="/signup">
              <Button size="lg" className="bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white text-lg font-bold px-10 py-7 rounded-full shadow-xl shadow-[#F269BF]/40 hover:shadow-[#F269BF]/60 hover:scale-105 transition-all duration-300">
                Get Started Free
                <Wand2 className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-2 border-[#DDBCEE] text-[#748BF6] hover:bg-[#DDBCEE]/20 hover:border-[#F269BF] text-lg font-bold px-10 py-7 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105">
              View Demo
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          {/* Colorful badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#A1FBFC]/30 rounded-full border border-[#A1FBFC]/50">
              <Sparkles className="h-4 w-4 text-[#748BF6]" />
              <span className="text-sm font-semibold text-[#748BF6]">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#DDBCEE]/30 rounded-full border border-[#DDBCEE]/50">
              <Brain className="h-4 w-4 text-[#F269BF]" />
              <span className="text-sm font-semibold text-[#F269BF]">Linguistically Sound</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#F5B485]/30 rounded-full border border-[#F5B485]/50">
              <Heart className="h-4 w-4 text-[#F5B485]" />
              <span className="text-sm font-semibold text-[#F5B485]">Made with Love</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-4">
            Everything You Need to Build Your Conlang
          </h2>
          <p className="text-xl bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] bg-clip-text text-transparent font-bold">
            Professional tools for serious language creators ✨
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#A1FBFC]/40 hover:border-[#A1FBFC] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#A1FBFC]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A1FBFC]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#A1FBFC] to-[#748BF6] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#A1FBFC]/40 group-hover:rotate-6 transition-transform duration-300">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-slate-800 text-xl font-bold">AI Collision Detection</CardTitle>
              <CardDescription className="text-slate-600 text-base">
                Semantic similarity checking prevents duplicate meanings in your lexicon
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#748BF6]/40 hover:border-[#748BF6] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#748BF6]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#748BF6]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#748BF6] to-[#DDBCEE] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#748BF6]/40 group-hover:rotate-6 transition-transform duration-300">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-slate-800 text-xl font-bold">Phonological Validation</CardTitle>
              <CardDescription className="text-slate-600 text-base">
                Real-time validation ensures all words follow your phonotactic rules
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#DDBCEE]/40 hover:border-[#DDBCEE] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#DDBCEE]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#DDBCEE]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#DDBCEE] to-[#F269BF] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#DDBCEE]/40 group-hover:rotate-6 transition-transform duration-300">
                <Languages className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-slate-800 text-xl font-bold">Multi-Language Search</CardTitle>
              <CardDescription className="text-slate-600 text-base">
                Search across English, Arabic, Hindi and more with instant results
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#F269BF]/40 hover:border-[#F269BF] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#F269BF]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F269BF]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#F269BF]/40 group-hover:rotate-6 transition-transform duration-300">
                <Search className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-slate-800 text-xl font-bold">Advanced Filtering</CardTitle>
              <CardDescription className="text-slate-600 text-base">
                Filter by POS, root words, language, and more for precise control
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#F5B485]/40 hover:border-[#F5B485] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#F5B485]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5B485]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F5B485] to-[#F269BF] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#F5B485]/40 group-hover:rotate-6 transition-transform duration-300">
                <Wand2 className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-slate-800 text-xl font-bold">Word Generator</CardTitle>
              <CardDescription className="text-slate-600 text-base">
                AI-powered word generation following your phonological constraints
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#A1FBFC]/40 hover:border-[#A1FBFC] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#A1FBFC]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A1FBFC]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#A1FBFC] to-[#748BF6] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#A1FBFC]/40 group-hover:rotate-6 transition-transform duration-300">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-slate-800 text-xl font-bold">Secure & Private</CardTitle>
              <CardDescription className="text-slate-600 text-base">
                Your languages are private with enterprise-grade security
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative container mx-auto px-4 py-20">
        <Card className="relative overflow-hidden bg-gradient-to-br from-[#DDBCEE]/40 via-[#F269BF]/30 to-[#F5B485]/40 border-2 border-[#F269BF]/30 rounded-[2rem] shadow-2xl shadow-[#F269BF]/20 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#A1FBFC]/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#748BF6]/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          <Star className="absolute top-8 right-12 w-8 h-8 text-[#F5B485] animate-pulse fill-[#F5B485]" />
          <Star className="absolute bottom-12 left-16 w-6 h-6 text-[#748BF6] animate-pulse fill-[#748BF6] animation-delay-2000" />
          <CardContent className="relative p-12 md:p-16 text-center">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="inline-block">
                <div className="w-20 h-20 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-3xl flex items-center justify-center shadow-xl shadow-[#F269BF]/40 rotate-6 mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-800 leading-tight">
                Ready to Phase Your Phonology?
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                Join conlang creators building authentic, phonologically-valid languages with AI assistance
              </p>
              <div className="pt-4">
                <Link to="/signup">
                  <Button size="lg" className="bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white font-black text-xl px-12 py-8 rounded-full shadow-xl shadow-[#F269BF]/50 hover:shadow-[#F269BF]/70 hover:scale-105 transition-all duration-300">
                    Start Building Free ✨
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-[#DDBCEE]/30 bg-white/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-xl flex items-center justify-center shadow-lg shadow-[#F269BF]/30 rotate-3">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <div>
                <span className="text-slate-600 font-medium">© 2025 PhaserAI</span>
                <p className="text-xs text-[#F269BF] font-semibold">From a Conlanger For Conlangers 💜</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-slate-500">
              <a href="#" className="hover:text-[#748BF6] transition-colors duration-300 font-medium">Privacy</a>
              <a href="#" className="hover:text-[#F269BF] transition-colors duration-300 font-medium">Terms</a>
              <a href="#" className="hover:text-[#F5B485] transition-colors duration-300 font-medium">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
