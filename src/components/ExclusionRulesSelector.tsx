import { useState, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit2, Check } from 'lucide-react';

interface ExclusionRule {
  id: string;
  syllablePatterns: string[]; // Changed from syllablePattern to support multiple patterns
  position: string;
  excludedAlphabets: string[];
}

interface ExclusionRulesSelectorProps {
  syllableStructure: string;
  consonantMappings: { [key: string]: string };
  vowelMappings: { [key: string]: string };
  featureMappings: { [key: string]: { [key: string]: string } };
  syllableRules: { [key: string]: string[] };
  exclusionRules: ExclusionRule[];
  onRulesChange: (rules: ExclusionRule[]) => void;
}

export const ExclusionRulesSelector = memo(function ExclusionRulesSelector({
  syllableStructure,
  consonantMappings,
  vowelMappings,
  featureMappings,
  syllableRules,
  exclusionRules,
  onRulesChange,
}: ExclusionRulesSelectorProps) {
  const [newRule, setNewRule] = useState<Partial<ExclusionRule & { syllablePattern: string }>>({
    syllablePattern: '',
    position: '',
    excludedAlphabets: [],
  });
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editRule, setEditRule] = useState<Partial<ExclusionRule & { syllablePattern: string }>>({});

  const generateSyllableVariations = useMemo(() => {
    if (!syllableStructure) return [];
    
    const structure = syllableStructure.trim();
    const uniqueVariations = new Set<string>();
    
    // Simple approach: manually handle common patterns
    if (structure === '(C)V(C)') {
      uniqueVariations.add('V');
      uniqueVariations.add('CV');
      uniqueVariations.add('VC');
      uniqueVariations.add('CVC');
    } else if (structure === 'CV') {
      uniqueVariations.add('CV');
    } else if (structure === 'CVC') {
      uniqueVariations.add('CVC');
    } else if (structure === '(C)V') {
      uniqueVariations.add('V');
      uniqueVariations.add('CV');
    } else if (structure === 'V(C)') {
      uniqueVariations.add('V');
      uniqueVariations.add('VC');
    } else {
      // Fallback: parse the structure more carefully
      const parts: Array<{ char: string; optional: boolean }> = [];
      let i = 0;
      
      while (i < structure.length) {
        const char = structure[i];
        if (char === '(') {
          const closeIdx = structure.indexOf(')', i);
          if (closeIdx !== -1 && closeIdx > i + 1) {
            const innerChar = structure[i + 1];
            if (innerChar && (innerChar === 'C' || innerChar === 'V')) {
              parts.push({ char: innerChar, optional: true });
            }
            i = closeIdx + 1;
          } else {
            i++;
          }
        } else if (char === 'C' || char === 'V') {
          parts.push({ char, optional: false });
          i++;
        } else {
          i++;
        }
      }
      
      // Generate combinations from parts
      const generateFromParts = (index: number, current: string) => {
        if (index >= parts.length) {
          if (current.length > 0) {
            uniqueVariations.add(current);
          }
          return;
        }
        
        const part = parts[index];
        if (part.optional) {
          generateFromParts(index + 1, current); // Skip optional
          generateFromParts(index + 1, current + part.char); // Include optional
        } else {
          generateFromParts(index + 1, current + part.char); // Required
        }
      };
      
      generateFromParts(0, '');
    }
    
    // Custom sorting function for syllable patterns
    const sortPatterns = (a: string, b: string) => {
      // First sort by length (shorter patterns first)
      if (a.length !== b.length) {
        return a.length - b.length;
      }
      
      // For same length, sort by structure complexity
      const getComplexityScore = (pattern: string) => {
        let score = 0;
        for (let i = 0; i < pattern.length; i++) {
          const char = pattern[i];
          if (char === 'V') {
            score += 10; // Vowels are core, lower score
          } else if (char === 'C') {
            score += 20; // Consonants add complexity
          }
          // Position matters: onset < nucleus < coda
          if (i === 0 && char === 'C') score += 1; // Onset
          if (i === pattern.length - 1 && char === 'C') score += 3; // Coda (more complex)
        }
        return score;
      };
      
      const scoreA = getComplexityScore(a);
      const scoreB = getComplexityScore(b);
      
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      
      // Final fallback: alphabetical
      return a.localeCompare(b);
    };
    
    return Array.from(uniqueVariations).sort(sortPatterns);
  }, [syllableStructure]);
  const getPositionsForPattern = (pattern: string): string[] => {
    const positions: string[] = [];
    let consonantCount = 0;
    let vowelCount = 0;
    
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];
      if (char === 'C') {
        consonantCount++;
        const posType = i === 0 ? 'Onset' : i === pattern.length - 1 ? 'Coda' : 'Onset';
        positions.push(`${posType} C${consonantCount}`);
      } else if (char === 'V') {
        vowelCount++;
        positions.push(`Nucleus V${vowelCount}`);
      }
    }
    
    return positions;
  };

  const getAvailableAlphabets = (position: string): string[] => {
    if (!position) return [];
    
    const posType = position.split(' ')[0].toLowerCase();
    const ruleKey = posType === 'nucleus' ? 'nucleus' : posType === 'onset' ? 'onset' : 'coda';
    const selectedGroups = syllableRules[ruleKey] || [];
    
    // If no rules configured, show all alphabets for that position type
    if (selectedGroups.length === 0) {
      if (posType === 'nucleus') {
        return [
          ...Object.keys(vowelMappings || {}),
          ...Object.keys(featureMappings?.diphthongs || {}),
        ];
      } else {
        return [
          ...Object.keys(consonantMappings || {}),
          ...Object.keys(featureMappings || {})
            .filter(k => k !== 'diphthongs')
            .flatMap(k => Object.keys(featureMappings[k] || {})),
        ];
      }
    }
    
    // If rules configured, show only alphabets from selected groups
    const alphabets: string[] = [];
    selectedGroups.forEach(group => {
      if (group === 'group:consonants') {
        const consonants = Object.keys(consonantMappings || {});
        alphabets.push(...consonants);
      } else if (group === 'group:vowels') {
        alphabets.push(...Object.keys(vowelMappings || {}));
      } else if (group === 'group:diphthongs') {
        alphabets.push(...Object.keys(featureMappings?.diphthongs || {}));
      } else if (group.startsWith('group:')) {
        const featureKey = group.replace('group:', '');
        const featureAlphabets = Object.keys(featureMappings?.[featureKey] || {});
        alphabets.push(...featureAlphabets);
      }
    });
    
    return alphabets;
  };
  // Get all possible positions from all syllable patterns
  const allPossiblePositions = useMemo(() => {
    const positionsSet = new Set<string>();
    
    generateSyllableVariations.forEach(pattern => {
      const positions = getPositionsForPattern(pattern);
      positions.forEach(pos => positionsSet.add(pos));
    });
    
    // Sort positions logically: Onset, Nucleus, Coda
    return Array.from(positionsSet).sort((a, b) => {
      const getPositionOrder = (pos: string) => {
        if (pos.startsWith('Onset')) return 1;
        if (pos.startsWith('Nucleus')) return 2;
        if (pos.startsWith('Coda')) return 3;
        return 4;
      };
      
      const orderA = getPositionOrder(a);
      const orderB = getPositionOrder(b);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // For same position type, sort by number (C1, C2, etc.)
      return a.localeCompare(b);
    });
  }, [generateSyllableVariations]);

  // Get patterns that have the selected position
  const patternsForPosition = useMemo(() => {
    if (!newRule.position) return [];
    
    const validPatterns = generateSyllableVariations.filter(pattern => {
      const positions = getPositionsForPattern(pattern);
      return positions.includes(newRule.position!);
    });
    
    return validPatterns;
  }, [generateSyllableVariations, newRule.position]);

  const availableAlphabets = newRule.position ? getAvailableAlphabets(newRule.position) : [];

  const addRule = () => {
    if (!newRule.position || !newRule.syllablePattern || !newRule.excludedAlphabets?.length) return;
    
    // Handle "All listed patterns" selection
    const patternsToAdd = newRule.syllablePattern === 'ALL_PATTERNS' 
      ? patternsForPosition 
      : [newRule.syllablePattern];
    
    // Check if a rule already exists for this position with any of these patterns
    const exists = exclusionRules.some(rule => 
      rule.position === newRule.position && 
      rule.syllablePatterns.some(pattern => patternsToAdd.includes(pattern))
    );
    
    if (exists) return;
    
    // Create a single rule with multiple patterns
    const newRuleToAdd: ExclusionRule = {
      id: `${patternsToAdd.join('-')}-${newRule.position}-${Date.now()}`,
      syllablePatterns: patternsToAdd,
      position: newRule.position!,
      excludedAlphabets: newRule.excludedAlphabets!,
    };
    
    onRulesChange([...exclusionRules, newRuleToAdd]);
    setNewRule({ syllablePattern: '', position: '', excludedAlphabets: [] });
  };

  const removeRule = (id: string) => {
    onRulesChange(exclusionRules.filter(r => r.id !== id));
  };

  const startEditRule = (rule: ExclusionRule) => {
    setEditingRule(rule.id);
    setEditRule({
      syllablePattern: rule.syllablePatterns.length === 1 ? rule.syllablePatterns[0] : 'ALL_PATTERNS',
      position: rule.position,
      excludedAlphabets: [...rule.excludedAlphabets],
    });
  };

  const cancelEditRule = () => {
    setEditingRule(null);
    setEditRule({});
  };

  const saveEditRule = () => {
    if (!editingRule || !editRule.position || !editRule.syllablePattern || !editRule.excludedAlphabets?.length) return;
    
    // Handle "All listed patterns" selection for editing
    const patternsForEditPosition = generateSyllableVariations.filter(pattern => {
      const positions = getPositionsForPattern(pattern);
      return positions.includes(editRule.position!);
    });
    
    const patternsToUpdate = editRule.syllablePattern === 'ALL_PATTERNS' 
      ? patternsForEditPosition 
      : [editRule.syllablePattern];
    
    const updatedRules = exclusionRules.map(rule => {
      if (rule.id === editingRule) {
        return {
          ...rule,
          syllablePatterns: patternsToUpdate,
          position: editRule.position!,
          excludedAlphabets: editRule.excludedAlphabets!,
        };
      }
      return rule;
    });
    
    onRulesChange(updatedRules);
    setEditingRule(null);
    setEditRule({});
  };

  const toggleEditAlphabet = (alphabet: string) => {
    const current = editRule.excludedAlphabets || [];
    const updated = current.includes(alphabet)
      ? current.filter(a => a !== alphabet)
      : [...current, alphabet];
    setEditRule({ ...editRule, excludedAlphabets: updated });
  };

  const toggleAlphabet = (alphabet: string) => {
    const current = newRule.excludedAlphabets || [];
    const updated = current.includes(alphabet)
      ? current.filter(a => a !== alphabet)
      : [...current, alphabet];
    setNewRule({ ...newRule, excludedAlphabets: updated });
  };

  if (!syllableStructure) {
    return (
      <Card className="bg-white/50 border-2 border-[#F269BF]/30 rounded-2xl opacity-50">
        <CardHeader>
          <CardTitle className="text-slate-700 font-medium text-sm">
            Exclusion Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Add a syllable structure first to enable exclusion rules</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/50 border-2 border-[#F269BF]/30 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-slate-700 font-medium text-sm">
          Exclusion Rules
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Define which alphabets cannot appear in specific syllable positions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gradient-to-br from-[#F269BF]/10 to-[#DDBCEE]/10 border-2 border-[#F269BF]/20 rounded-xl space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Position</label>
              <Select value={newRule.position} onValueChange={(val) => setNewRule({ ...newRule, position: val, syllablePattern: '', excludedAlphabets: [] })}>
                <SelectTrigger className="bg-white border-[#F269BF]/40">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {allPossiblePositions.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-slate-600 mb-1 block">Syllable Pattern</label>
              <Select 
                value={newRule.syllablePattern} 
                onValueChange={(val) => setNewRule({ ...newRule, syllablePattern: val, excludedAlphabets: [] })}
                disabled={!newRule.position}
              >
                <SelectTrigger className="bg-white border-[#F269BF]/40">
                  <SelectValue placeholder="Select pattern" />
                </SelectTrigger>
                <SelectContent>
                  {patternsForPosition.length > 1 && (
                    <SelectItem key="all-patterns" value="ALL_PATTERNS">
                      <span className="font-medium text-[#F269BF]">All listed patterns</span>
                    </SelectItem>
                  )}
                  {patternsForPosition.map((pattern, idx) => {
                    const uniqueKey = `${syllableStructure}-${pattern}-${idx}`;
                    return (
                      <SelectItem key={uniqueKey} value={pattern}>
                        {pattern}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-slate-600 mb-1 block">Exclude Alphabets</label>
              <div className="text-xs text-slate-500">
                {newRule.excludedAlphabets?.length || 0} selected
              </div>
            </div>
          </div>

          {newRule.position && (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">Click to exclude:</p>
              <div className="flex flex-wrap gap-2">
                {availableAlphabets.map(alpha => (
                  <Badge
                    key={alpha}
                    onClick={() => toggleAlphabet(alpha)}
                    className={`cursor-pointer transition-all ${
                      newRule.excludedAlphabets?.includes(alpha)
                        ? 'bg-[#F269BF] text-white hover:bg-[#F269BF]/80'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {alpha}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={addRule}
            disabled={!newRule.position || !newRule.syllablePattern || !newRule.excludedAlphabets?.length}
            className="w-full bg-gradient-to-r from-[#F269BF] to-[#DDBCEE] hover:opacity-90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {newRule.syllablePattern === 'ALL_PATTERNS' 
              ? `Add Rule for All Listed Patterns (${patternsForPosition.length})` 
              : 'Add Exclusion Rule'
            }
          </Button>
        </div>

        {exclusionRules.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-600 font-medium">Active Rules:</p>
            {exclusionRules.map(rule => (
              <div
                key={rule.id}
                className="bg-white border-2 border-[#F269BF]/20 rounded-xl"
              >
                {editingRule === rule.id ? (
                  // Edit mode
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">Position</label>
                        <Select 
                          value={editRule.position} 
                          onValueChange={(val) => setEditRule({ ...editRule, position: val, syllablePattern: '', excludedAlphabets: [] })}
                        >
                          <SelectTrigger className="bg-white border-[#F269BF]/40 h-8">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                          <SelectContent>
                            {allPossiblePositions.map(pos => (
                              <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">Syllable Pattern</label>
                        <Select 
                          value={editRule.syllablePattern} 
                          onValueChange={(val) => setEditRule({ ...editRule, syllablePattern: val, excludedAlphabets: editRule.excludedAlphabets || [] })}
                          disabled={!editRule.position}
                        >
                          <SelectTrigger className="bg-white border-[#F269BF]/40 h-8">
                            <SelectValue placeholder="Select pattern" />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const patternsForEditPosition = generateSyllableVariations.filter(pattern => {
                                const positions = getPositionsForPattern(pattern);
                                return positions.includes(editRule.position!);
                              });
                              return (
                                <>
                                  {patternsForEditPosition.length > 1 && (
                                    <SelectItem key="all-patterns" value="ALL_PATTERNS">
                                      <span className="font-medium text-[#F269BF]">All listed patterns</span>
                                    </SelectItem>
                                  )}
                                  {patternsForEditPosition.map((pattern, idx) => {
                                    const uniqueKey = `edit-${syllableStructure}-${pattern}-${idx}`;
                                    return (
                                      <SelectItem key={uniqueKey} value={pattern}>
                                        {pattern}
                                      </SelectItem>
                                    );
                                  })}
                                </>
                              );
                            })()}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">Exclude Alphabets</label>
                        <div className="text-xs text-slate-500">
                          {editRule.excludedAlphabets?.length || 0} selected
                        </div>
                      </div>
                    </div>

                    {editRule.position && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-600">Click to exclude:</p>
                        <div className="flex flex-wrap gap-2">
                          {getAvailableAlphabets(editRule.position).map(alpha => (
                            <Badge
                              key={alpha}
                              onClick={() => toggleEditAlphabet(alpha)}
                              className={`cursor-pointer transition-all text-xs ${
                                editRule.excludedAlphabets?.includes(alpha)
                                  ? 'bg-[#F269BF] text-white hover:bg-[#F269BF]/80'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                            >
                              {alpha}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={saveEditRule}
                        disabled={!editRule.position || !editRule.syllablePattern || !editRule.excludedAlphabets?.length}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        onClick={cancelEditRule}
                        size="sm"
                        variant="outline"
                        className="border-slate-300 text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display mode
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex flex-wrap gap-1">
                      {rule.syllablePatterns.map(pattern => (
                        <Badge key={pattern} className="bg-[#F269BF]/20 text-[#F269BF] border-0">
                          {pattern}
                        </Badge>
                      ))}
                    </div>
                    <Badge className="bg-[#DDBCEE]/20 text-[#DDBCEE] border-0">
                      {rule.position}
                    </Badge>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {rule.excludedAlphabets.map(alpha => (
                        <Badge key={alpha} className="bg-slate-100 text-slate-600 text-xs">
                          {alpha}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditRule(rule)}
                        className="text-slate-400 hover:text-[#F269BF] transition-colors p-1"
                        title="Edit rule"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Delete rule"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
