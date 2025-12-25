import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface SyllableRulesSelectorProps {
  consonantMappings: { [key: string]: string };
  vowelMappings: { [key: string]: string };
  featureMappings: { [key: string]: { [key: string]: string } };
  syllableRules: { [key: string]: string[] };
  onRulesChange: (rules: { [key: string]: string[] }) => void;
}

const SYLLABLE_POSITIONS = [
  { key: 'onset', label: 'Onset', description: 'Initial consonant(s)' },
  { key: 'nucleus', label: 'Nucleus', description: 'Vowel core' },
  { key: 'coda', label: 'Coda', description: 'Final consonant(s)' },
];

export function SyllableRulesSelector({
  consonantMappings,
  vowelMappings,
  featureMappings,
  syllableRules,
  onRulesChange,
}: SyllableRulesSelectorProps) {

  useEffect(() => {
    if (!consonantMappings || !vowelMappings || !featureMappings) return;
    
    // Clean up rules for removed alphabets
    const newRules = { ...syllableRules };
    Object.keys(newRules).forEach(posKey => {
      newRules[posKey] = (newRules[posKey] || []).filter(item => {
        const allAlphabets = [
          ...Object.keys(consonantMappings || {}),
          ...Object.keys(vowelMappings || {}),
          ...Object.values(featureMappings || {}).flatMap(m => Object.keys(m || {}))
        ];
        return item.startsWith('group:') || allAlphabets.includes(item);
      });
    });
    onRulesChange(newRules);
  }, [consonantMappings, vowelMappings, featureMappings]);

  const toggleRule = (posKey: string, value: string) => {
    const current = syllableRules[posKey] || [];
    const newRules = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    
    onRulesChange({ ...syllableRules, [posKey]: newRules });
  };

  const getHiddenAlphabets = (selected: string[]) => {
    const hidden: string[] = [];
    selected.forEach(item => {
      if (item === 'group:consonants') {
        hidden.push(...Object.keys(consonantMappings || {}));
      } else if (item === 'group:vowels') {
        hidden.push(...Object.keys(vowelMappings || {}));
      } else if (item === 'group:diphthongs') {
        hidden.push(...Object.keys(featureMappings?.diphthongs || {}));
      } else if (item === 'group:semivowels') {
        hidden.push(...Object.keys(featureMappings?.semivowels || {}));
      } else if (item.startsWith('group:')) {
        const featureKey = item.replace('group:', '');
        hidden.push(...Object.keys(featureMappings?.[featureKey] || {}));
      }
    });
    return hidden;
  };

  const getAvailableOptions = (posKey: string) => {
    if (posKey === 'nucleus') {
      // Nucleus: vowels + diphthongs only
      const groups = [
        { key: 'group:vowels', label: 'Vowels' },
        ...(Object.keys(featureMappings?.diphthongs || {}).length > 0 ? [{ key: 'group:diphthongs', label: 'Diphthongs' }] : []),
      ];
      
      return { groups };
    } else {
      // Onset/Coda: consonants + all other features
      const groups = [
        { key: 'group:consonants', label: 'Consonants' },
        ...Object.keys(featureMappings || {})
          .filter(k => k !== 'diphthongs')
          .filter(k => Object.keys(featureMappings[k] || {}).length > 0)
          .map(k => ({ key: `group:${k}`, label: k.charAt(0).toUpperCase() + k.slice(1) }))
      ];
      
      return { groups };
    }
  };

  const getFeatureOptions = () => {
    return [];
  };

  const featureOpts = getFeatureOptions();

  return (
    <Card className="bg-white/50 border-2 border-[#F5B485]/30 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-slate-700 font-medium text-sm">
          Syllable Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {SYLLABLE_POSITIONS.map(pos => {
          const options = getAvailableOptions(pos.key);
          const selected = syllableRules[pos.key] || [];
          
          return (
            <div key={pos.key} className="flex items-center gap-3">
              <div className="w-24 shrink-0">
                <h4 className="font-semibold text-slate-700 text-sm">{pos.label}</h4>
                <p className="text-xs text-slate-400">{pos.description}</p>
              </div>
              
              <div className="flex flex-wrap gap-2 flex-1">
                {options.groups.map(group => (
                  <Badge
                    key={group.key}
                    onClick={() => toggleRule(pos.key, group.key)}
                    className={`cursor-pointer transition-all ${
                      selected.includes(group.key)
                        ? 'bg-[#F5B485] text-white hover:bg-[#F5B485]/80'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {group.label}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
