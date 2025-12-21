/**
 * Phonological Rule Validator
 * Validates words against language phonological rules
 */

interface Phonemes {
  consonants: string[];
  vowels: string[];
  diphthongs: string[];
}

interface ValidationResult {
  isValid: boolean;
  violations: Array<{
    type: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }>;
}

export class PhonologyValidator {
  private phonemes: Phonemes;
  private syllableStructure: string;
  private rules: string;

  constructor(phonemes: Phonemes, syllableStructure: string, rules: string) {
    this.phonemes = phonemes;
    this.syllableStructure = syllableStructure;
    this.rules = rules;
  }

  /**
   * Validate a word's IPA notation against phonological rules
   */
  validate(ipa: string): ValidationResult {
    const violations: Array<{
      type: string;
      description: string;
      severity: 'error' | 'warning' | 'info';
    }> = [];

    // 1. Check for invalid phonemes
    const invalidPhonemes = this.checkInvalidPhonemes(ipa);
    if (invalidPhonemes.length > 0) {
      violations.push({
        type: 'invalid_phoneme',
        description: `Contains invalid phonemes: ${invalidPhonemes.join(', ')}. Only use phonemes from your inventory.`,
        severity: 'error',
      });
    }

    // 2. Check syllable structure
    const syllableViolations = this.checkSyllableStructure(ipa);
    violations.push(...syllableViolations);

    // 3. Check phonotactic rules
    const phonotacticViolations = this.checkPhonotacticRules(ipa);
    violations.push(...phonotacticViolations);

    return {
      isValid: violations.filter((v) => v.severity === 'error').length === 0,
      violations,
    };
  }

  /**
   * Check for phonemes not in the language's inventory
   */
  private checkInvalidPhonemes(ipa: string): string[] {
    const allPhonemes = [
      ...this.phonemes.consonants,
      ...this.phonemes.vowels,
      ...this.phonemes.diphthongs,
    ];

    const invalid: string[] = [];
    let i = 0;

    while (i < ipa.length) {
      // Try to match longest phoneme first (for multi-character IPA symbols)
      let matched = false;
      for (let len = 3; len >= 1; len--) {
        const segment = ipa.substring(i, i + len);
        if (allPhonemes.includes(segment)) {
          i += len;
          matched = true;
          break;
        }
      }

      if (!matched) {
        const char = ipa[i];
        // Skip common IPA diacritics, word boundaries, and syllable separators
        if (!['.', '/', 'ː', 'ˈ', 'ˌ', ' ', '-'].includes(char)) {
          if (!invalid.includes(char)) {
            invalid.push(char);
          }
        }
        i++;
      }
    }

    return invalid;
  }

  /**
   * Check if word follows syllable structure pattern
   */
  private checkSyllableStructure(ipa: string): Array<{
    type: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }> {
    const violations: Array<{
      type: string;
      description: string;
      severity: 'error' | 'warning' | 'info';
    }> = [];

    // Parse syllable structure (e.g., "CV", "CVC", "(C)V(C)")
    const structure = this.syllableStructure.toUpperCase();

    // Split IPA into syllables (by '.' or '/' or estimate)
    const syllables = ipa.split(/[.\/]/).filter((s) => s.length > 0);
    if (syllables.length === 0) {
      syllables.push(ipa); // Treat whole word as one syllable if no separators
    }

    for (const syllable of syllables) {
      const pattern = this.analyzeSyllablePattern(syllable);
      if (!this.matchesSyllableStructure(pattern, structure)) {
        violations.push({
          type: 'syllable_structure',
          description: `Syllable "${syllable}" has pattern ${pattern}, which doesn't match allowed structure ${structure}`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Analyze the C/V pattern of a syllable
   */
  private analyzeSyllablePattern(syllable: string): string {
    let pattern = '';
    let i = 0;

    while (i < syllable.length) {
      let matched = false;

      // Try to match phonemes
      for (let len = 3; len >= 1; len--) {
        const segment = syllable.substring(i, i + len);

        if (this.phonemes.vowels.includes(segment) || this.phonemes.diphthongs.includes(segment)) {
          pattern += 'V';
          i += len;
          matched = true;
          break;
        } else if (this.phonemes.consonants.includes(segment)) {
          pattern += 'C';
          i += len;
          matched = true;
          break;
        }
      }

      if (!matched) {
        i++; // Skip unrecognized characters
      }
    }

    return pattern;
  }

  /**
   * Check if a pattern matches the syllable structure
   */
  private matchesSyllableStructure(pattern: string, structure: string): boolean {
    // Remove optional markers for basic check
    const requiredStructure = structure.replace(/[()]/g, '');

    // Simple pattern matching (can be enhanced)
    if (pattern === requiredStructure) return true;

    // Check if pattern matches with optional elements
    const regex = structure
      .replace(/\(/g, '(')
      .replace(/\)/g, ')?')
      .replace(/C/g, 'C')
      .replace(/V/g, 'V');

    try {
      return new RegExp(`^${regex}$`).test(pattern);
    } catch {
      return false;
    }
  }

  /**
   * Check custom phonotactic rules
   */
  private checkPhonotacticRules(ipa: string): Array<{
    type: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }> {
    const violations: Array<{
      type: string;
      description: string;
      severity: 'error' | 'warning' | 'info';
    }> = [];

    if (!this.rules || this.rules.trim() === '') {
      return violations;
    }

    // Parse common phonotactic rules from text
    const rules = this.rules.toLowerCase();

    // Check for common rule patterns
    if (rules.includes('no consonant cluster') || rules.includes('no clusters')) {
      if (/[^aeiouāēīōū]{2,}/.test(ipa.toLowerCase())) {
        violations.push({
          type: 'phonotactic_rule',
          description: 'Word contains consonant clusters, which are not allowed',
          severity: 'warning',
        });
      }
    }

    if (rules.includes('no final consonant') || rules.includes('words end in vowel')) {
      const lastChar = ipa[ipa.length - 1];
      if (this.phonemes.consonants.includes(lastChar)) {
        violations.push({
          type: 'phonotactic_rule',
          description: 'Word ends in a consonant, but only vowel-final words are allowed',
          severity: 'warning',
        });
      }
    }

    if (rules.includes('no initial consonant') || rules.includes('words start with vowel')) {
      const firstChar = ipa[0];
      if (this.phonemes.consonants.includes(firstChar)) {
        violations.push({
          type: 'phonotactic_rule',
          description: 'Word starts with a consonant, but only vowel-initial words are allowed',
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Get a human-readable summary of validation results
   */
  static getSummary(result: ValidationResult): string {
    if (result.isValid && result.violations.length === 0) {
      return '✓ Word follows all phonological rules';
    }

    const errors = result.violations.filter((v) => v.severity === 'error');
    const warnings = result.violations.filter((v) => v.severity === 'warning');

    const parts: string[] = [];
    if (errors.length > 0) {
      parts.push(`${errors.length} error${errors.length > 1 ? 's' : ''}`);
    }
    if (warnings.length > 0) {
      parts.push(`${warnings.length} warning${warnings.length > 1 ? 's' : ''}`);
    }

    return `⚠ ${parts.join(', ')} found`;
  }
}