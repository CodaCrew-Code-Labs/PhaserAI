import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface PhonologicalFeature {
  key: string;
  label: string;
  description: string;
}

export const AVAILABLE_FEATURES: PhonologicalFeature[] = [
  { key: 'diphthongs', label: 'Diphthongs', description: 'Two vowel sounds in one syllable' },
  { key: 'affricates', label: 'Affricates', description: 'Stop + fricative combinations' },
  { key: 'ejectives', label: 'Ejectives', description: 'Consonants with glottal closure' },
  { key: 'glides', label: 'Glides', description: 'Transitional sounds between phonemes' },
];

interface PhonologicalFeatureSelectorProps {
  selectedFeatures: string[];
  onFeaturesChange: (features: string[]) => void;
}

export function PhonologicalFeatureSelector({ 
  selectedFeatures, 
  onFeaturesChange 
}: PhonologicalFeatureSelectorProps) {
  const handleFeatureToggle = (featureKey: string, checked: boolean) => {
    if (checked) {
      onFeaturesChange([...selectedFeatures, featureKey]);
    } else {
      onFeaturesChange(selectedFeatures.filter(f => f !== featureKey));
    }
  };

  return (
    <Card className="bg-white/50 border-2 border-[#DDBCEE]/30 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-slate-700 font-medium text-sm">
          Additional Phonological Features
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {AVAILABLE_FEATURES.map((feature) => (
          <div key={feature.key} className="flex items-start space-x-3">
            <Checkbox
              id={feature.key}
              checked={selectedFeatures.includes(feature.key)}
              onCheckedChange={(checked) => handleFeatureToggle(feature.key, !!checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <label 
                htmlFor={feature.key} 
                className="text-sm font-medium text-slate-700 cursor-pointer"
              >
                {feature.label}
              </label>
              <p className="text-xs text-slate-500 mt-1">{feature.description}</p>
            </div>
          </div>
        ))}
        
        {selectedFeatures.length > 0 && (
          <div className="pt-3 border-t border-[#DDBCEE]/20">
            <p className="text-xs text-slate-500 mb-2">Selected features:</p>
            <div className="flex flex-wrap gap-1">
              {selectedFeatures.map(featureKey => {
                const feature = AVAILABLE_FEATURES.find(f => f.key === featureKey);
                return (
                  <Badge 
                    key={featureKey}
                    className="text-xs bg-[#DDBCEE]/30 text-[#748BF6] border-0"
                  >
                    {feature?.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}