import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlphabetDisplay } from '@/components/AlphabetDisplay';
import { IPAChart } from '@/components/IPAChart';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X, Save, Trash2, Edit2, BookOpen, Sparkles, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const languageSchema = z.object({
  name: z.string().min(1, 'Language name is required').max(100),
  consonants: z.string().min(1, 'At least one consonant is required'),
  vowels: z.string().min(1, 'At least one vowel is required'),
  diphthongs: z.string().optional(),
  syllables: z.string().min(1, 'Syllable structure is required'),
  rules: z.string().optional(),
});

type LanguageFormData = z.infer<typeof languageSchema>;

interface Language {
  id: string;
  user_id: string;
  name: string;
  phonemes: {
    consonants: string[];
    vowels: string[];
    diphthongs: string[];
  };
  alphabet_mappings?: {
    consonants: { [key: string]: string };
    vowels: { [key: string]: string };
    diphthongs: { [key: string]: string };
  };
  syllables: string;
  rules: string;
  created_at: string;
}

export default function LanguageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [language, setLanguage] = useState<Language | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [consonantTags, setConsonantTags] = useState<string[]>([]);
  const [vowelTags, setVowelTags] = useState<string[]>([]);
  const [diphthongTags, setDiphthongTags] = useState<string[]>([]);
  const [consonantMappings, setConsonantMappings] = useState<{[key: string]: string}>({});
  const [vowelMappings, setVowelMappings] = useState<{[key: string]: string}>({});
  const [diphthongMappings, setDiphthongMappings] = useState<{[key: string]: string}>({});
  const [currentConsonant, setCurrentConsonant] = useState('');
  const [currentConsonantAlphabet, setCurrentConsonantAlphabet] = useState('');
  const [currentVowel, setCurrentVowel] = useState('');
  const [currentVowelAlphabet, setCurrentVowelAlphabet] = useState('');
  const [currentDiphthong, setCurrentDiphthong] = useState('');
  const [currentDiphthongAlphabet, setCurrentDiphthongAlphabet] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const form = useForm<LanguageFormData>({
    resolver: zodResolver(languageSchema),
    defaultValues: {
      name: '',
      consonants: '',
      vowels: '',
      diphthongs: '',
      syllables: 'CV',
      rules: '',
    },
  });

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
      setConsonantTags(data.phonemes.consonants || []);
      setVowelTags(data.phonemes.vowels || []);
      setDiphthongTags(data.phonemes.diphthongs || []);
      
      // Load alphabet mappings if they exist
      if (data.alphabet_mappings) {
        setConsonantMappings(data.alphabet_mappings.consonants || {});
        setVowelMappings(data.alphabet_mappings.vowels || {});
        setDiphthongMappings(data.alphabet_mappings.diphthongs || {});
      }

      form.reset({
        name: data.name,
        consonants: (data.phonemes.consonants || []).join(' '),
        vowels: (data.phonemes.vowels || []).join(' '),
        diphthongs: (data.phonemes.diphthongs || []).join(' '),
        syllables: data.syllables,
        rules: data.rules || '',
      });

      // Load word count
      const count = await api.getWordCount(id);
      setWordCount(count);
    } catch (error) {
      console.error('Error loading language:', error);
      toast.error('Failed to load language');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const addConsonant = () => {
    if (currentConsonant.trim() && currentConsonantAlphabet.trim() && !consonantTags.includes(currentConsonant.trim())) {
      const newTags = [...consonantTags, currentConsonant.trim()];
      const newMappings = {...consonantMappings, [currentConsonantAlphabet.trim()]: currentConsonant.trim()};
      setConsonantTags(newTags);
      setConsonantMappings(newMappings);
      form.setValue('consonants', newTags.join(' '));
      setCurrentConsonant('');
      setCurrentConsonantAlphabet('');
    }
  };

  const removeConsonant = (tag: string) => {
    const newTags = consonantTags.filter((t) => t !== tag);
    const alphabetKey = Object.keys(consonantMappings).find(key => consonantMappings[key] === tag);
    const newMappings = {...consonantMappings};
    if (alphabetKey) delete newMappings[alphabetKey];
    setConsonantTags(newTags);
    setConsonantMappings(newMappings);
    form.setValue('consonants', newTags.join(' '));
  };

  const addVowel = () => {
    if (currentVowel.trim() && currentVowelAlphabet.trim() && !vowelTags.includes(currentVowel.trim())) {
      const newTags = [...vowelTags, currentVowel.trim()];
      const newMappings = {...vowelMappings, [currentVowelAlphabet.trim()]: currentVowel.trim()};
      setVowelTags(newTags);
      setVowelMappings(newMappings);
      form.setValue('vowels', newTags.join(' '));
      setCurrentVowel('');
      setCurrentVowelAlphabet('');
    }
  };

  const removeVowel = (tag: string) => {
    const newTags = vowelTags.filter((t) => t !== tag);
    const alphabetKey = Object.keys(vowelMappings).find(key => vowelMappings[key] === tag);
    const newMappings = {...vowelMappings};
    if (alphabetKey) delete newMappings[alphabetKey];
    setVowelTags(newTags);
    setVowelMappings(newMappings);
    form.setValue('vowels', newTags.join(' '));
  };

  const addDiphthong = () => {
    if (currentDiphthong.trim() && currentDiphthongAlphabet.trim() && !diphthongTags.includes(currentDiphthong.trim())) {
      const newTags = [...diphthongTags, currentDiphthong.trim()];
      const newMappings = {...diphthongMappings, [currentDiphthongAlphabet.trim()]: currentDiphthong.trim()};
      setDiphthongTags(newTags);
      setDiphthongMappings(newMappings);
      form.setValue('diphthongs', newTags.join(' '));
      setCurrentDiphthong('');
      setCurrentDiphthongAlphabet('');
    }
  };

  const removeDiphthong = (tag: string) => {
    const newTags = diphthongTags.filter((t) => t !== tag);
    const alphabetKey = Object.keys(diphthongMappings).find(key => diphthongMappings[key] === tag);
    const newMappings = {...diphthongMappings};
    if (alphabetKey) delete newMappings[alphabetKey];
    setDiphthongTags(newTags);
    setDiphthongMappings(newMappings);
    form.setValue('diphthongs', newTags.join(' '));
  };

  const onSubmit = async (data: LanguageFormData) => {
    if (!id) return;

    setIsSaving(true);

    try {
      const updateData = {
        name: data.name,
        phonemes: {
          consonants: consonantTags,
          vowels: vowelTags,
          diphthongs: diphthongTags,
        },
        alphabet_mappings: {
          consonants: consonantMappings,
          vowels: vowelMappings,
          diphthongs: diphthongMappings,
        },
        syllables: data.syllables,
        rules: data.rules || '',
      };

      await api.updateLanguage(id, updateData);

      toast.success('Language updated successfully!');
      setIsEditing(false);
      await loadLanguage();
    } catch (error) {
      console.error('Error updating language:', error);
      const message = error instanceof Error ? error.message : 'Failed to update language';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await api.deleteLanguage(id);

      toast.success('Language deleted successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting language:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete language';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF] flex items-center justify-center">
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
        <div className="relative text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/40 mx-auto mb-4 animate-bounce-gentle">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <p className="text-slate-500 font-medium">Loading language...</p>
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
            onClick={() => navigate('/dashboard')}
            className="text-slate-600 hover:text-[#F269BF] hover:bg-[#DDBCEE]/20 rounded-full px-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex gap-3">
            {!isEditing && (
              <Button 
                onClick={() => setIsEditing(true)} 
                variant="outline"
                className="border-2 border-[#DDBCEE] text-[#748BF6] hover:bg-[#DDBCEE]/20 hover:border-[#F269BF] rounded-full"
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Language
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  className="bg-red-100 hover:bg-red-200 border-2 border-red-300 text-red-600 hover:text-red-700 rounded-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white border-2 border-[#DDBCEE]/40 rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-slate-800">Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500">
                    This will permanently delete "{language.name}" and all associated words. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-2 border-[#DDBCEE] text-slate-600 hover:bg-[#DDBCEE]/20 rounded-full">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white hover:bg-red-600 rounded-full">
                    Delete Language
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#A1FBFC]/40 hover:border-[#A1FBFC] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#A1FBFC]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A1FBFC]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2 text-slate-700 font-semibold">
                <div className="w-10 h-10 bg-gradient-to-br from-[#A1FBFC] to-[#748BF6] rounded-xl flex items-center justify-center shadow-lg shadow-[#A1FBFC]/40">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                Phonemes
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Consonants:</span>
                  <span className="font-bold text-slate-800 text-lg">{consonantTags.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Vowels:</span>
                  <span className="font-bold text-slate-800 text-lg">{vowelTags.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Diphthongs:</span>
                  <span className="font-bold text-slate-800 text-lg">{diphthongTags.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#DDBCEE]/40 hover:border-[#DDBCEE] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#DDBCEE]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#DDBCEE]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2 text-slate-700 font-semibold">
                <div className="w-10 h-10 bg-gradient-to-br from-[#DDBCEE] to-[#F269BF] rounded-xl flex items-center justify-center shadow-lg shadow-[#DDBCEE]/40">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                Lexicon
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-4xl font-bold text-slate-800 mb-1">{wordCount}</div>
              <p className="text-sm text-slate-500">Total words</p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-white/70 border-2 border-[#F5B485]/40 hover:border-[#F5B485] rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#F5B485]/30 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5B485]/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2 text-slate-700 font-semibold">
                <div className="w-10 h-10 bg-gradient-to-br from-[#F5B485] to-[#F269BF] rounded-xl flex items-center justify-center shadow-lg shadow-[#F5B485]/40">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                Created
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-lg font-semibold text-slate-800">{new Date(language.created_at).toLocaleDateString()}</div>
              <p className="text-sm text-slate-500 mt-1">{new Date(language.created_at).toLocaleTimeString()}</p>
            </CardContent>
          </Card>
        </div>

        {isEditing ? (
          <Card className="relative overflow-hidden bg-white/80 border-2 border-[#DDBCEE]/40 rounded-3xl shadow-xl backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#A1FBFC]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative border-b border-[#DDBCEE]/30">
              <CardTitle className="text-2xl font-bold text-slate-800">Edit Language</CardTitle>
              <CardDescription className="text-slate-500 text-sm">Update your language's phonological system and rules</CardDescription>
            </CardHeader>
            <CardContent className="relative pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium text-sm">Language Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Elvish, Klingon, Dothraki" 
                            {...field} 
                            className="bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-xs" />
                      </FormItem>
                    )}
                  />

                  <Tabs defaultValue="consonants" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-white/50 border-2 border-[#DDBCEE]/30 p-1 rounded-2xl">
                      <TabsTrigger 
                        value="consonants"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#A1FBFC] data-[state=active]:to-[#748BF6] data-[state=active]:text-white text-slate-500 rounded-xl font-semibold transition-all"
                      >
                        Consonants
                        {consonantTags.length > 0 && (
                          <Badge className="ml-2 bg-[#A1FBFC]/30 text-[#748BF6] border-0 font-bold">
                            {consonantTags.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="vowels"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#DDBCEE] data-[state=active]:to-[#F269BF] data-[state=active]:text-white text-slate-500 rounded-xl font-semibold transition-all"
                      >
                        Vowels
                        {vowelTags.length > 0 && (
                          <Badge className="ml-2 bg-[#DDBCEE]/30 text-[#F269BF] border-0 font-bold">
                            {vowelTags.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="diphthongs"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F5B485] data-[state=active]:to-[#F269BF] data-[state=active]:text-white text-slate-500 rounded-xl font-semibold transition-all"
                      >
                        Diphthongs
                        {diphthongTags.length > 0 && (
                          <Badge className="ml-2 bg-[#F5B485]/30 text-[#F269BF] border-0 font-bold">
                            {diphthongTags.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="consonants" className="space-y-5 mt-6">
                      <FormField
                        control={form.control}
                        name="consonants"
                        render={() => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-medium">Consonant Inventory</FormLabel>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <FormControl>
                                  <Input
                                    placeholder="Alphabet (e.g., p, th, sh)"
                                    value={currentConsonantAlphabet}
                                    onChange={(e) => setCurrentConsonantAlphabet(e.target.value)}
                                    className="bg-white border-2 border-[#A1FBFC]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-10"
                                  />
                                </FormControl>
                                <FormControl>
                                  <Input
                                    placeholder="IPA (e.g., p, θ, ʃ)"
                                    value={currentConsonant}
                                    onChange={(e) => setCurrentConsonant(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addConsonant();
                                      }
                                    }}
                                    className="bg-white border-2 border-[#A1FBFC]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-10"
                                  />
                                </FormControl>
                              </div>
                              <Button 
                                type="button" 
                                onClick={addConsonant} 
                                className="w-full bg-gradient-to-r from-[#A1FBFC] to-[#748BF6] hover:opacity-90 text-white font-bold rounded-xl h-10"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Consonant
                              </Button>
                            </div>
                            <FormDescription className="text-slate-500 text-xs">Map alphabet letters to IPA symbols. Both fields required.</FormDescription>
                            <div className="flex flex-wrap gap-2 mt-4">
                              {consonantTags.map((tag) => {
                                const alphabetKey = Object.keys(consonantMappings).find(key => consonantMappings[key] === tag);
                                return (
                                  <Badge key={tag} className="px-3 py-1.5 bg-[#A1FBFC]/30 text-[#748BF6] border-2 border-[#A1FBFC]/50 hover:bg-[#A1FBFC]/50 rounded-full font-semibold">
                                    <span className="font-mono">{alphabetKey ? `${alphabetKey} → ${tag}` : tag}</span>
                                    <button type="button" onClick={() => removeConsonant(tag)} className="ml-2 hover:text-red-500 transition-colors">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                            <FormMessage className="text-red-500 text-xs" />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="vowels" className="space-y-5 mt-6">
                      <FormField
                        control={form.control}
                        name="vowels"
                        render={() => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-medium">Vowel Inventory</FormLabel>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <FormControl>
                                  <Input
                                    placeholder="Alphabet (e.g., a, e, i)"
                                    value={currentVowelAlphabet}
                                    onChange={(e) => setCurrentVowelAlphabet(e.target.value)}
                                    className="bg-white border-2 border-[#DDBCEE]/40 focus:border-[#F269BF] text-slate-800 placeholder:text-slate-400 rounded-xl h-10"
                                  />
                                </FormControl>
                                <FormControl>
                                  <Input
                                    placeholder="IPA (e.g., a, e, i)"
                                    value={currentVowel}
                                    onChange={(e) => setCurrentVowel(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addVowel();
                                      }
                                    }}
                                    className="bg-white border-2 border-[#DDBCEE]/40 focus:border-[#F269BF] text-slate-800 placeholder:text-slate-400 rounded-xl h-10"
                                  />
                                </FormControl>
                              </div>
                              <Button 
                                type="button" 
                                onClick={addVowel} 
                                className="w-full bg-gradient-to-r from-[#DDBCEE] to-[#F269BF] hover:opacity-90 text-white font-bold rounded-xl h-10"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Vowel
                              </Button>
                            </div>
                            <FormDescription className="text-slate-500 text-xs">Map alphabet letters to IPA symbols. Both fields required.</FormDescription>
                            <div className="flex flex-wrap gap-2 mt-4">
                              {vowelTags.map((tag) => {
                                const alphabetKey = Object.keys(vowelMappings).find(key => vowelMappings[key] === tag);
                                return (
                                  <Badge key={tag} className="px-3 py-1.5 bg-[#DDBCEE]/30 text-[#F269BF] border-2 border-[#DDBCEE]/50 hover:bg-[#DDBCEE]/50 rounded-full font-semibold">
                                    <span className="font-mono">{alphabetKey ? `${alphabetKey} → ${tag}` : tag}</span>
                                    <button type="button" onClick={() => removeVowel(tag)} className="ml-2 hover:text-red-500 transition-colors">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                            <FormMessage className="text-red-400 text-xs" />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="diphthongs" className="space-y-5 mt-6">
                      <FormField
                        control={form.control}
                        name="diphthongs"
                        render={() => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-medium">Diphthongs (Optional)</FormLabel>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <FormControl>
                                  <Input
                                    placeholder="Alphabet (e.g., ai, ou, ei)"
                                    value={currentDiphthongAlphabet}
                                    onChange={(e) => setCurrentDiphthongAlphabet(e.target.value)}
                                    className="bg-white border-2 border-[#F5B485]/40 focus:border-[#F269BF] text-slate-800 placeholder:text-slate-400 rounded-xl h-10"
                                  />
                                </FormControl>
                                <FormControl>
                                  <Input
                                    placeholder="IPA (e.g., ai, au, oi)"
                                    value={currentDiphthong}
                                    onChange={(e) => setCurrentDiphthong(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addDiphthong();
                                      }
                                    }}
                                    className="bg-white border-2 border-[#F5B485]/40 focus:border-[#F269BF] text-slate-800 placeholder:text-slate-400 rounded-xl h-10"
                                  />
                                </FormControl>
                              </div>
                              <Button 
                                type="button" 
                                onClick={addDiphthong} 
                                className="w-full bg-gradient-to-r from-[#F5B485] to-[#F269BF] hover:opacity-90 text-white font-bold rounded-xl h-10"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Diphthong
                              </Button>
                            </div>
                            <FormDescription className="text-slate-500 text-xs">Map alphabet letters to IPA symbols. Both fields required.</FormDescription>
                            <div className="flex flex-wrap gap-2 mt-4">
                              {diphthongTags.map((tag) => {
                                const alphabetKey = Object.keys(diphthongMappings).find(key => diphthongMappings[key] === tag);
                                return (
                                  <Badge key={tag} className="px-3 py-1.5 bg-[#F5B485]/30 text-[#F269BF] border-2 border-[#F5B485]/50 hover:bg-[#F5B485]/50 rounded-full font-semibold">
                                    <span className="font-mono">{alphabetKey ? `${alphabetKey} → ${tag}` : tag}</span>
                                    <button type="button" onClick={() => removeDiphthong(tag)} className="ml-2 hover:text-red-500 transition-colors">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                            <FormMessage className="text-red-500 text-xs" />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>

                  <FormField
                    control={form.control}
                    name="syllables"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium text-sm">Syllable Structure</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., CV, CVC, CCVC, (C)V(C)" 
                            {...field} 
                            className="bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                          />
                        </FormControl>
                        <FormDescription className="text-slate-500 text-xs">
                          Define allowed syllable patterns. Use C for consonant, V for vowel, () for optional elements.
                        </FormDescription>
                        <FormMessage className="text-red-500 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium text-sm">Phonotactic Rules (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., No consonant clusters at word-final position&#10;/s/ cannot follow /ʃ/&#10;Vowels cannot be adjacent"
                            className="min-h-[120px] bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-500 text-xs">Describe any phonological constraints or rules for your language</FormDescription>
                        <FormMessage className="text-red-500 text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-6 border-t border-[#DDBCEE]/30">
                    <Button 
                      type="submit" 
                      disabled={isSaving} 
                      className="flex-1 bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white font-bold rounded-full h-11 shadow-lg shadow-[#F269BF]/40"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Changes ✨'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-2 border-[#DDBCEE] text-slate-600 hover:bg-[#DDBCEE]/20 rounded-full h-11"
                      onClick={() => {
                        setIsEditing(false);
                        loadLanguage();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="relative overflow-hidden bg-white/80 border-2 border-[#DDBCEE]/40 rounded-3xl shadow-xl backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#A1FBFC]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <CardHeader className="relative border-b border-[#DDBCEE]/30">
                <CardTitle className="text-3xl font-bold text-slate-800">{language.name}</CardTitle>
                <CardDescription className="text-slate-500">Phonological system overview ✨</CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-10 pt-8">
                {/* Alphabet Display */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-800">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#A1FBFC] to-[#748BF6] rounded-xl flex items-center justify-center shadow-lg shadow-[#A1FBFC]/40">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    Your Alphabet
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Custom writing system with {Object.keys(consonantMappings).length + Object.keys(vowelMappings).length + Object.keys(diphthongMappings).length} letters
                  </p>
                  <AlphabetDisplay
                    consonantMappings={consonantMappings}
                    vowelMappings={vowelMappings}
                    diphthongMappings={diphthongMappings}
                  />
                </div>

                {/* IPA Chart */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-800">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#DDBCEE] to-[#F269BF] rounded-xl flex items-center justify-center shadow-lg shadow-[#DDBCEE]/40">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    IPA Phoneme Chart
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">
                    International Phonetic Alphabet reference with your enabled phonemes highlighted
                  </p>
                  <IPAChart
                    enabledConsonants={consonantTags}
                    enabledVowels={vowelTags}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-800">Syllable Structure</h3>
                  <Badge className="text-lg px-4 py-2 font-mono bg-gradient-to-r from-[#748BF6] to-[#F269BF] text-white border-0 rounded-full shadow-lg shadow-[#F269BF]/30">
                    {language.syllables}
                  </Badge>
                </div>

                {language.rules && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-slate-800">Phonotactic Rules</h3>
                    <Alert className="bg-[#F5B485]/10 border-2 border-[#F5B485]/30 rounded-2xl">
                      <AlertDescription className="whitespace-pre-wrap text-slate-600">{language.rules}</AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-[#DDBCEE]/30 via-[#F269BF]/20 to-[#F5B485]/30 border-2 border-[#F269BF]/30 rounded-3xl shadow-xl backdrop-blur-sm">
              <div className="absolute top-0 left-0 w-64 h-64 bg-[#A1FBFC]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#748BF6]/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
              <CardHeader className="relative border-b border-[#F269BF]/20">
                <CardTitle className="flex items-center gap-3 text-slate-800">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/40 rotate-3">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  Lexicon Management
                </CardTitle>
                <CardDescription className="text-slate-600">Manage words in this language ✨</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-3xl flex items-center justify-center shadow-xl shadow-[#F269BF]/40 mx-auto mb-6 rotate-6">
                    <BookOpen className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-slate-600 mb-6 text-lg font-medium">
                    {wordCount === 0 ? 'No words yet. Start building your lexicon! ✨' : `${wordCount} words in your lexicon`}
                  </p>
                  <Button 
                    onClick={() => navigate(`/language/${id}/words`)}
                    className="bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white font-bold rounded-full px-10 py-6 shadow-xl shadow-[#F269BF]/40 hover:shadow-[#F269BF]/60 hover:scale-105 transition-all duration-300"
                  >
                    <BookOpen className="mr-2 h-5 w-5" />
                    {wordCount === 0 ? 'Add First Word' : 'Manage Lexicon'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}