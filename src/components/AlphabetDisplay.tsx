import { Card } from '@/components/ui/card';

interface AlphabetDisplayProps {
  consonantMappings: { [key: string]: string };
  vowelMappings: { [key: string]: string };
  featureMappings?: { [key: string]: { [key: string]: string } };
}

interface PhonemeGroup {
  alphabet: string;
  ipa: string;
  type: string;
}

export function AlphabetDisplay({
  consonantMappings,
  vowelMappings,
  featureMappings = {},
}: AlphabetDisplayProps) {
  const consonants: PhonemeGroup[] = Object.entries(consonantMappings)
    .map(([alphabet, ipa]) => ({
      alphabet,
      ipa,
      type: 'consonant',
    }))
    .sort((a, b) => a.alphabet.localeCompare(b.alphabet));

  const vowels: PhonemeGroup[] = Object.entries(vowelMappings)
    .map(([alphabet, ipa]) => ({
      alphabet,
      ipa,
      type: 'vowel',
    }))
    .sort((a, b) => a.alphabet.localeCompare(b.alphabet));

  const features: { [key: string]: PhonemeGroup[] } = {};
  Object.entries(featureMappings).forEach(([featureKey, mappings]) => {
    features[featureKey] = Object.entries(mappings)
      .map(([alphabet, ipa]) => ({
        alphabet,
        ipa,
        type: featureKey,
      }))
      .sort((a, b) => a.alphabet.localeCompare(b.alphabet));
  });

  const getFeatureColor = (featureKey: string) => {
    // Specific feature colors
    const specificColors: { [key: string]: { from: string; to: string; border: string } } = {
      ejectives: { from: '#8B5CF6', to: '#7C3AED', border: '#8B5CF6' }, // Purple
      affricates: { from: '#EAB308', to: '#CA8A04', border: '#EAB308' }, // Yellow
      diphthongs: { from: '#EC4899', to: '#DB2777', border: '#EC4899' }, // Violet/Pink
    };
    
    if (specificColors[featureKey]) {
      return specificColors[featureKey];
    }
    
    // Default colors for other features
    const colors = [
      { from: '#EF4444', to: '#DC2626', border: '#EF4444' }, // Red
      { from: '#06B6D4', to: '#0891B2', border: '#06B6D4' }, // Cyan
      { from: '#10B981', to: '#059669', border: '#10B981' }, // Green
      { from: '#F59E0B', to: '#D97706', border: '#F59E0B' }, // Amber
      { from: '#14B8A6', to: '#0D9488', border: '#14B8A6' }, // Teal
      { from: '#F97316', to: '#EA580C', border: '#F97316' }, // Orange
    ];
    const hash = featureKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const PhonemeCard = ({ item }: { item: PhonemeGroup }) => {
    const getTypeColor = (type: string) => {
      if (type === 'consonant') {
        return 'bg-gradient-to-br from-[#A1FBFC] to-[#748BF6] border-[#A1FBFC]/50 text-white shadow-lg shadow-[#A1FBFC]/30 hover:shadow-xl hover:shadow-[#A1FBFC]/40';
      } else if (type === 'vowel') {
        return 'bg-gradient-to-br from-[#DDBCEE] to-[#F269BF] border-[#DDBCEE]/50 text-white shadow-lg shadow-[#DDBCEE]/30 hover:shadow-xl hover:shadow-[#DDBCEE]/40';
      } else {
        return 'border-2 text-white';
      }
    };

    const getInlineStyle = (type: string) => {
      if (type === 'consonant' || type === 'vowel') return {};
      const color = getFeatureColor(type);
      return {
        backgroundImage: `linear-gradient(to bottom right, ${color.from}, ${color.to})`,
        borderColor: `${color.border}80`,
        boxShadow: `0 10px 15px -3px ${color.border}4D, 0 4px 6px -4px ${color.border}4D`,
      };
    };

    const getHoverStyle = (type: string) => {
      if (type === 'consonant' || type === 'vowel') return {};
      const color = getFeatureColor(type);
      return {
        ':hover': {
          boxShadow: `0 20px 25px -5px ${color.border}66, 0 8px 10px -6px ${color.border}66`,
        }
      };
    };

    return (
      <div
        className={`
          relative overflow-hidden border rounded-lg px-2 py-1 transition-all duration-300 hover:scale-110 cursor-default flex items-center justify-center gap-1.5
          ${getTypeColor(item.type)}
        `}
        style={getInlineStyle(item.type)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
        <div className="relative text-[15px] font-bold drop-shadow-sm">{item.alphabet}</div>
        <div className="relative text-[12px] opacity-70">→</div>
        <div className="relative text-[14px] font-mono font-semibold">{item.ipa}</div>
      </div>
    );
  };

  if (consonants.length === 0 && vowels.length === 0 && Object.keys(features).length === 0) {
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

      {/* Features */}
      {Object.entries(features).map(([featureKey, items]) => {
        if (items.length === 0) return null;
        const color = getFeatureColor(featureKey);
        return (
          <div key={featureKey}>
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="h-1 w-8 rounded-full" 
                style={{ backgroundImage: `linear-gradient(to right, ${color.from}, ${color.to})` }}
              />
              <h4 
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: color.to }}
              >
                {featureKey.charAt(0).toUpperCase() + featureKey.slice(1)} ({items.length})
              </h4>
            </div>
            <Card 
              className="p-6 bg-white/50 border-2 rounded-2xl backdrop-blur-sm"
              style={{ borderColor: `${color.border}4D` }}
            >
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                {items.map((item) => (
                  <PhonemeCard key={item.alphabet} item={item} />
                ))}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
