import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IPAChartProps {
  enabledConsonants: string[];
  enabledVowels: string[];
  enabledFeatures?: { [key: string]: string[] };
}

// IPA Consonant Chart (Pulmonic)
const consonantChart = {
  rows: [
    {
      name: 'Plosive',
      phonemes: ['p', 'b', 't', 'd', 'ʈ', 'ɖ', 'c', 'ɟ', 'k', 'ɡ', 'q', 'ɢ', 'ʔ'],
    },
    { name: 'Nasal', phonemes: ['m', 'ɱ', 'n', 'ɳ', 'ɲ', 'ŋ', 'ɴ'] },
    { name: 'Trill', phonemes: ['ʙ', 'r', 'ʀ'] },
    { name: 'Tap/Flap', phonemes: ['ⱱ', 'ɾ', 'ɽ'] },
    {
      name: 'Fricative',
      phonemes: [
        'ɸ',
        'β',
        'f',
        'v',
        'θ',
        'ð',
        's',
        'z',
        'ʃ',
        'ʒ',
        'ʂ',
        'ʐ',
        'ç',
        'ʝ',
        'x',
        'ɣ',
        'χ',
        'ʁ',
        'ħ',
        'ʕ',
        'h',
        'ɦ',
      ],
    },
    { name: 'Lateral Fricative', phonemes: ['ɬ', 'ɮ'] },
    { name: 'Approximant', phonemes: ['ʋ', 'ɹ', 'ɻ', 'j', 'ɰ'] },
    { name: 'Lateral Approximant', phonemes: ['l', 'ɭ', 'ʎ', 'ʟ'] },
  ],
};

// IPA Vowel Chart
const vowelChart = {
  rows: [
    { name: 'Close', phonemes: ['i', 'y', 'ɨ', 'ʉ', 'ɯ', 'u'] },
    { name: 'Near-close', phonemes: ['ɪ', 'ʏ', 'ʊ'] },
    { name: 'Close-mid', phonemes: ['e', 'ø', 'ɘ', 'ɵ', 'ɤ', 'o'] },
    { name: 'Mid', phonemes: ['ə'] },
    { name: 'Open-mid', phonemes: ['ɛ', 'œ', 'ɜ', 'ɞ', 'ʌ', 'ɔ'] },
    { name: 'Near-open', phonemes: ['æ', 'ɐ'] },
    { name: 'Open', phonemes: ['a', 'ɶ', 'ɑ', 'ɒ'] },
  ],
};

export function IPAChart({ enabledConsonants, enabledVowels, enabledFeatures = {} }: IPAChartProps) {
  // Collect all feature phonemes and categorize them
  const allFeaturePhonemes = Object.values(enabledFeatures).flat();
  
  // Determine which feature phonemes are consonants vs vowels based on IPA chart
  const allConsonantPhonemes = consonantChart.rows.flatMap(row => row.phonemes);
  const allVowelPhonemes = vowelChart.rows.flatMap(row => row.phonemes);
  
  const featureConsonants = allFeaturePhonemes.filter(p => allConsonantPhonemes.includes(p));
  const featureVowels = allFeaturePhonemes.filter(p => allVowelPhonemes.includes(p));
  
  // Combine with explicitly defined consonants/vowels
  const allEnabledConsonants = [...enabledConsonants, ...featureConsonants];
  const allEnabledVowels = [...enabledVowels, ...featureVowels];
  return (
    <Tabs defaultValue="consonants" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-white/50 border-2 border-[#DDBCEE]/30 p-1 rounded-2xl">
        <TabsTrigger
          value="consonants"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#A1FBFC] data-[state=active]:to-[#748BF6] data-[state=active]:text-white text-slate-500 rounded-xl font-semibold transition-all"
        >
          Consonants
          {allEnabledConsonants.length > 0 && (
            <Badge className="ml-2 bg-[#A1FBFC]/30 text-[#748BF6] border-0 font-bold">
              {allEnabledConsonants.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="vowels"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#DDBCEE] data-[state=active]:to-[#F269BF] data-[state=active]:text-white text-slate-500 rounded-xl font-semibold transition-all"
        >
          Vowels
          {allEnabledVowels.length > 0 && (
            <Badge className="ml-2 bg-[#DDBCEE]/30 text-[#F269BF] border-0 font-bold">
              {allEnabledVowels.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="consonants" className="mt-4">
        <Card className="p-6 overflow-x-auto bg-white/50 border-2 border-[#A1FBFC]/30 rounded-2xl backdrop-blur-sm">
          <div className="space-y-3 min-w-max">
            {consonantChart.rows.map((row) => (
              <div key={row.name} className="flex items-center gap-3">
                <div className="w-44 text-sm font-medium text-slate-500 shrink-0">{row.name}</div>
                <div className="flex flex-wrap gap-2">
                  {row.phonemes.map((phoneme) => {
                    const isEnabled = allEnabledConsonants.includes(phoneme);
                    return (
                      <Badge
                        key={phoneme}
                        className={`
                          font-mono text-base w-11 h-11 flex items-center justify-center transition-all duration-300 cursor-default rounded-xl
                          ${
                            isEnabled
                              ? 'bg-gradient-to-br from-[#A1FBFC] to-[#748BF6] text-white font-bold shadow-lg shadow-[#A1FBFC]/30 border-[#A1FBFC]/50 hover:scale-110'
                              : 'bg-slate-100 text-slate-400 border-slate-200 opacity-50'
                          }
                        `}
                      >
                        {phoneme}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="vowels" className="mt-4">
        <Card className="p-6 overflow-x-auto bg-white/50 border-2 border-[#DDBCEE]/30 rounded-2xl backdrop-blur-sm">
          <div className="space-y-3 min-w-max">
            {vowelChart.rows.map((row) => (
              <div key={row.name} className="flex items-center gap-3">
                <div className="w-44 text-sm font-medium text-slate-500 shrink-0">{row.name}</div>
                <div className="flex flex-wrap gap-2">
                  {row.phonemes.map((phoneme) => {
                    const isEnabled = allEnabledVowels.includes(phoneme);
                    return (
                      <Badge
                        key={phoneme}
                        className={`
                          font-mono text-base w-11 h-11 flex items-center justify-center transition-all duration-300 cursor-default rounded-xl
                          ${
                            isEnabled
                              ? 'bg-gradient-to-br from-[#DDBCEE] to-[#F269BF] text-white font-bold shadow-lg shadow-[#DDBCEE]/30 border-[#DDBCEE]/50 hover:scale-110'
                              : 'bg-slate-100 text-slate-400 border-slate-200 opacity-50'
                          }
                        `}
                      >
                        {phoneme}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
