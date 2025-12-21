import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, GitBranch, Loader2, Star, Heart, Sparkles } from 'lucide-react';

interface Word {
  id: string;
  word: string;
  ipa: string;
  pos: string[];
  is_root: boolean;
  translations: Array<{
    language_code: string;
    meaning: string;
  }>;
}

interface Etymology {
  id: string;
  word_id: string;
  parent_word_id: string | null;
  derivation_type: string | null;
  derivation_notes: string | null;
}

interface EtymologyNode extends Word {
  etymology?: Etymology;
  parent?: EtymologyNode;
  children: EtymologyNode[];
}

export default function EtymologyTree() {
  const { id, wordId } = useParams<{ id: string; wordId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [rootWord, setRootWord] = useState<EtymologyNode | null>(null);
  const [languageName, setLanguageName] = useState('');

  useEffect(() => {
    if (!user || !id || !wordId) {
      navigate('/dashboard');
      return;
    }
    loadEtymologyTree();
  }, [user, id, wordId, navigate]);

  const loadEtymologyTree = async () => {
    if (!id || !wordId) return;

    try {
      const langData = await api.getLanguage(id);

      if (!langData) {
        toast.error('Language not found');
        navigate('/dashboard');
        return;
      }

      if (langData.user_id !== user?.userId) {
        toast.error('You do not have permission to access this language');
        navigate('/dashboard');
        return;
      }

      setLanguageName(langData.name);

      const wordData = await api.getWord(wordId);

      if (!wordData) {
        toast.error('Word not found');
        navigate(`/language/${id}/lexicon`);
        return;
      }

      const word: Word = {
        ...wordData,
        translations: wordData.translations || [],
      };

      const tree = await buildEtymologyTree(word);
      setRootWord(tree);
    } catch (error) {
      console.error('Error loading etymology tree:', error);
      toast.error('Failed to load etymology tree');
    } finally {
      setIsLoading(false);
    }
  };

  const buildEtymologyTree = async (word: Word): Promise<EtymologyNode> => {
    // Etymology data should be included in the word from the API
    const etymologyData = word.etymology;

    const node: EtymologyNode = {
      ...word,
      etymology: etymologyData || undefined,
      children: [],
    };

    // For now, we don't have a way to fetch parent words or children
    // This would require additional API endpoints
    // The tree will just show the current word

    return node;
  };

  const renderNode = (node: EtymologyNode, level: number = 0) => {
    const isCurrentWord = node.id === wordId;
    const colors = [
      { border: 'border-[#A1FBFC]', bg: 'bg-[#A1FBFC]/10' },
      { border: 'border-[#DDBCEE]', bg: 'bg-[#DDBCEE]/10' },
      { border: 'border-[#F269BF]', bg: 'bg-[#F269BF]/10' },
      { border: 'border-[#F5B485]', bg: 'bg-[#F5B485]/10' },
      { border: 'border-[#748BF6]', bg: 'bg-[#748BF6]/10' },
    ];
    const color = colors[level % colors.length];

    return (
      <div key={node.id} className="space-y-2">
        <Card
          className={`${
            isCurrentWord
              ? 'border-2 border-[#F269BF] shadow-lg shadow-[#F269BF]/20'
              : `border-2 ${color.border}/40`
          } ${level > 0 ? 'ml-8' : ''} rounded-2xl ${color.bg} backdrop-blur-sm`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg text-slate-800 font-bold">{node.word}</CardTitle>
                <span className="text-[#748BF6] font-mono text-sm">[{node.ipa}]</span>
                {node.is_root && (
                  <Badge className="bg-gradient-to-r from-[#A1FBFC] to-[#748BF6] text-white border-0 font-bold rounded-full">
                    Root
                  </Badge>
                )}
                {isCurrentWord && (
                  <Badge className="bg-gradient-to-r from-[#F269BF] to-[#F5B485] text-white border-0 font-bold rounded-full">
                    Current
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                {node.pos.map((p, i) => {
                  const posColors = [
                    'bg-[#A1FBFC]/30 text-[#748BF6]',
                    'bg-[#DDBCEE]/30 text-[#F269BF]',
                    'bg-[#F5B485]/30 text-[#F269BF]',
                  ];
                  return (
                    <Badge
                      key={p}
                      className={`${
                        posColors[i % posColors.length]
                      } border-0 text-xs font-semibold rounded-full`}
                    >
                      {p}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <CardDescription className="text-slate-600">
              {node.translations.map((t) => (
                <span key={t.language_code} className="mr-2">
                  <strong className="text-[#748BF6]">{t.language_code}:</strong> {t.meaning}
                </span>
              ))}
            </CardDescription>
          </CardHeader>
          {node.etymology && (
            <CardContent className="pt-0">
              <div className="text-sm text-slate-500">
                {node.etymology.derivation_type && (
                  <div>
                    <strong className="text-[#F269BF]">Derivation:</strong>{' '}
                    {node.etymology.derivation_type}
                  </div>
                )}
                {node.etymology.derivation_notes && (
                  <div className="mt-1">
                    <strong className="text-[#F269BF]">Notes:</strong>{' '}
                    {node.etymology.derivation_notes}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {node.children.length > 0 && (
          <div className="ml-4 border-l-2 border-[#DDBCEE]/50 pl-4 space-y-2">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const findRootNode = (node: EtymologyNode): EtymologyNode => {
    if (node.parent) {
      return findRootNode(node.parent);
    }
    return node;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#FFF8FC] via-[#F8F4FF] to-[#F0FAFF] flex items-center justify-center">
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#DDBCEE]/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-[#A1FBFC]/30 rounded-full blur-3xl animate-float-delayed" />
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/40 mx-auto mb-4 animate-bounce-gentle">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-slate-500 font-medium">Loading etymology tree...</p>
        </div>
      </div>
    );
  }

  const displayRoot = rootWord ? findRootNode(rootWord) : null;

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

      <div className="relative container max-w-5xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/language/${id}/words`)}
            className="text-slate-600 hover:text-[#F269BF] hover:bg-[#DDBCEE]/20 rounded-full px-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lexicon
          </Button>
        </div>

        <Card className="relative overflow-hidden bg-white/80 border-2 border-[#DDBCEE]/40 rounded-3xl shadow-xl backdrop-blur-sm mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#A1FBFC]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#748BF6] via-[#F269BF] to-[#F5B485] rounded-2xl flex items-center justify-center shadow-lg shadow-[#F269BF]/30 rotate-3">
                <GitBranch className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-slate-800">Etymology Tree</CardTitle>
                <CardDescription className="text-slate-500">
                  {languageName} - Word Derivations ✨
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {displayRoot ? (
              <div className="space-y-4">{renderNode(displayRoot)}</div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-[#DDBCEE]/30 to-[#F269BF]/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-10 w-10 text-[#F269BF]" />
                </div>
                <p className="text-slate-600 font-medium">
                  No etymology information available for this word.
                </p>
                <p className="text-sm mt-2 text-slate-500">
                  Add derivation information in the word editor to build the etymology tree.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
