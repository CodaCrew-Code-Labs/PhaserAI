import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X, Save, Sparkles, AlertCircle, Star, Heart } from 'lucide-react';
import { PhonologicalFeatureSelector, AVAILABLE_FEATURES } from '@/components/PhonologicalFeatureSelector';

const languageSchema = z.object({
  name: z.string().min(1, 'Language name is required').max(100),
  consonants: z.string().min(1, 'At least one consonant is required'),
  vowels: z.string().min(1, 'At least one vowel is required'),
  syllables: z.string().min(1, 'Syllable structure is required'),
  rules: z.string().optional(),
});

type LanguageFormData = z.infer<typeof languageSchema>;

export default function LanguageSetup() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [consonantTags, setConsonantTags] = useState<string[]>([]);
  const [vowelTags, setVowelTags] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [featureTags, setFeatureTags] = useState<{ [key: string]: string[] }>({});
  const [consonantMappings, setConsonantMappings] = useState<{ [key: string]: string }>({});
  const [vowelMappings, setVowelMappings] = useState<{ [key: string]: string }>({});
  const [featureMappings, setFeatureMappings] = useState<{ [key: string]: { [key: string]: string } }>({});
  const [currentConsonant, setCurrentConsonant] = useState('');
  const [currentConsonantAlphabet, setCurrentConsonantAlphabet] = useState('');
  const [currentVowel, setCurrentVowel] = useState('');
  const [currentVowelAlphabet, setCurrentVowelAlphabet] = useState('');
  const [currentVowelLong, setCurrentVowelLong] = useState('');
  const [currentVowelLongAlphabet, setCurrentVowelLongAlphabet] = useState('');
  const [vowelHasLong, setVowelHasLong] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<{ [key: string]: string }>({});
  const [currentFeatureAlphabet, setCurrentFeatureAlphabet] = useState<{ [key: string]: string }>({});
  const [currentFeatureLong, setCurrentFeatureLong] = useState<{ [key: string]: string }>({});
  const [currentFeatureLongAlphabet, setCurrentFeatureLongAlphabet] = useState<{ [key: string]: string }>({});
  const [featureHasLong, setFeatureHasLong] = useState<{ [key: string]: boolean }>({});

  const form = useForm<LanguageFormData>({
    resolver: zodResolver(languageSchema),
    defaultValues: {
      name: '',
      consonants: '',
      vowels: '',
      syllables: 'CV',
      rules: '',
    },
  });

  const addConsonant = () => {
    if (
      currentConsonant.trim() &&
      currentConsonantAlphabet.trim() &&
      !consonantTags.includes(currentConsonant.trim())
    ) {
      const newTags = [...consonantTags, currentConsonant.trim()];
      const newMappings = {
        ...consonantMappings,
        [currentConsonantAlphabet.trim()]: currentConsonant.trim(),
      };
      setConsonantTags(newTags);
      setConsonantMappings(newMappings);
      form.setValue('consonants', newTags.join(' '));
      setCurrentConsonant('');
      setCurrentConsonantAlphabet('');
    }
  };

  const removeConsonant = (tag: string) => {
    const newTags = consonantTags.filter((t) => t !== tag);
    const alphabetKey = Object.keys(consonantMappings).find(
      (key) => consonantMappings[key] === tag
    );
    const newMappings = { ...consonantMappings };
    if (alphabetKey) delete newMappings[alphabetKey];
    setConsonantTags(newTags);
    setConsonantMappings(newMappings);
    form.setValue('consonants', newTags.join(' '));
  };

  const addVowel = () => {
    if (
      currentVowel.trim() &&
      currentVowelAlphabet.trim() &&
      !vowelTags.includes(currentVowel.trim())
    ) {
      let newTags = [...vowelTags, currentVowel.trim()];
      let newMappings = { ...vowelMappings, [currentVowelAlphabet.trim()]: currentVowel.trim() };
      
      // Add long vowel if specified
      if (vowelHasLong && currentVowelLong.trim() && currentVowelLongAlphabet.trim()) {
        newTags.push(currentVowelLong.trim());
        newMappings[currentVowelLongAlphabet.trim()] = currentVowelLong.trim();
      }
      
      setVowelTags(newTags);
      setVowelMappings(newMappings);
      form.setValue('vowels', newTags.join(' '));
      setCurrentVowel('');
      setCurrentVowelAlphabet('');
      setCurrentVowelLong('');
      setCurrentVowelLongAlphabet('');
      setVowelHasLong(false);
    }
  };

  const removeVowel = (tag: string) => {
    const newTags = vowelTags.filter((t) => t !== tag);
    const alphabetKey = Object.keys(vowelMappings).find((key) => vowelMappings[key] === tag);
    const newMappings = { ...vowelMappings };
    if (alphabetKey) delete newMappings[alphabetKey];
    setVowelTags(newTags);
    setVowelMappings(newMappings);
    form.setValue('vowels', newTags.join(' '));
  };

  const addFeature = (featureKey: string) => {
    const current = currentFeature[featureKey]?.trim();
    const currentAlphabet = currentFeatureAlphabet[featureKey]?.trim();
    
    if (current && currentAlphabet && !(featureTags[featureKey] || []).includes(current)) {
      let newTags = [...(featureTags[featureKey] || []), current];
      let newMappings = {
        ...(featureMappings[featureKey] || {}),
        [currentAlphabet]: current,
      };
      
      // Add long form if specified (for vowels and diphthongs)
      if ((featureKey === 'vowels' || featureKey === 'diphthongs') && 
          featureHasLong[featureKey] && 
          currentFeatureLong[featureKey]?.trim() && 
          currentFeatureLongAlphabet[featureKey]?.trim()) {
        newTags.push(currentFeatureLong[featureKey].trim());
        newMappings[currentFeatureLongAlphabet[featureKey].trim()] = currentFeatureLong[featureKey].trim();
      }
      
      setFeatureTags(prev => ({ ...prev, [featureKey]: newTags }));
      setFeatureMappings(prev => ({ ...prev, [featureKey]: newMappings }));
      setCurrentFeature(prev => ({ ...prev, [featureKey]: '' }));
      setCurrentFeatureAlphabet(prev => ({ ...prev, [featureKey]: '' }));
      setCurrentFeatureLong(prev => ({ ...prev, [featureKey]: '' }));
      setCurrentFeatureLongAlphabet(prev => ({ ...prev, [featureKey]: '' }));
      setFeatureHasLong(prev => ({ ...prev, [featureKey]: false }));
    }
  };

  const removeFeature = (featureKey: string, tag: string) => {
    const newTags = (featureTags[featureKey] || []).filter(t => t !== tag);
    const alphabetKey = Object.keys(featureMappings[featureKey] || {}).find(
      key => featureMappings[featureKey]?.[key] === tag
    );
    const newMappings = { ...(featureMappings[featureKey] || {}) };
    if (alphabetKey) delete newMappings[alphabetKey];
    
    setFeatureTags(prev => ({ ...prev, [featureKey]: newTags }));
    setFeatureMappings(prev => ({ ...prev, [featureKey]: newMappings }));
  };

  const onSubmit = async (data: LanguageFormData) => {
    if (!user) {
      toast.error('You must be logged in to create a language');
      return;
    }

    if (consonantTags.length === 0) {
      toast.error('Please add at least one consonant');
      return;
    }

    if (vowelTags.length === 0) {
      toast.error('Please add at least one vowel');
      return;
    }

    setIsLoading(true);

    try {
      // Ensure user exists in database
      const existingUser = await api.getUser(user.userId);
      if (!existingUser && user.email) {
        await api.createUser({
          user_id: user.userId,
          email: user.email,
          username: user.username || user.email.split('@')[0],
        });
      }

      // Create the language
      const phonemes = {
        consonants: consonantTags,
        vowels: vowelTags,
        features: featureTags,
      };
      
      const alphabetMappings = {
        consonants: consonantMappings,
        vowels: vowelMappings,
        features: featureMappings,
      };

      await api.createLanguage({
        user_id: user.userId,
        name: data.name,
        phonemes,
        alphabet_mappings: alphabetMappings,
        syllables: data.syllables,
        rules: data.rules || '',
      });

      toast.success('Language created successfully! ✨');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating language:', error);
      const message = error instanceof Error ? error.message : 'Failed to create language';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF]">
      {/* Whimsical floating shapes */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[#F269BF]/20 rounded-full blur-3xl animate-pulse-slow" />

      {/* Decorative elements */}
      <Star className="absolute top-32 left-[15%] w-6 h-6 text-[#F5B485] animate-pulse fill-[#F5B485]" />
      <Star className="absolute bottom-32 right-[20%] w-4 h-4 text-[#F269BF] animate-pulse fill-[#F269BF] animation-delay-2000" />
      <Heart className="absolute top-1/4 right-[10%] w-5 h-5 text-[#F269BF]/60 animate-float fill-[#F269BF]/40" />

      <div className="relative container max-w-4xl mx-auto py-12 px-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-8 text-slate-600 hover:text-[#F269BF] hover:bg-[#DDBCEE]/20 rounded-full px-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="relative overflow-hidden bg-white/80 border-2 border-[#DDBCEE]/40 rounded-3xl shadow-xl backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#A1FBFC]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <CardHeader className="relative border-b border-[#DDBCEE]/30">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/30 rotate-3">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-3xl font-black text-slate-800">
                    Create Language
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-500 max-w-2xl">
                  Define the phonological system and rules for your constructed language ✨
                </CardDescription>
              </div>
            </div>
            {(consonantTags.length === 0 || vowelTags.length === 0) && (
              <Alert className="mt-4 bg-[#F5B485]/20 border-2 border-[#F5B485]/40 rounded-2xl">
                <AlertCircle className="h-4 w-4 text-[#F5B485]" />
                <AlertTitle className="text-slate-700 font-semibold text-sm">
                  Required phonemes missing
                </AlertTitle>
                <AlertDescription className="text-slate-600 text-xs">
                  {consonantTags.length === 0 && 'Add at least one consonant. '}
                  {vowelTags.length === 0 && 'Add at least one vowel.'}
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent className="relative pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Language Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Elvish, Klingon, Dothraki"
                          {...field}
                          className="bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                        />
                      </FormControl>
                      <FormDescription className="text-slate-500 text-xs">
                        Give your language a unique name
                      </FormDescription>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />

                <PhonologicalFeatureSelector
                  selectedFeatures={selectedFeatures}
                  onFeaturesChange={setSelectedFeatures}
                />

                <Tabs defaultValue="consonants" className="w-full">
                  <div className="w-full overflow-x-auto pb-2">
                    <TabsList className="flex w-max min-w-full bg-white/50 border-2 border-[#DDBCEE]/30 p-1 rounded-2xl">
                      <TabsTrigger
                        value="consonants"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#A1FBFC] data-[state=active]:to-[#748BF6] data-[state=active]:text-white text-slate-500 rounded-xl font-semibold transition-all whitespace-nowrap px-4 flex-1"
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
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#DDBCEE] data-[state=active]:to-[#F269BF] data-[state=active]:text-white text-slate-500 rounded-xl font-semibold transition-all whitespace-nowrap px-4 flex-1"
                      >
                        Vowels
                        {vowelTags.length > 0 && (
                          <Badge className="ml-2 bg-[#DDBCEE]/30 text-[#F269BF] border-0 font-bold">
                            {vowelTags.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      {selectedFeatures.map(featureKey => {
                        const feature = AVAILABLE_FEATURES.find(f => f.key === featureKey);
                        const count = featureTags[featureKey]?.length || 0;
                        return (
                          <TabsTrigger
                            key={featureKey}
                            value={featureKey}
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F5B485] data-[state=active]:to-[#F269BF] data-[state=active]:text-white text-slate-500 rounded-xl font-semibold transition-all whitespace-nowrap px-4 flex-1"
                          >
                            {feature?.label}
                            {count > 0 && (
                              <Badge className="ml-2 bg-[#F5B485]/30 text-[#F269BF] border-0 font-bold">
                                {count}
                              </Badge>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </div>

                  <TabsContent value="consonants" className="space-y-4 mt-6">
                    <FormField
                      control={form.control}
                      name="consonants"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium">
                            Consonant Inventory
                          </FormLabel>
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
                          <FormDescription className="text-slate-500 text-xs">
                            Map alphabet letters to IPA symbols. Both fields required.
                          </FormDescription>
                          <div className="flex flex-wrap gap-2 mt-4">
                            {consonantTags.map((tag) => {
                              const alphabetKey = Object.keys(consonantMappings).find(
                                (key) => consonantMappings[key] === tag
                              );
                              return (
                                <Badge
                                  key={tag}
                                  className="px-3 py-1.5 bg-[#A1FBFC]/30 text-[#748BF6] border-2 border-[#A1FBFC]/50 hover:bg-[#A1FBFC]/50 rounded-full font-semibold"
                                >
                                  <span className="font-mono">
                                    {alphabetKey} → {tag}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeConsonant(tag)}
                                    className="ml-2 hover:text-red-500 transition-colors"
                                  >
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

                  <TabsContent value="vowels" className="space-y-4 mt-6">
                    <FormField
                      control={form.control}
                      name="vowels"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium">
                            Vowel Inventory
                          </FormLabel>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 mb-3">
                              <input
                                type="checkbox"
                                id="vowel-has-long"
                                checked={vowelHasLong}
                                onChange={(e) => setVowelHasLong(e.target.checked)}
                                className="rounded border-[#DDBCEE]/40"
                              />
                              <label htmlFor="vowel-has-long" className="text-sm text-slate-600">
                                Add long vowel form
                              </label>
                            </div>
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
                            {vowelHasLong && (
                              <div className="grid grid-cols-2 gap-3 p-3 bg-[#DDBCEE]/10 rounded-xl border border-[#DDBCEE]/30">
                                <FormControl>
                                  <Input
                                    placeholder="Long alphabet (e.g., aa, ee, ii)"
                                    value={currentVowelLongAlphabet}
                                    onChange={(e) => setCurrentVowelLongAlphabet(e.target.value)}
                                    className="bg-white border-2 border-[#DDBCEE]/40 focus:border-[#F269BF] text-slate-800 placeholder:text-slate-400 rounded-xl h-10"
                                  />
                                </FormControl>
                                <FormControl>
                                  <Input
                                    placeholder="Long IPA (e.g., aː, eː, iː)"
                                    value={currentVowelLong}
                                    onChange={(e) => setCurrentVowelLong(e.target.value)}
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
                            )}
                            <Button
                              type="button"
                              onClick={addVowel}
                              className="w-full bg-gradient-to-r from-[#DDBCEE] to-[#F269BF] hover:opacity-90 text-white font-bold rounded-xl h-10"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Vowel
                            </Button>
                          </div>
                          <FormDescription className="text-slate-500 text-xs">
                            Map alphabet letters to IPA symbols. Both fields required.
                          </FormDescription>
                          <div className="flex flex-wrap gap-2 mt-4">
                            {vowelTags.map((tag) => {
                              const alphabetKey = Object.keys(vowelMappings).find(
                                (key) => vowelMappings[key] === tag
                              );
                              return (
                                <Badge
                                  key={tag}
                                  className="px-3 py-1.5 bg-[#DDBCEE]/30 text-[#F269BF] border-2 border-[#DDBCEE]/50 hover:bg-[#DDBCEE]/50 rounded-full font-semibold"
                                >
                                  <span className="font-mono">
                                    {alphabetKey} → {tag}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeVowel(tag)}
                                    className="ml-2 hover:text-red-500 transition-colors"
                                  >
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

                    {selectedFeatures.map(featureKey => {
                      const feature = AVAILABLE_FEATURES.find(f => f.key === featureKey);
                      const tags = featureTags[featureKey] || [];
                      const mappings = featureMappings[featureKey] || {};
                      
                      return (
                        <TabsContent key={featureKey} value={featureKey} className="space-y-4 mt-6">
                          <FormItem>
                            <FormLabel className="text-slate-700 font-medium">
                              {feature?.label} (Optional)
                            </FormLabel>
                            <div className="space-y-3">
                              {(featureKey === 'diphthongs') && (
                                <div className="flex items-center gap-3 mb-3">
                                  <input
                                    type="checkbox"
                                    id={`${featureKey}-has-long`}
                                    checked={featureHasLong[featureKey] || false}
                                    onChange={(e) => setFeatureHasLong(prev => ({ ...prev, [featureKey]: e.target.checked }))}
                                    className="rounded border-[#F5B485]/40"
                                  />
                                  <label htmlFor={`${featureKey}-has-long`} className="text-sm text-slate-600">
                                    Add long form
                                  </label>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-3">
                                <FormControl>
                                  <Input
                                    placeholder={`Alphabet (e.g., ${featureKey === 'diphthongs' ? 'ai, ou, ei' : 'examples'})`}
                                    value={currentFeatureAlphabet[featureKey] || ''}
                                    onChange={(e) => setCurrentFeatureAlphabet(prev => ({ ...prev, [featureKey]: e.target.value }))}
                                    className="bg-white border-2 border-[#F5B485]/40 focus:border-[#F269BF] text-slate-800 placeholder:text-slate-400 rounded-xl h-10"
                                  />
                                </FormControl>
                                <FormControl>
                                  <Input
                                    placeholder={`IPA (e.g., ${featureKey === 'diphthongs' ? 'ai, au, oi' : 'IPA symbols'})`}
                                    value={currentFeature[featureKey] || ''}
                                    onChange={(e) => setCurrentFeature(prev => ({ ...prev, [featureKey]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addFeature(featureKey);
                                      }
                                    }}
                                    className="bg-white border-2 border-[#F5B485]/40 focus:border-[#F269BF] text-slate-800 placeholder:text-slate-400 rounded-xl h-10"
                                  />
                                </FormControl>
                              </div>
                              {(featureKey === 'diphthongs') && featureHasLong[featureKey] && (
                                <div className="grid grid-cols-2 gap-3 p-3 bg-[#F5B485]/10 rounded-xl border border-[#F5B485]/30">
                                  <FormControl>
                                    <Input
                                      placeholder="Long alphabet (e.g., aii, ouu, eii)"
                                      value={currentFeatureLongAlphabet[featureKey] || ''}
                                      onChange={(e) => setCurrentFeatureLongAlphabet(prev => ({ ...prev, [featureKey]: e.target.value }))}
                                      className="bg-white border-2 border-[#F5B485]/40 focus:border-[#F269BF] text-slate-800 placeholder:text-slate-400 rounded-xl h-10"
                                    />
                                  </FormControl>
                                  <FormControl>
                                    <Input
                                      placeholder="Long IPA (e.g., aiː, auː, oiː)"
                                      value={currentFeatureLong[featureKey] || ''}
                                      onChange={(e) => setCurrentFeatureLong(prev => ({ ...prev, [featureKey]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addFeature(featureKey);
                                        }
                                      }}
                                      className="bg-white border-2 border-[#F5B485]/40 focus:border-[#F269BF] text-slate-800 placeholder:text-slate-400 rounded-xl h-10"
                                    />
                                  </FormControl>
                                </div>
                              )}
                              <Button
                                type="button"
                                onClick={() => addFeature(featureKey)}
                                className="w-full bg-gradient-to-r from-[#F5B485] to-[#F269BF] hover:opacity-90 text-white font-bold rounded-xl h-10"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add {feature?.label}
                              </Button>
                            </div>
                            <FormDescription className="text-slate-500 text-xs">
                              {feature?.description}. Both fields required.
                            </FormDescription>
                            <div className="flex flex-wrap gap-2 mt-4">
                              {tags.map((tag) => {
                                const alphabetKey = Object.keys(mappings).find(
                                  (key) => mappings[key] === tag
                                );
                                return (
                                  <Badge
                                    key={tag}
                                    className="px-3 py-1.5 bg-[#F5B485]/30 text-[#F269BF] border-2 border-[#F5B485]/50 hover:bg-[#F5B485]/50 rounded-full font-semibold"
                                  >
                                    <span className="font-mono">
                                      {alphabetKey} → {tag}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeFeature(featureKey, tag)}
                                      className="ml-2 hover:text-red-500 transition-colors"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          </FormItem>
                        </TabsContent>
                      );
                    })}
                  </Tabs>

                <FormField
                  control={form.control}
                  name="syllables"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">
                        Syllable Structure
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., CV, CVC, CCVC, (C)V(C)"
                          {...field}
                          className="bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl h-11"
                        />
                      </FormControl>
                      <FormDescription className="text-slate-500 text-xs">
                        Define allowed syllable patterns. Use C for consonant, V for vowel, () for
                        optional elements.
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
                      <FormLabel className="text-slate-700 font-medium">
                        Phonotactic Rules (Optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., No consonant clusters at word-final position&#10;/s/ cannot follow /ʃ/&#10;Vowels cannot be adjacent"
                          className="min-h-[120px] bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-slate-500 text-xs">
                        Describe any phonological constraints or rules for your language
                      </FormDescription>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-6 border-t border-[#DDBCEE]/30">
                  <Button
                    type="submit"
                    disabled={isLoading || consonantTags.length === 0 || vowelTags.length === 0}
                    className="flex-1 bg-gradient-to-r from-[#748BF6] via-[#F269BF] to-[#F5B485] hover:opacity-90 text-white font-bold rounded-full h-11 shadow-lg shadow-[#F269BF]/40"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? 'Creating...' : 'Create Language ✨'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    className="border-2 border-[#DDBCEE] text-slate-600 hover:bg-[#DDBCEE]/20 rounded-full h-11"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
