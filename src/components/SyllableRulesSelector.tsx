import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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

interface SyllableRulesSelectorProps {
  consonantMappings: { [key: string]: string };
  vowelMappings: { [key: string]: string };
  featureMappings: { [key: string]: { [key: string]: string } };
  syllableRules: { [key: string]: string[] };
  exclusionRules?: any[]; // Add exclusion rules to check for configured alphabets
  onRulesChange: (rules: { [key: string]: string[] }) => void;
  onExclusionRulesChange?: (rules: any[]) => void; // Add callback to update exclusion rules
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
  exclusionRules = [],
  onRulesChange,
  onExclusionRulesChange,
}: SyllableRulesSelectorProps) {
  const [pendingChange, setPendingChange] = useState<{
    posKey: string;
    value: string;
    action: 'add' | 'remove';
    affectedAlphabets: string[];
  } | null>(null);

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

  const getAffectedAlphabets = (groupKey: string, posKey: string): string[] => {
    const groupAlphabets: string[] = [];
    
    if (groupKey === 'group:consonants') {
      groupAlphabets.push(...Object.keys(consonantMappings || {}));
    } else if (groupKey === 'group:vowels') {
      groupAlphabets.push(...Object.keys(vowelMappings || {}));
    } else if (groupKey === 'group:diphthongs') {
      groupAlphabets.push(...Object.keys(featureMappings?.diphthongs || {}));
    } else if (groupKey.startsWith('group:')) {
      const featureKey = groupKey.replace('group:', '');
      groupAlphabets.push(...Object.keys(featureMappings?.[featureKey] || {}));
    }
    
    // Filter to only include alphabets that are actually configured in exclusion rules for this position
    const affectedAlphabets = groupAlphabets.filter(alphabet => {
      return exclusionRules.some(rule => {
        // Check if this rule applies to the same position and contains this alphabet
        const rulePosition = rule.position;
        const positionType = posKey === 'nucleus' ? 'Nucleus' : 
                           posKey === 'onset' ? 'Onset' : 'Coda';
        
        return rulePosition.startsWith(positionType) && 
               rule.excludedAlphabets.includes(alphabet);
      });
    });
    
    return affectedAlphabets;
  };

  const toggleRule = (posKey: string, value: string) => {
    const current = syllableRules[posKey] || [];
    const isRemoving = current.includes(value);
    
    if (isRemoving && value.startsWith('group:')) {
      // Check if any alphabets from this group are configured in exclusion rules
      const affectedAlphabets = getAffectedAlphabets(value, posKey);
      
      if (affectedAlphabets.length > 0) {
        // Show confirmation dialog
        setPendingChange({
          posKey,
          value,
          action: 'remove',
          affectedAlphabets
        });
        return;
      }
    }
    
    // Proceed with the change immediately if no confirmation needed
    const newRules = isRemoving
      ? current.filter(v => v !== value)
      : [...current, value];
    
    onRulesChange({ ...syllableRules, [posKey]: newRules });
  };

  const confirmChange = () => {
    if (!pendingChange) return;
    
    const { posKey, value, action, affectedAlphabets } = pendingChange;
    const current = syllableRules[posKey] || [];
    
    // Update syllable rules
    const newRules = action === 'remove'
      ? current.filter(v => v !== value)
      : [...current, value];
    
    onRulesChange({ ...syllableRules, [posKey]: newRules });
    
    // Update exclusion rules by removing affected alphabets
    if (action === 'remove' && affectedAlphabets.length > 0 && onExclusionRulesChange) {
      const updatedExclusionRules = exclusionRules.map(rule => {
        const rulePosition = rule.position;
        const positionType = posKey === 'nucleus' ? 'Nucleus' : 
                           posKey === 'onset' ? 'Onset' : 'Coda';
        
        if (rulePosition.startsWith(positionType)) {
          // Remove affected alphabets from this rule
          const updatedExcludedAlphabets = rule.excludedAlphabets.filter(
            (alphabet: string) => !affectedAlphabets.includes(alphabet)
          );
          
          return {
            ...rule,
            excludedAlphabets: updatedExcludedAlphabets
          };
        }
        
        return rule;
      }).filter(rule => rule.excludedAlphabets.length > 0); // Remove rules with no excluded alphabets
      
      onExclusionRulesChange(updatedExclusionRules);
    }
    
    setPendingChange(null);
  };

  const cancelChange = () => {
    setPendingChange(null);
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
    <>
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

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingChange} onOpenChange={() => setPendingChange(null)}>
        <AlertDialogContent className="bg-white border-2 border-[#DDBCEE]/40 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-800">
              Confirm Phoneme Group Change
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              {pendingChange && (
                <>
                  Removing this phoneme group will affect <strong>{pendingChange.affectedAlphabets.length}</strong> alphabet(s) 
                  that are currently configured in exclusion rules for this syllable position:
                  <div className="mt-2 p-2 bg-slate-100 rounded-lg">
                    <div className="flex flex-wrap gap-1">
                      {pendingChange.affectedAlphabets.map(alphabet => (
                        <Badge key={alphabet} className="bg-slate-200 text-slate-600 text-xs">
                          {alphabet}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    These alphabets will be automatically removed from the exclusion rules. Do you want to continue?
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={cancelChange}
              className="border-2 border-[#DDBCEE] text-slate-600 hover:bg-[#DDBCEE]/20 rounded-full"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmChange}
              className="bg-[#F5B485] text-white hover:bg-[#F5B485]/80 rounded-full"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
