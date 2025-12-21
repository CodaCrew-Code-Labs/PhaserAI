import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { PhonologyValidator } from '@/lib/phonology-validator';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Edit2, Trash2, Search, Download, Upload, Sparkles, Filter, Loader2, FileJson, FileSpreadsheet, AlertCircle, CheckCircle, GitBranch } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

const POS_OPTIONS = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection'];
const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
];

const DERIVATION_TYPES = ['compound', 'affix', 'sound_change', 'borrowing', 'semantic_shift', 'other'];

const wordSchema = z.object({
  word: z.string().min(1, 'Word is required'),
  ipa: z.string().min(1, 'IPA notation is required'),
  pos: z.array(z.string()).min(1, 'Select at least one part of speech'),
  is_root: z.boolean(),
  parent_word_id: z.string().optional(),
  derivation_type: z.string().optional(),
  derivation_notes: z.string().optional(),
  translations: z.array(z.object({
    language_code: z.string(),
    meaning: z.string().min(1, 'Translation is required'),
  })).min(1, 'Add at least one translation'),
});

type WordFormData = z.infer<typeof wordSchema>;

interface Violation {
  type: string;
  description: string;
  severity: string;
}

interface Word {
  id: string;
  word: string;
  ipa: string;
  pos: string[];
  is_root: boolean;
  created_at: string;
  translations: Array<{
    id: string;
    language_code: string;
    meaning: string;
  }>;
  violations?: Violation[];
}

interface Language {
  id: string;
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
}

interface WordData {
  id: string;
  word: string;
  ipa: string;
  pos: string[];
  is_root: boolean;
  created_at: string;
  app_8b514_translations: Array<{
    id: string;
    language_code: string;
    meaning: string;
  }>;
}

interface ImportWord {
  word: string;
  ipa: string;
  pos: string | string[];
  is_root?: boolean;
  translations: string | Array<{ language_code: string; meaning: string }>;
}

export default function LexiconManager() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [language, setLanguage] = useState<Language | null>(null);
  const [validator, setValidator] = useState<PhonologyValidator | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [filteredWords, setFilteredWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [deleteWordId, setDeleteWordId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [posFilter, setPosFilter] = useState<string>('all');
  const [rootFilter, setRootFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [generatorDialogOpen, setGeneratorDialogOpen] = useState(false);
  const [generatorMeaning, setGeneratorMeaning] = useState('');
  const [generatorPos, setGeneratorPos] = useState('');
  const [generatedWords, setGeneratedWords] = useState<Array<{
    word: string;
    ipa: string;
    syllables: string;
    reasoning: string;
  }>>([]);
  const [showWordSelection, setShowWordSelection] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; violations: Violation[] } | null>(null);
  const [availableParentWords, setAvailableParentWords] = useState<Word[]>([]);

  const form = useForm<WordFormData>({
    resolver: zodResolver(wordSchema),
    defaultValues: {
      word: '',
      ipa: '',
      pos: [],
      is_root: false,
      parent_word_id: undefined,
      derivation_type: undefined,
      derivation_notes: '',
      translations: [{ language_code: 'en', meaning: '' }],
    },
  });

  useEffect(() => {
    if (!user || !id) {
      navigate('/dashboard');
      return;
    }
    loadLanguageAndWords();
  }, [user, id, navigate]);

  useEffect(() => {
    filterWords();
  }, [words, searchQuery, posFilter, rootFilter]);

  // Watch IPA field for real-time validation
  const ipaValue = form.watch('ipa');
  useEffect(() => {
    if (validator && ipaValue) {
      const result = validator.validate(ipaValue);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [ipaValue, validator]);

  // Auto-convert alphabet to IPA
  const convertAlphabetToIPA = (alphabetText: string): string => {
    if (!language?.alphabet_mappings) return alphabetText;
    
    let result = alphabetText.toLowerCase();
    const allMappings = {
      ...language.alphabet_mappings.diphthongs,
      ...language.alphabet_mappings.consonants,
      ...language.alphabet_mappings.vowels,
    };
    
    // Sort by length (longest first) to handle multi-character mappings
    const sortedKeys = Object.keys(allMappings).sort((a, b) => b.length - a.length);
    
    for (const alphabet of sortedKeys) {
      const ipa = allMappings[alphabet];
      result = result.replace(new RegExp(alphabet, 'g'), ipa);
    }
    
    return result;
  };

  // Auto-convert IPA to alphabet
  const convertIPAToAlphabet = (ipaText: string): string => {
    if (!language?.alphabet_mappings) return ipaText;
    
    let result = ipaText;
    const allMappings = {
      ...language.alphabet_mappings.diphthongs,
      ...language.alphabet_mappings.consonants,
      ...language.alphabet_mappings.vowels,
    };
    
    // Create reverse mapping (IPA -> alphabet)
    const reverseMapping: { [key: string]: string } = {};
    for (const [alphabet, ipa] of Object.entries(allMappings)) {
      reverseMapping[ipa] = alphabet;
    }
    
    // Sort by length (longest first)
    const sortedKeys = Object.keys(reverseMapping).sort((a, b) => b.length - a.length);
    
    for (const ipa of sortedKeys) {
      const alphabet = reverseMapping[ipa];
      result = result.replace(new RegExp(ipa, 'g'), alphabet);
    }
    
    return result;
  };

  // Format IPA for display (convert / to . and wrap in slashes)
  const formatIPAForDisplay = (ipa: string): string => {
    // Replace / with . for standard IPA syllable notation
    const formatted = ipa.replace(/\//g, '.');
    // Wrap in phonemic slashes
    return `/${formatted}/`;
  };

  // Format word for display (remove syllable markers)
  const formatWordForDisplay = (word: string): string => {
    // Remove all syllable markers (/, ., -)
    return word.replace(/[\/\.\-]/g, '');
  };

  const loadLanguageAndWords = async () => {
    if (!id) return;

    try {
      const langData = await api.getLanguage(id);

      if (!langData) {
        toast.error('Language not found');
        navigate('/dashboard');
        return;
      }
      
      // Check ownership
      if (langData.user_id !== user?.userId) {
        toast.error('You do not have permission to access this language');
        navigate('/dashboard');
        return;
      }
      
      setLanguage(langData);

      // Initialize validator
      const phonologyValidator = new PhonologyValidator(
        langData.phonemes,
        langData.syllables,
        langData.rules
      );
      setValidator(phonologyValidator);

      const wordsData = await api.getWords(id);

      const formattedWords = (wordsData || []).map((word: any) => ({
        ...word,
        translations: word.translations || [],
        violations: word.violations || [],
      }));

      setWords(formattedWords);
      setAvailableParentWords(formattedWords);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load lexicon');
    } finally {
      setIsLoading(false);
    }
  };

  const filterWords = () => {
    let filtered = [...words];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (word) =>
          word.word.toLowerCase().includes(query) ||
          word.ipa.toLowerCase().includes(query) ||
          word.translations.some((t) => t.meaning.toLowerCase().includes(query))
      );
    }

    if (posFilter !== 'all') {
      filtered = filtered.filter((word) => word.pos.includes(posFilter));
    }

    if (rootFilter === 'root') {
      filtered = filtered.filter((word) => word.is_root);
    } else if (rootFilter === 'derived') {
      filtered = filtered.filter((word) => !word.is_root);
    }

    setFilteredWords(filtered);
  };

  const savePhonologicalViolations = async (_wordId: string, _violations: Violation[]) => {
    // Violations are now handled by the API when creating/updating words
    // This function is kept for compatibility but does nothing
  };

  const onSubmit = async (data: WordFormData) => {
    if (!id || !validator) return;

    try {
      // Check for duplicate words before creating
      const existingWord = words.find(w => 
        w.word.toLowerCase() === data.word.toLowerCase() || 
        w.ipa === data.ipa
      );
      
      if (existingWord && !editingWord) {
        toast.error(`Word "${data.word}" or IPA "${data.ipa}" already exists in your lexicon`);
        return;
      }
      
      // Check for duplicate translations
      const duplicateTranslation = words.find(w => 
        w.translations.some(t => 
          data.translations.some(dt => 
            t.language_code === dt.language_code && 
            t.meaning.toLowerCase() === dt.meaning.toLowerCase()
          )
        )
      );
      
      if (duplicateTranslation && !editingWord) {
        const conflictingTranslation = data.translations.find(dt => 
          duplicateTranslation.translations.some(t => 
            t.language_code === dt.language_code && 
            t.meaning.toLowerCase() === dt.meaning.toLowerCase()
          )
        );
        toast.error(`Translation "${conflictingTranslation?.meaning}" already exists for word "${duplicateTranslation.word}"`);
        return;
      }

      // Validate phonology
      const validation = validator.validate(data.ipa);

      if (editingWord) {
        await api.updateWord(editingWord.id, {
          word: data.word,
          ipa: data.ipa,
          pos: data.pos,
          is_root: data.is_root,
          translations: data.translations,
          etymology: data.parent_word_id ? {
            parent_word_id: data.parent_word_id,
            derivation_type: data.derivation_type,
            derivation_notes: data.derivation_notes,
          } : undefined,
          violations: validation.violations,
        });

        toast.success('Word updated successfully!');
      } else {
        await api.createWord({
          language_id: id,
          word: data.word,
          ipa: data.ipa,
          pos: data.pos,
          is_root: data.is_root,
          translations: data.translations,
          etymology: data.parent_word_id ? {
            parent_word_id: data.parent_word_id,
            derivation_type: data.derivation_type,
            derivation_notes: data.derivation_notes,
          } : undefined,
          violations: validation.violations,
        });

        toast.success('Word added successfully!');
      }

      setIsDialogOpen(false);
      setEditingWord(null);
      form.reset();
      setValidationResult(null);
      await loadLanguageAndWords();
    } catch (error) {
      console.error('Error saving word:', error);
      const message = error instanceof Error ? error.message : 'Failed to save word';
      toast.error(message);
    }
  };

  const handleEdit = (word: Word) => {
    setEditingWord(word);
    form.reset({
      word: word.word,
      ipa: word.ipa,
      pos: word.pos,
      is_root: word.is_root,
      parent_word_id: undefined,
      derivation_type: undefined,
      derivation_notes: '',
      translations: word.translations.map((t) => ({
        language_code: t.language_code,
        meaning: t.meaning,
      })),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteWordId) return;

    try {
      await api.deleteWord(deleteWordId);

      toast.success('Word deleted successfully');
      setDeleteWordId(null);
      await loadLanguageAndWords();
    } catch (error) {
      console.error('Error deleting word:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete word';
      toast.error(message);
    }
  };

  const handleExportJSON = () => {
    const exportData = words.map((word) => ({
      word: word.word,
      ipa: word.ipa,
      pos: word.pos,
      is_root: word.is_root,
      translations: word.translations.map((t) => ({
        language_code: t.language_code,
        meaning: t.meaning,
      })),
    }));

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${language?.name || 'lexicon'}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Lexicon exported as JSON!');
  };

  const handleExportCSV = () => {
    const headers = ['Word', 'IPA', 'Part of Speech', 'Root Word', 'Translations'];
    const rows = filteredWords.map((word) => [
      word.word,
      word.ipa,
      word.pos.join('; '),
      word.is_root ? 'Yes' : 'No',
      word.translations
        .map((t) => `${t.language_code}: ${t.meaning}`)
        .join(' | '),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${language?.name || 'lexicon'}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Lexicon exported as CSV!');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const parseCSV = (text: string): ImportWord[] => {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) throw new Error('CSV file is empty or invalid');

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const wordIndex = headers.findIndex((h) => h.includes('word') && !h.includes('root'));
    const ipaIndex = headers.findIndex((h) => h.includes('ipa'));
    const posIndex = headers.findIndex((h) => h.includes('pos') || h.includes('part of speech'));
    const rootIndex = headers.findIndex((h) => h.includes('root'));
    const translationIndex = headers.findIndex((h) => h.includes('translation'));

    if (wordIndex === -1 || ipaIndex === -1) {
      throw new Error('CSV must have "word" and "ipa" columns');
    }

    const words: ImportWord[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      
      if (values[wordIndex] && values[ipaIndex]) {
        const posValue = posIndex !== -1 ? values[posIndex] : 'noun';
        const pos = posValue.includes(';') ? posValue.split(';').map((p) => p.trim()) : [posValue];
        
        const isRoot = rootIndex !== -1 ? values[rootIndex].toLowerCase() === 'yes' : false;
        
        let translations: Array<{ language_code: string; meaning: string }> = [];
        if (translationIndex !== -1 && values[translationIndex]) {
          const transStr = values[translationIndex];
          if (transStr.includes('|')) {
            translations = transStr.split('|').map((t) => {
              const [lang, meaning] = t.split(':').map((s) => s.trim());
              return { language_code: lang || 'en', meaning: meaning || t };
            });
          } else {
            translations = [{ language_code: 'en', meaning: transStr }];
          }
        } else {
          translations = [{ language_code: 'en', meaning: values[wordIndex] }];
        }

        words.push({
          word: values[wordIndex],
          ipa: values[ipaIndex],
          pos,
          is_root: isRoot,
          translations,
        });
      }
    }

    return words;
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id || !validator) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      let importWords: ImportWord[] = [];

      if (file.name.endsWith('.json')) {
        const jsonData = JSON.parse(text);
        if (!Array.isArray(jsonData)) {
          throw new Error('JSON must be an array of words');
        }
        importWords = jsonData.map((item) => ({
          word: item.word,
          ipa: item.ipa,
          pos: Array.isArray(item.pos) ? item.pos : [item.pos || 'noun'],
          is_root: item.is_root || false,
          translations: Array.isArray(item.translations)
            ? item.translations
            : [{ language_code: 'en', meaning: item.translations || item.word }],
        }));
      } else if (file.name.endsWith('.csv')) {
        importWords = parseCSV(text);
      } else {
        throw new Error('Unsupported file format. Please use JSON or CSV.');
      }

      if (importWords.length === 0) {
        throw new Error('No valid words found in file');
      }

      let successCount = 0;
      let errorCount = 0;

      for (const importWord of importWords) {
        try {
          // Validate word
          const validation = validator.validate(importWord.ipa);

          await api.createWord({
            language_id: id,
            word: importWord.word,
            ipa: importWord.ipa,
            pos: importWord.pos,
            is_root: importWord.is_root,
            translations: importWord.translations,
            violations: validation.violations,
          });

          successCount++;
        } catch (error) {
          console.error('Error importing word:', importWord.word, error);
          errorCount++;
        }
      }

      toast.success(`Import complete! ${successCount} words imported successfully.`, {
        description: errorCount > 0 ? `${errorCount} words failed to import.` : undefined,
      });

      await loadLanguageAndWords();
    } catch (error) {
      console.error('Error importing file:', error);
      const message = error instanceof Error ? error.message : 'Failed to import file';
      toast.error(message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAIGenerate = async () => {
    if (!language || !id) return;

    // Validate phoneme inventory before attempting generation
    const consonantCount = language.phonemes?.consonants?.length || 0;
    const vowelCount = language.phonemes?.vowels?.length || 0;
    
    if (consonantCount === 0 || vowelCount === 0) {
      toast.error('Your language needs at least one consonant and one vowel to generate words. Please set up your phoneme inventory first.');
      return;
    }

    // AI word generation is not available without Supabase Edge Functions
    toast.error('AI word generation is not available. This feature requires Supabase Edge Functions which have been removed.');
  };

  const handleSelectWord = (selectedWord: any) => {
    form.setValue('word', selectedWord.word);
    form.setValue('ipa', selectedWord.ipa);
    if (generatorPos) {
      form.setValue('pos', [generatorPos]);
    }
    if (generatorMeaning) {
      form.setValue('translations', [{ language_code: 'en', meaning: generatorMeaning }]);
    }
    
    setShowWordSelection(false);
    setIsDialogOpen(true);
    
    toast.success('Word selected! Review and add to lexicon.');
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
          <p className="text-slate-500 font-medium">Loading lexicon...</p>
        </div>
      </div>
    );
  }

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
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleImportClick} 
              disabled={isImporting}
              className="border-2 border-[#DDBCEE] text-[#748BF6] hover:bg-[#DDBCEE]/20 hover:border-[#F269BF] rounded-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileImport}
              className="hidden"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  className="border-2 border-[#DDBCEE] text-[#748BF6] hover:bg-[#DDBCEE]/20 hover:border-[#F269BF] rounded-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-2 border-[#DDBCEE]/40 rounded-2xl">
                <DropdownMenuItem onClick={handleExportJSON} className="text-slate-600 hover:text-[#748BF6] focus:bg-[#DDBCEE]/20 focus:text-[#748BF6] rounded-xl">
                  <FileJson className="mr-2 h-4 w-4" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="text-slate-600 hover:text-[#F269BF] focus:bg-[#DDBCEE]/20 focus:text-[#F269BF] rounded-xl">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card className="relative overflow-hidden bg-white/80 border-2 border-[#DDBCEE]/40 rounded-3xl shadow-xl backdrop-blur-sm mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F269BF]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="relative border-b border-[#DDBCEE]/30">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-3xl font-bold text-slate-800">{language?.name} Lexicon ✨</CardTitle>
                <CardDescription className="text-slate-500">
                  {words.length} words in your dictionary
                  {filteredWords.length !== words.length && ` (${filteredWords.length} shown)`}
                </CardDescription>
              </div>
              <div className="flex gap-3">
                <Dialog open={generatorDialogOpen} onOpenChange={setGeneratorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="border-2 border-[#F269BF]/40 text-[#F269BF] hover:bg-[#F269BF]/10 hover:border-[#F269BF] rounded-full"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI Generate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-2 border-[#DDBCEE]/40 rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="text-slate-800">AI Word Generator ✨</DialogTitle>
                      <DialogDescription className="text-slate-500">
                        Generate a word using AI based on meaning and phonological rules
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Meaning (Optional)</label>
                        <Input
                          placeholder="e.g., water, fire, love"
                          className="bg-white border-2 border-[#DDBCEE]/40 focus:border-[#748BF6] text-slate-800 placeholder:text-slate-400 rounded-xl"
                          value={generatorMeaning}
                          onChange={(e) => setGeneratorMeaning(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          What should this word mean? Leave empty for random generation.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Part of Speech (Optional)</label>
                        <Select value={generatorPos} onValueChange={setGeneratorPos}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select POS" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any</SelectItem>
                            {POS_OPTIONS.map((pos) => (
                              <SelectItem key={pos} value={pos}>
                                {pos}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleAIGenerate}
                        disabled={isGenerating}
                        className="w-full"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Word
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingWord(null);
                        form.reset({
                          word: '',
                          ipa: '',
                          pos: [],
                          is_root: false,
                          parent_word_id: undefined,
                          derivation_type: undefined,
                          derivation_notes: '',
                          translations: [{ language_code: 'en', meaning: '' }],
                        });
                        setValidationResult(null);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Word
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingWord ? 'Edit Word' : 'Add New Word'}</DialogTitle>
                      <DialogDescription>
                        {editingWord ? 'Update the word details below' : 'Add a new word to your lexicon'}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="flex gap-2">
                          <FormField
                            control={form.control}
                            name="word"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Word (Alphabet)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., thalor" 
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      // Auto-convert to IPA
                                      const ipaValue = convertAlphabetToIPA(e.target.value);
                                      form.setValue('ipa', ipaValue);
                                    }}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Type using your alphabet - IPA will auto-fill
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ipa"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>IPA Notation</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., θalɔr" 
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      // Auto-convert to alphabet
                                      const alphabetValue = convertIPAToAlphabet(e.target.value);
                                      form.setValue('word', alphabetValue);
                                    }}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Type IPA - alphabet will auto-fill. Use <code className="text-purple-600">/</code> to split syllables (e.g., θa/lɔr)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {validationResult && validationResult.violations.length > 0 && (
                          <Alert variant={validationResult.isValid ? 'default' : 'destructive'}>
                            {validationResult.isValid ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            <AlertTitle>
                              {PhonologyValidator.getSummary(validationResult)}
                            </AlertTitle>
                            <AlertDescription>
                              <ul className="list-disc list-inside space-y-1 mt-2">
                                {validationResult.violations.map((v, i) => (
                                  <li key={i} className="text-sm">
                                    <strong>{v.type}:</strong> {v.description}
                                  </li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        <FormField
                          control={form.control}
                          name="pos"
                          render={() => (
                            <FormItem>
                              <FormLabel>Part of Speech</FormLabel>
                              <div className="flex flex-wrap gap-2">
                                {POS_OPTIONS.map((pos) => (
                                  <FormField
                                    key={pos}
                                    control={form.control}
                                    name="pos"
                                    render={({ field }) => (
                                      <FormItem className="flex items-center space-x-2">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(pos)}
                                            onCheckedChange={(checked) => {
                                              const current = field.value || [];
                                              if (checked) {
                                                field.onChange([...current, pos]);
                                              } else {
                                                field.onChange(current.filter((v) => v !== pos));
                                              }
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal cursor-pointer">{pos}</FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="is_root"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">Mark as root word</FormLabel>
                            </FormItem>
                          )}
                        />

                        {!form.watch('is_root') && (
                          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                            <h4 className="font-medium text-sm">Etymology (Optional)</h4>
                            <FormField
                              control={form.control}
                              name="parent_word_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Parent Word</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select parent word" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="all">None</SelectItem>
                                      {availableParentWords.map((word) => (
                                        <SelectItem key={word.id} value={word.id}>
                                          {word.word} ({word.ipa})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Select the word this is derived from
                                  </FormDescription>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="derivation_type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Derivation Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {DERIVATION_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                          {type}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="derivation_notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Derivation Notes</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Explain how this word was derived..."
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        <div className="space-y-3">
                          <FormLabel>Translations</FormLabel>
                          {form.watch('translations').map((_, index) => (
                            <div key={index} className="flex gap-2">
                              <FormField
                                control={form.control}
                                name={`translations.${index}.language_code`}
                                render={({ field }) => (
                                  <FormItem className="w-32">
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Language" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {LANGUAGE_OPTIONS.map((lang) => (
                                          <SelectItem key={lang.code} value={lang.code}>
                                            {lang.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`translations.${index}.meaning`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input placeholder="Translation" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              {index > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const current = form.getValues('translations');
                                    form.setValue(
                                      'translations',
                                      current.filter((_, i) => i !== index)
                                    );
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const current = form.getValues('translations');
                              form.setValue('translations', [...current, { language_code: 'en', meaning: '' }]);
                            }}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add Translation
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1">
                            {editingWord ? 'Update Word' : 'Add Word'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsDialogOpen(false);
                              setEditingWord(null);
                              form.reset();
                              setValidationResult(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search words, IPA, or translations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={posFilter} onValueChange={setPosFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="POS Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All POS</SelectItem>
                  {POS_OPTIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={rootFilter} onValueChange={setRootFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Root Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Words</SelectItem>
                  <SelectItem value="root">Root Only</SelectItem>
                  <SelectItem value="derived">Derived Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredWords.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-3xl flex items-center justify-center shadow-xl shadow-[#F269BF]/40 mx-auto mb-6 rotate-6">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <p className="text-slate-500 text-lg font-medium">
                  {words.length === 0 ? 'No words yet. Add your first word! ✨' : 'No words match your filters.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#DDBCEE]/30 hover:bg-transparent">
                      <TableHead className="text-[#748BF6] font-semibold text-sm uppercase tracking-wider">Word</TableHead>
                      <TableHead className="text-[#F269BF] font-semibold text-sm uppercase tracking-wider">IPA</TableHead>
                      <TableHead className="text-[#F5B485] font-semibold text-sm uppercase tracking-wider">POS</TableHead>
                      <TableHead className="text-[#A1FBFC] font-semibold text-sm uppercase tracking-wider">Translations</TableHead>
                      <TableHead className="text-slate-500 font-semibold text-sm uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWords.map((word, index) => {
                      const isEven = index % 2 === 0;
                      const rowBg = isEven ? 'bg-white/30' : 'bg-white/50';
                      
                      return (
                        <TableRow 
                          key={word.id} 
                          className={`border-b border-[#DDBCEE]/20 hover:bg-[#DDBCEE]/10 transition-colors duration-200 ${rowBg}`}
                        >
                          <TableCell className="font-bold py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-800 text-lg">{formatWordForDisplay(word.word)}</span>
                              {word.is_root && (
                                <Badge className="bg-gradient-to-r from-[#A1FBFC] to-[#748BF6] text-white border-0 font-bold shadow-lg rounded-full">
                                  Root
                                </Badge>
                              )}
                              {word.violations && word.violations.length > 0 && (
                                <Badge className="bg-gradient-to-r from-red-400 to-orange-400 text-white border-0 font-bold shadow-lg rounded-full">
                                  {word.violations.length} ⚠️
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-lg font-semibold">
                            <span className="text-[#F269BF]">{formatIPAForDisplay(word.ipa)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {word.pos.map((p, i) => {
                                const colors = [
                                  'bg-[#A1FBFC]/30 text-[#748BF6] border-[#A1FBFC]/50',
                                  'bg-[#DDBCEE]/30 text-[#F269BF] border-[#DDBCEE]/50',
                                  'bg-[#F5B485]/30 text-[#F269BF] border-[#F5B485]/50',
                                  'bg-[#748BF6]/30 text-[#748BF6] border-[#748BF6]/50',
                                ];
                                const colorClass = colors[i % colors.length];
                                
                                return (
                                  <Badge 
                                    key={p} 
                                    className={`${colorClass} border-2 font-semibold rounded-full`}
                                  >
                                    {p}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5">
                              {word.translations.map((t) => (
                                <div 
                                  key={t.id} 
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <Badge className="bg-gradient-to-r from-[#A1FBFC] to-[#748BF6] text-white border-0 text-xs font-bold shrink-0 rounded-full">
                                    {t.language_code.toUpperCase()}
                                  </Badge>
                                  <span className="text-slate-600 font-medium">{t.meaning}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/language/${id}/etymology/${word.id}`)}
                                className="bg-[#DDBCEE]/20 hover:bg-[#DDBCEE]/40 text-[#F269BF] hover:text-[#F269BF] border-2 border-[#DDBCEE]/40 h-9 w-9 rounded-xl"
                                title="View etymology tree"
                              >
                                <GitBranch className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEdit(word)}
                                className="bg-[#A1FBFC]/20 hover:bg-[#A1FBFC]/40 text-[#748BF6] hover:text-[#748BF6] border-2 border-[#A1FBFC]/40 h-9 w-9 rounded-xl"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setDeleteWordId(word.id)}
                                className="bg-red-100 hover:bg-red-200 text-red-500 hover:text-red-600 border-2 border-red-200 h-9 w-9 rounded-xl"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteWordId} onOpenChange={() => setDeleteWordId(null)}>
        <AlertDialogContent className="bg-white border-2 border-[#DDBCEE]/40 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-800">Delete Word?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              This will permanently delete this word and all its translations. This action cannot be undone.
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Word Selection Dialog */}
      <Dialog open={showWordSelection} onOpenChange={setShowWordSelection}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Generated Word</DialogTitle>
            <DialogDescription>
              Choose from the AI-generated words below, or regenerate for more options.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedWords.map((word, index) => (
                <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSelectWord(word)}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-lg">{word.word}</h4>
                          <p className="font-mono text-muted-foreground">{word.ipa}</p>
                        </div>
                        <Badge variant="outline">{generatorPos || 'word'}</Badge>
                      </div>
                      {word.syllables && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Syllables:</strong> {word.syllables}
                        </p>
                      )}
                      <p className="text-sm">{word.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleAIGenerate}
                disabled={isGenerating}
                variant="outline"
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Regenerate Words
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowWordSelection(false);
                  setGeneratedWords([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}