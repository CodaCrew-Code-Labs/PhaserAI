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
      // Nucleus: vowels + diphthongs + semivowels (if they exist)
      const vowelAlphabets = Object.keys(vowelMappings || {});
      const diphthongAlphabets = Object.keys(featureMappings?.diphthongs || {});
      const semivowelAlphabets = Object.keys(featureMappings?.semivowels || {});
      
      const groups = [
        { key: 'group:vowels', label: 'All Vowels' },
        ...(diphthongAlphabets.length > 0 ? [{ key: 'group:diphthongs', label: 'All Diphthongs' }] : []),
        ...(semivowelAlphabets.length > 0 ? [{ key: 'group:semivowels', label: 'All Semivowels' }] : []),
      ];
      
      return {
        groups,
        alphabets: [...vowelAlphabets, ...diphthongAlphabets, ...semivowelAlphabets],
      };
    } else {
      // Onset/Coda: consonants + all special features + semivowels
      const consonantAlphabets = Object.keys(consonantMappings || {});
      const featureAlphabets = Object.values(featureMappings || {})
        .filter((_, idx) => Object.keys(featureMappings || {})[idx] !== 'diphthongs')
        .flatMap(m => Object.keys(m || {}));
      
      const groups = [
        { key: 'group:consonants', label: 'All Consonants' },
        ...Object.keys(featureMappings || {})
          .filter(k => k !== 'diphthongs')
          .map(k => ({ key: `group:${k}`, label: k.charAt(0).toUpperCase() + k.slice(1) }))
      ];
      
      return {
        groups,
        alphabets: [...consonantAlphabets, ...featureAlphabets],
      };
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
          Syllable Rules (Required)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {SYLLABLE_POSITIONS.map(pos => {
          const options = getAvailableOptions(pos.key);
          const selected = syllableRules[pos.key] || [];
          const hiddenAlphabets = getHiddenAlphabets(selected);
          const visibleAlphabets = options.alphabets.filter(alpha => !hiddenAlphabets.includes(alpha));
          
          return (
            <div key={pos.key} className="p-4 bg-white rounded-xl border-2 border-[#F5B485]/20">
              <div className="mb-3">
                <h4 className="font-semibold text-slate-700">{pos.label}</h4>
                <p className="text-xs text-slate-500">{pos.description}</p>
              </div>
              
              <div className="space-y-3">
                {/* Group options */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">Phoneme Groups:</p>
                  <div className="flex flex-wrap gap-2">
                    {options.groups.map(group => (
                      <div key={group.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${pos.key}-${group.key}`}
                          checked={selected.includes(group.key)}
                          onCheckedChange={() => toggleRule(pos.key, group.key)}
                        />
                        <label htmlFor={`${pos.key}-${group.key}`} className="text-sm cursor-pointer">
                          {group.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual alphabets */}
                {visibleAlphabets.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Individual Letters:</p>
                    <div className="flex flex-wrap gap-2">
                      {visibleAlphabets.map(alpha => (
                        <Badge
                          key={alpha}
                          onClick={() => toggleRule(pos.key, alpha)}
                          className={`cursor-pointer ${
                            selected.includes(alpha)
                              ? 'bg-[#F5B485] text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {alpha}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected summary */}
                {selected.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-500">Selected: {selected.length} rule(s)</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
