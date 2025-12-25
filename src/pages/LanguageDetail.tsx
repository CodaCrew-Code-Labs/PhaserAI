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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlphabetDisplay } from '@/components/AlphabetDisplay';
import { IPAChart } from '@/components/IPAChart';
import { IPAInput } from '@/components/IPAInput';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Trash2,
  Edit2,
  BookOpen,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { PhonologicalFeatureSelector, AVAILABLE_FEATURES } from '@/components/PhonologicalFeatureSelector';
import { SyllableRulesSelector } from '@/components/SyllableRulesSelector';
import { ExclusionRulesSelector } from '@/components/ExclusionRulesSelector';
import { getFeatureColor } from '@/lib/feature-colors';
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
  name: z.string().min(1, 'Language name is required').max(100, 'Language name must be less than 100 characters'),
  consonants: z.string().min(1, 'At least one consonant is required'),
  vowels: z.string().min(1, 'At least one vowel is required'),
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
    features?: { [key: string]: string[] };
    diphthongs?: string[]; // For backward compatibility
  };
  alphabet_mappings?: {
    consonants: { [key: string]: string };
    vowels: { [key: string]: string };
    features?: { [key: string]: { [key: string]: string } };
    diphthongs?: { [key: string]: string }; // For backward compatibility
  };
  syllables: string;
  syllable_rules?: { [key: string]: string[] };
  exclusion_rules?: any[];
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
  const [wordCount, setWordCount] = useState(0);
  const [syllableRules, setSyllableRules] = useState<{ [key: string]: string[] }>({});
  const [exclusionRules, setExclusionRules] = useState<any[]>([]);
  const [vowelPairs, setVowelPairs] = useState<Map<string, { short: string, long: string }>>(new Map());
  const [featurePairs, setFeaturePairs] = useState<{ [key: string]: Map<string, { short: string, long: string }> }>({});

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

  useEffect(() => {
    if (!user || !id) {
      navigate('/dashboard');
      return;
    }
    loadLanguage();
  }, [user, id, navigate]);

  // Helper to detect long/short pairs based on alphabet mappings
  const detectPairs = (phonemes: string[], mappings: { [key: string]: string }) => {
    const pairs = new Map<string, { short: string, long: string }>();
    const processed = new Set<string>();
    
    const phonemeToAlphabet = new Map<string, string>();
    Object.entries(mappings).forEach(([alphabet, phoneme]) => {
      phonemeToAlphabet.set(phoneme, alphabet);
    });
    
    phonemes.forEach(phoneme => {
      if (processed.has(phoneme) || phoneme.includes('ː')) return;
      
      const alphabet = phonemeToAlphabet.get(phoneme);
      if (!alphabet) return;
      
      const longForm = phonemes.find(p => {
        if (!p.includes('ː') || processed.has(p)) return false;
        const longAlphabet = phonemeToAlphabet.get(p);
        if (!longAlphabet) return false;
        
        // Normalize: remove diacritics but keep base letters
        const normalizeAlphabet = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return normalizeAlphabet(alphabet) === normalizeAlphabet(longAlphabet);
      });
      
      if (longForm) {
        pairs.set(phoneme, { short: phoneme, long: longForm });
        processed.add(phoneme);
        processed.add(longForm);
      }
    });
    
    return pairs;
  };

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
      setSyllableRules(data.syllable_rules || {});
      setExclusionRules((data as any).exclusion_rules || []);
      
      // Handle backward compatibility and new features structure
      const features = (data.phonemes as any).features || {};
      if ((data.phonemes as any).diphthongs) {
        features.diphthongs = (data.phonemes as any).diphthongs;
      }
      setFeatureTags(features);
      setSelectedFeatures(Object.keys(features));

      // Load alphabet mappings if they exist
      if (data.alphabet_mappings) {
        setConsonantMappings(data.alphabet_mappings.consonants || {});
        setVowelMappings(data.alphabet_mappings.vowels || {});
        
        const featureMappings = (data.alphabet_mappings as any).features || {};
        if ((data.alphabet_mappings as any).diphthongs) {
          featureMappings.diphthongs = (data.alphabet_mappings as any).diphthongs;
        }
        setFeatureMappings(featureMappings);
      }

      // Reconstruct vowel pairs
      const vowelPairsDetected = detectPairs(data.phonemes.vowels || [], data.alphabet_mappings?.vowels || {});
      console.log('Vowels from DB:', data.phonemes.vowels);
      console.log('Detected vowel pairs:', vowelPairsDetected);
      setVowelPairs(vowelPairsDetected);
      
      // Reconstruct feature pairs
      const newFeaturePairs: { [key: string]: Map<string, { short: string, long: string }> } = {};
      Object.keys(features).forEach(featureKey => {
        console.log(`${featureKey} from DB:`, features[featureKey]);
        const featureMappingsForKey = featureMappings[featureKey] || {};
        const featurePairsDetected = detectPairs(features[featureKey] || [], featureMappingsForKey);
        console.log(`Detected ${featureKey} pairs:`, featurePairsDetected);
        if (featurePairsDetected.size > 0) {
          newFeaturePairs[featureKey] = featurePairsDetected;
        }
      });
      setFeaturePairs(newFeaturePairs);

      form.reset({
        name: data.name,
        consonants: (data.phonemes.consonants || []).join(' '),
        vowels: (data.phonemes.vowels || []).join(' '),
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
    if (
      currentConsonant.trim() &&
      currentConsonantAlphabet.trim() &&
      !consonantTags.includes(currentConsonant.trim())
    ) {
      // Remove old mapping if alphabet key already exists
      const existingIPA = consonantMappings[currentConsonantAlphabet.trim()];
      let newTags = existingIPA 
        ? consonantTags.filter(t => t !== existingIPA)
        : [...consonantTags];
      
      newTags.push(currentConsonant.trim());
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
      // Remove old mapping if alphabet key already exists
      const existingIPA = vowelMappings[currentVowelAlphabet.trim()];
      let newTags = existingIPA 
        ? vowelTags.filter(t => t !== existingIPA)
        : [...vowelTags];
      
      newTags.push(currentVowel.trim());
      let newMappings = { ...vowelMappings, [currentVowelAlphabet.trim()]: currentVowel.trim() };
      
      // Add long vowel if specified
      if (vowelHasLong && currentVowelLong.trim() && currentVowelLongAlphabet.trim()) {
        const existingLongIPA = vowelMappings[currentVowelLongAlphabet.trim()];
        if (existingLongIPA) {
          newTags = newTags.filter(t => t !== existingLongIPA);
        }
        newTags.push(currentVowelLong.trim());
        newMappings[currentVowelLongAlphabet.trim()] = currentVowelLong.trim();
        
        // Store the pair relationship
        const newPairs = new Map(vowelPairs);
        newPairs.set(currentVowel.trim(), { 
          short: currentVowel.trim(), 
          long: currentVowelLong.trim() 
        });
        setVowelPairs(newPairs);
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
      // Remove old mapping if alphabet key already exists
      const existingIPA = featureMappings[featureKey]?.[currentAlphabet];
      let newTags = existingIPA 
        ? (featureTags[featureKey] || []).filter(t => t !== existingIPA)
        : [...(featureTags[featureKey] || [])];
      
      newTags.push(current);
      let newMappings = {
        ...(featureMappings[featureKey] || {}),
        [currentAlphabet]: current,
      };
      
      // Add long form if specified
      if (featureHasLong[featureKey] && 
          currentFeatureLong[featureKey]?.trim() && 
          currentFeatureLongAlphabet[featureKey]?.trim()) {
        const existingLongIPA = featureMappings[featureKey]?.[currentFeatureLongAlphabet[featureKey].trim()];
        if (existingLongIPA) {
          newTags = newTags.filter(t => t !== existingLongIPA);
        }
        newTags.push(currentFeatureLong[featureKey].trim());
        newMappings[currentFeatureLongAlphabet[featureKey].trim()] = currentFeatureLong[featureKey].trim();
        
        // Store the pair relationship
        const newPairs = new Map(featurePairs[featureKey] || new Map());
        newPairs.set(current, { 
          short: current, 
          long: currentFeatureLong[featureKey].trim() 
        });
        setFeaturePairs(prev => ({ ...prev, [featureKey]: newPairs }));
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
    if (!id) return;

    setIsSaving(true);

    try {
      const updateData = {
        name: data.name,
        phonemes: {
          consonants: consonantTags,
          vowels: vowelTags,
          features: featureTags,
          diphthongs: featureTags.diphthongs || [], // For backward compatibility
        },
        alphabet_mappings: {
          consonants: consonantMappings,
          vowels: vowelMappings,
          features: featureMappings,
          diphthongs: featureMappings.diphthongs || {}, // For backward compatibility
        },
        syllables: data.syllables,
        syllable_rules: syllableRules,
        exclusion_rules: exclusionRules,
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
            {isEditing && (
              <Button
                onClick={() => {
                  setIsEditing(false);
                  loadLanguage();
                }}
                variant="outline"
                className="border-2 border-[#DDBCEE] text-slate-600 hover:bg-[#DDBCEE]/20 rounded-full"
              >
                Cancel Edit
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
                    This will permanently delete "{language.name}" and all associated words. This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-2 border-[#DDBCEE] text-slate-600 hover:bg-[#DDBCEE]/20 rounded-full">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-500 text-white hover:bg-red-600 rounded-full"
                  >
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
                  <span className="text-slate-500">Special Phonemes:</span>
                  <span className="font-bold text-slate-800 text-lg">
                    {Object.values(featureTags).reduce((acc, arr) => acc + arr.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Total Alphabets:</span>
                  <span className="font-bold text-slate-800 text-lg">
                    {consonantTags.length + vowelTags.length + Object.values(featureTags).reduce((acc, arr) => acc + arr.length, 0)}
                  </span>
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
              <div className="text-lg font-semibold text-slate-800">
                {new Date(language.created_at).toLocaleDateString()}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {new Date(language.created_at).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {isEditing ? (
          <Card className="relative overflow-hidden bg-white/80 border-2 border-[#DDBCEE]/40 rounded-3xl shadow-xl backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#A1FBFC]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="relative border-b border-[#DDBCEE]/30">
              <CardTitle className="text-2xl font-bold text-slate-800">Edit Language</CardTitle>
              <CardDescription className="text-slate-500 text-sm">
                Update your language's phonological system and rules
              </CardDescription>
            </CardHeader>
            <CardContent className="relative pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium text-sm">
                          Language Name
                        </FormLabel>
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

                  <PhonologicalFeatureSelector
                    selectedFeatures={selectedFeatures}
                    onFeaturesChange={setSelectedFeatures}
                  />

                  <Tabs defaultValue="consonants" className="w-full">
                    <div className="w-full overflow-x-auto pb-2">
                      <TabsList className="flex w-max min-w-full bg-white/50 border-2 border-[#DDBCEE]/30 p-1 rounded-2xl feature-tabs-list">
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
                          const color = getFeatureColor(featureKey);
                          
                          // Create dynamic Tailwind classes for this specific feature
                          const activeClasses = `data-[state=active]:text-white text-slate-500 rounded-xl font-semibold transition-all whitespace-nowrap px-4 flex-1`;
                          
                          return (
                            <TabsTrigger
                              key={featureKey}
                              value={featureKey}
                              className={activeClasses}
                              style={{
                                '--active-bg-from': color.from,
                                '--active-bg-to': color.to,
                              } as React.CSSProperties}
                              data-feature-key={featureKey}
                            >
                              {feature?.label}
                              {count > 0 && (
                                <Badge 
                                  className="ml-2 border-0 font-bold"
                                  data-feature-badge={featureKey}
                                  style={{
                                    backgroundColor: `${color.from}40`,
                                    color: color.from
                                  }}
                                >
                                  {count}
                                </Badge>
                              )}
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                    </div>
                    <style>{`
                      ${selectedFeatures.map(featureKey => {
                        const color = getFeatureColor(featureKey);
                        return `
                          /* Use data attribute for more specific targeting */
                          .feature-tabs-list button[data-feature-key="${featureKey}"][data-state="active"] {
                            background: linear-gradient(to right, var(--active-bg-from), var(--active-bg-to)) !important;
                            color: white !important;
                            border-color: transparent !important;
                          }
                          
                          /* Badge styling for active tabs */
                          .feature-tabs-list button[data-feature-key="${featureKey}"][data-state="active"] [data-feature-badge="${featureKey}"] {
                            background-color: rgba(255, 255, 255, 0.3) !important;
                            color: white !important;
                          }
                        `;
                      }).join('')}
                    `}</style>

                    <TabsContent value="consonants" className="space-y-5 mt-6">
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
                                  <IPAInput
                                    placeholder="IPA (e.g., p, θ, ʃ)"
                                    value={currentConsonant}
                                    onChange={setCurrentConsonant}
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
                                    className="px-3 py-1.5 bg-[#A1FBFC]/30 text-[#748BF6] border-2 border-[#A1FBFC]/50 hover:bg-[#A1FBFC]/50 rounded-full font-semibold cursor-pointer"
                                    onClick={() => {
                                      setCurrentConsonantAlphabet(alphabetKey || '');
                                      setCurrentConsonant(tag);
                                    }}
                                  >
                                    <span className="font-mono">
                                      {alphabetKey ? `${alphabetKey} → ${tag}` : tag}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeConsonant(tag);
                                      }}
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

                    <TabsContent value="vowels" className="space-y-5 mt-6">
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
                                  <IPAInput
                                    placeholder="IPA (e.g., a, e, i)"
                                    value={currentVowel}
                                    onChange={setCurrentVowel}
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
                                    <IPAInput
                                      placeholder="Long IPA (e.g., aː, eː, iː)"
                                      value={currentVowelLong}
                                      onChange={setCurrentVowelLong}
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
                              {(() => {
                                const displayed = new Set<string>();
                                return vowelTags.map((tag) => {
                                  if (displayed.has(tag)) return null;
                                  
                                  const alphabetKey = Object.keys(vowelMappings).find(key => vowelMappings[key] === tag);
                                  const pair = vowelPairs.get(tag) || Array.from(vowelPairs.values()).find(p => p.long === tag);
                                  
                                  if (pair) {
                                    displayed.add(pair.short);
                                    displayed.add(pair.long);
                                    const shortAlphabet = Object.keys(vowelMappings).find(k => vowelMappings[k] === pair.short);
                                    const longAlphabet = Object.keys(vowelMappings).find(k => vowelMappings[k] === pair.long);
                                    
                                    return (
                                      <div key={tag} className="flex items-center gap-1 px-3 py-1.5 bg-[#DDBCEE]/20 border-2 border-[#DDBCEE]/50 rounded-full">
                                        <Badge className="bg-[#DDBCEE]/50 text-[#F269BF] border-0 font-semibold cursor-pointer hover:bg-[#DDBCEE]/70"
                                          onClick={() => {
                                            setCurrentVowelAlphabet(shortAlphabet || '');
                                            setCurrentVowel(pair.short);
                                            setVowelHasLong(true);
                                            setCurrentVowelLongAlphabet(longAlphabet || '');
                                            setCurrentVowelLong(pair.long);
                                          }}>
                                          <span className="font-mono">{shortAlphabet} → {pair.short}</span>
                                        </Badge>
                                        <span className="text-[#F269BF] font-bold text-sm">+</span>
                                        <Badge className="bg-[#DDBCEE]/50 text-[#F269BF] border-0 font-semibold cursor-pointer hover:bg-[#DDBCEE]/70"
                                          onClick={() => {
                                            setCurrentVowelAlphabet(shortAlphabet || '');
                                            setCurrentVowel(pair.short);
                                            setVowelHasLong(true);
                                            setCurrentVowelLongAlphabet(longAlphabet || '');
                                            setCurrentVowelLong(pair.long);
                                          }}>
                                          <span className="font-mono">{longAlphabet} → {pair.long}</span>
                                        </Badge>
                                        <button type="button" onClick={() => {
                                          removeVowel(pair.short);
                                          removeVowel(pair.long);
                                          const newPairs = new Map(vowelPairs);
                                          newPairs.delete(pair.short);
                                          setVowelPairs(newPairs);
                                        }} className="ml-1 hover:text-red-500 transition-colors">
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    );
                                  }
                                  
                                  displayed.add(tag);
                                  return (
                                    <Badge
                                      key={tag}
                                      className="px-3 py-1.5 bg-[#DDBCEE]/30 text-[#F269BF] border-2 border-[#DDBCEE]/50 hover:bg-[#DDBCEE]/50 rounded-full font-semibold cursor-pointer"
                                      onClick={() => {
                                        setCurrentVowelAlphabet(alphabetKey || '');
                                        setCurrentVowel(tag);
                                      }}
                                    >
                                      <span className="font-mono">
                                        {alphabetKey ? `${alphabetKey} → ${tag}` : tag}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeVowel(tag);
                                        }}
                                        className="ml-2 hover:text-red-500 transition-colors"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </Badge>
                                  );
                                });
                              })()}
                            </div>
                            <FormMessage className="text-red-400 text-xs" />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    {selectedFeatures.map(featureKey => {
                      const feature = AVAILABLE_FEATURES.find(f => f.key === featureKey);
                      const tags = featureTags[featureKey] || [];
                      const mappings = featureMappings[featureKey] || {};
                      const color = getFeatureColor(featureKey);
                      
                      return (
                        <TabsContent key={featureKey} value={featureKey} className="space-y-4 mt-6">
                          <FormItem>
                            <FormLabel className="text-slate-700 font-medium">
                              {feature?.label} (Optional)
                            </FormLabel>
                            <div className="space-y-3">
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
                                  <IPAInput
                                    placeholder={`IPA (e.g., ${featureKey === 'diphthongs' ? 'ai, au, oi' : 'IPA symbols'})`}
                                    value={currentFeature[featureKey] || ''}
                                    onChange={(value) => setCurrentFeature(prev => ({ ...prev, [featureKey]: value }))}
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
                              {featureHasLong[featureKey] && (
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
                                    <IPAInput
                                      placeholder="Long IPA (e.g., aiː, auː, oiː)"
                                      value={currentFeatureLong[featureKey] || ''}
                                      onChange={(value) => setCurrentFeatureLong(prev => ({ ...prev, [featureKey]: value }))}
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
                                className="w-full text-white font-bold rounded-xl h-10"
                                style={{
                                  backgroundImage: `linear-gradient(to right, ${color.from}, ${color.to})`,
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add {feature?.label}
                              </Button>
                            </div>
                            <FormDescription className="text-slate-500 text-xs">
                              {feature?.description}. Both fields required.
                            </FormDescription>
                            <div className="flex flex-wrap gap-2 mt-4">
                              {(() => {
                                const displayed = new Set<string>();
                                const pairs = featurePairs[featureKey] || new Map();
                                return tags.map((tag) => {
                                  if (displayed.has(tag)) return null;
                                  
                                  const alphabetKey = Object.keys(mappings).find(key => mappings[key] === tag);
                                  const pair = pairs.get(tag) || Array.from(pairs.values()).find(p => p.long === tag);
                                  
                                  if (pair) {
                                    displayed.add(pair.short);
                                    displayed.add(pair.long);
                                    const shortAlphabet = Object.keys(mappings).find(k => mappings[k] === pair.short);
                                    const longAlphabet = Object.keys(mappings).find(k => mappings[k] === pair.long);
                                    
                                    return (
                                      <div key={tag} className="flex items-center gap-1 px-3 py-1.5 bg-white/50 border-2 rounded-full" style={{ borderColor: `${color.border}80` }}>
                                        <Badge className="border-0 font-semibold cursor-pointer hover:opacity-80" style={{ backgroundImage: `linear-gradient(to right, ${color.from}, ${color.to})`, color: 'white' }}
                                          onClick={() => {
                                            setCurrentFeatureAlphabet(prev => ({ ...prev, [featureKey]: shortAlphabet || '' }));
                                            setCurrentFeature(prev => ({ ...prev, [featureKey]: pair.short }));
                                            setFeatureHasLong(prev => ({ ...prev, [featureKey]: true }));
                                            setCurrentFeatureLongAlphabet(prev => ({ ...prev, [featureKey]: longAlphabet || '' }));
                                            setCurrentFeatureLong(prev => ({ ...prev, [featureKey]: pair.long }));
                                          }}>
                                          <span className="font-mono">{shortAlphabet} → {pair.short}</span>
                                        </Badge>
                                        <span className="font-bold text-sm" style={{ color: color.from }}>+</span>
                                        <Badge className="border-0 font-semibold cursor-pointer hover:opacity-80" style={{ backgroundImage: `linear-gradient(to right, ${color.from}, ${color.to})`, color: 'white' }}
                                          onClick={() => {
                                            setCurrentFeatureAlphabet(prev => ({ ...prev, [featureKey]: shortAlphabet || '' }));
                                            setCurrentFeature(prev => ({ ...prev, [featureKey]: pair.short }));
                                            setFeatureHasLong(prev => ({ ...prev, [featureKey]: true }));
                                            setCurrentFeatureLongAlphabet(prev => ({ ...prev, [featureKey]: longAlphabet || '' }));
                                            setCurrentFeatureLong(prev => ({ ...prev, [featureKey]: pair.long }));
                                          }}>
                                          <span className="font-mono">{longAlphabet} → {pair.long}</span>
                                        </Badge>
                                        <button type="button" onClick={() => {
                                          removeFeature(featureKey, pair.short);
                                          removeFeature(featureKey, pair.long);
                                          const newPairs = new Map(pairs);
                                          newPairs.delete(pair.short);
                                          setFeaturePairs(prev => ({ ...prev, [featureKey]: newPairs }));
                                        }} className="ml-1 hover:text-red-500 transition-colors">
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    );
                                  }
                                  
                                  displayed.add(tag);
                                  return (
                                    <Badge
                                      key={tag}
                                      className="px-3 py-1.5 text-white border-2 hover:opacity-80 rounded-full font-semibold cursor-pointer"
                                      style={{
                                        backgroundImage: `linear-gradient(to right, ${color.from}, ${color.to})`,
                                        borderColor: `${color.border}80`,
                                      }}
                                      onClick={() => {
                                        setCurrentFeatureAlphabet(prev => ({ ...prev, [featureKey]: alphabetKey || '' }));
                                        setCurrentFeature(prev => ({ ...prev, [featureKey]: tag }));
                                      }}
                                    >
                                      <span className="font-mono">
                                        {alphabetKey} → {tag}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeFeature(featureKey, tag);
                                        }}
                                        className="ml-2 hover:text-red-500 transition-colors"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </Badge>
                                  );
                                });
                              })()}
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
                        <FormLabel className="text-slate-700 font-medium text-sm">
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

                  <SyllableRulesSelector
                    consonantMappings={consonantMappings}
                    vowelMappings={vowelMappings}
                    featureMappings={featureMappings}
                    syllableRules={syllableRules}
                    exclusionRules={exclusionRules}
                    onRulesChange={setSyllableRules}
                    onExclusionRulesChange={setExclusionRules}
                  />

                  <ExclusionRulesSelector
                    key={`exclusion-rules-${form.watch('syllables') || 'empty'}`}
                    syllableStructure={form.watch('syllables')}
                    consonantMappings={consonantMappings}
                    vowelMappings={vowelMappings}
                    featureMappings={featureMappings}
                    syllableRules={syllableRules}
                    exclusionRules={exclusionRules}
                    onRulesChange={setExclusionRules}
                  />

                  <FormField
                    control={form.control}
                    name="rules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium text-sm">
                          Other Phonotactic rules (If any)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., No consonant clusters at word-final position&#10;/s/ cannot follow /ʃ/&#10;Vowels cannot be adjacent"
                            className="min-h-[120px] bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-500 text-xs">
                          Its intended for AI validation
                        </FormDescription>
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
                <CardDescription className="text-slate-500">
                  Phonological system overview ✨
                </CardDescription>
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
                    Custom writing system with{' '}
                    {Object.keys(consonantMappings).length +
                      Object.keys(vowelMappings).length +
                      Object.values(featureMappings).reduce((acc, mapping) => acc + Object.keys(mapping).length, 0)}{' '}
                    letters
                  </p>
                  <AlphabetDisplay
                    consonantMappings={consonantMappings}
                    vowelMappings={vowelMappings}
                    featureMappings={featureMappings}
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
                  <IPAChart enabledConsonants={consonantTags} enabledVowels={vowelTags} enabledFeatures={featureTags} />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-slate-800">Syllable Structure</h3>
                  <Badge className="text-lg px-4 py-2 font-mono bg-gradient-to-r from-[#748BF6] to-[#F269BF] text-white border-0 rounded-full shadow-lg shadow-[#F269BF]/30">
                    {language.syllables}
                  </Badge>
                </div>

                {language.syllable_rules && Object.keys(language.syllable_rules).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-slate-800">Syllable Rules</h3>
                    <div className="space-y-3">
                      {['onset', 'nucleus', 'coda'].map(position => {
                        const rules = language.syllable_rules?.[position];
                        if (!rules || rules.length === 0) return null;
                        const colors = {
                          onset: { bg: 'bg-[#A1FBFC]/20', border: 'border-[#A1FBFC]', text: 'text-[#748BF6]' },
                          nucleus: { bg: 'bg-[#DDBCEE]/20', border: 'border-[#DDBCEE]', text: 'text-[#F269BF]' },
                          coda: { bg: 'bg-[#F5B485]/20', border: 'border-[#F5B485]', text: 'text-[#F5B485]' },
                        };
                        const color = colors[position as keyof typeof colors] || colors.onset;
                        return (
                          <div key={position} className={`flex items-center gap-3 p-3 ${color.bg} border-2 ${color.border} rounded-xl`}>
                            <span className={`font-semibold ${color.text} text-sm capitalize w-20`}>{position}:</span>
                            <div className="flex flex-wrap gap-2">
                              {rules.map((rule, idx) => (
                                <Badge key={idx} className={`${color.text} bg-white border-2 ${color.border}`}>
                                  {rule.replace('group:', '').split(':').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(language as any).exclusion_rules && (language as any).exclusion_rules.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-slate-800">Exclusion Rules</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Alphabets that cannot appear in specific syllable positions
                    </p>
                    <div className="space-y-3">
                      {(language as any).exclusion_rules.map((rule: any, idx: number) => (
                        <div
                          key={rule.id || idx}
                          className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#F269BF]/10 to-[#DDBCEE]/10 border-2 border-[#F269BF]/20 rounded-xl"
                        >
                          <div className="flex flex-wrap gap-1">
                            {rule.syllablePatterns?.map((pattern: string, patternIdx: number) => (
                              <Badge key={patternIdx} className="bg-[#F269BF]/20 text-[#F269BF] border-0 font-mono">
                                {pattern}
                              </Badge>
                            ))}
                          </div>
                          <Badge className="bg-[#DDBCEE]/20 text-[#DDBCEE] border-0 font-semibold">
                            {rule.position}
                          </Badge>
                          <span className="text-slate-500 text-sm">excludes:</span>
                          <div className="flex-1 flex flex-wrap gap-1">
                            {rule.excludedAlphabets?.map((alpha: string, alphaIdx: number) => (
                              <Badge key={alphaIdx} className="bg-red-100 text-red-600 border border-red-200 text-xs">
                                {alpha}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {language.rules && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-slate-800">Phonotactic Rules</h3>
                    <Alert className="bg-[#F5B485]/10 border-2 border-[#F5B485]/30 rounded-2xl">
                      <AlertDescription className="whitespace-pre-wrap text-slate-600">
                        {language.rules}
                      </AlertDescription>
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
                <CardDescription className="text-slate-600">
                  Manage words in this language ✨
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-3xl flex items-center justify-center shadow-xl shadow-[#F269BF]/40 mx-auto mb-6 rotate-6">
                    <BookOpen className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-slate-600 mb-6 text-lg font-medium">
                    {wordCount === 0
                      ? 'No words yet. Start building your lexicon! ✨'
                      : `${wordCount} words in your lexicon`}
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
