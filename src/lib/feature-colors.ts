export const getFeatureColor = (featureKey: string) => {
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
