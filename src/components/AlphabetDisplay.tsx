import { Card } from '@/components/ui/card';

interface AlphabetDisplayProps {
  consonantMappings: { [key: string]: string };
  vowelMappings: { [key: string]: string };
  diphthongMappings: { [key: string]: string };
}

interface PhonemeGroup {
  alphabet: string;
  ipa: string;
  type: 'consonant' | 'vowel' | 'diphthong';
}

export function AlphabetDisplay({
  consonantMappings,
  vowelMappings,
  diphthongMappings,
}: AlphabetDisplayProps) {
  const consonants: PhonemeGroup[] = Object.entries(consonantMappings)
    .map(([alphabet, ipa]) => ({
      alphabet,
      ipa,
      type: 'consonant' as const,
    }))
    .sort((a, b) => a.alphabet.localeCompare(b.alphabet));

  const vowels: PhonemeGroup[] = Object.entries(vowelMappings)
    .map(([alphabet, ipa]) => ({
      alphabet,
      ipa,
      type: 'vowel' as const,
    }))
    .sort((a, b) => a.alphabet.localeCompare(b.alphabet));

  const diphthongs: PhonemeGroup[] = Object.entries(diphthongMappings)
    .map(([alphabet, ipa]) => ({
      alphabet,
      ipa,
      type: 'diphthong' as const,
    }))
    .sort((a, b) => a.alphabet.localeCompare(b.alphabet));

  const PhonemeCard = ({ item }: { item: PhonemeGroup }) => {
    const getTypeColor = (type: 'consonant' | 'vowel' | 'diphthong') => {
      switch (type) {
        case 'consonant':
          return 'bg-gradient-to-br from-[#A1FBFC] to-[#748BF6] border-[#A1FBFC]/50 text-white shadow-lg shadow-[#A1FBFC]/30 hover:shadow-xl hover:shadow-[#A1FBFC]/40';
        case 'vowel':
          return 'bg-gradient-to-br from-[#DDBCEE] to-[#F269BF] border-[#DDBCEE]/50 text-white shadow-lg shadow-[#DDBCEE]/30 hover:shadow-xl hover:shadow-[#DDBCEE]/40';
        case 'diphthong':
          return 'bg-gradient-to-br from-[#F5B485] to-[#F269BF] border-[#F5B485]/50 text-white shadow-lg shadow-[#F5B485]/30 hover:shadow-xl hover:shadow-[#F5B485]/40';
      }
    };

    return (
      <div
        className={`
          relative overflow-hidden border-2 rounded-2xl p-3 transition-all duration-300 hover:scale-110 cursor-default
          ${getTypeColor(item.type)}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
        <div className="relative text-xl font-bold text-center drop-shadow-sm">{item.alphabet}</div>
        <div className="relative text-center text-xs opacity-70 my-1">↓</div>
        <div className="relative text-base font-mono text-center font-semibold">{item.ipa}</div>
      </div>
    );
  };

  if (consonants.length === 0 && vowels.length === 0 && diphthongs.length === 0) {
    return (
      <Card className="p-12 text-center bg-white/50 border-2 border-[#DDBCEE]/30 rounded-2xl backdrop-blur-sm">
        <p className="text-slate-500">No alphabet mappings defined yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Consonants */}
      {consonants.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1 w-8 bg-gradient-to-r from-[#A1FBFC] to-[#748BF6] rounded-full" />
            <h4 className="text-sm font-semibold text-[#748BF6] uppercase tracking-wider">
              Consonants ({consonants.length})
            </h4>
          </div>
          <Card className="p-6 bg-white/50 border-2 border-[#A1FBFC]/30 rounded-2xl backdrop-blur-sm">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
              {consonants.map((item) => (
                <PhonemeCard key={item.alphabet} item={item} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Vowels */}
      {vowels.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1 w-8 bg-gradient-to-r from-[#DDBCEE] to-[#F269BF] rounded-full" />
            <h4 className="text-sm font-semibold text-[#F269BF] uppercase tracking-wider">
              Vowels ({vowels.length})
            </h4>
          </div>
          <Card className="p-6 bg-white/50 border-2 border-[#DDBCEE]/30 rounded-2xl backdrop-blur-sm">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
              {vowels.map((item) => (
                <PhonemeCard key={item.alphabet} item={item} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Diphthongs */}
      {diphthongs.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1 w-8 bg-gradient-to-r from-[#F5B485] to-[#F269BF] rounded-full" />
            <h4 className="text-sm font-semibold text-[#F5B485] uppercase tracking-wider">
              Diphthongs ({diphthongs.length})
            </h4>
          </div>
          <Card className="p-6 bg-white/50 border-2 border-[#F5B485]/30 rounded-2xl backdrop-blur-sm">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
              {diphthongs.map((item) => (
                <PhonemeCard key={item.alphabet} item={item} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
