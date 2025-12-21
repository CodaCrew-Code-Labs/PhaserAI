// Database exports for PhaserAI
// Direct API client - Supabase has been removed

export { api } from './api-client';

// Type exports
export interface User {
  user_id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface Language {
  id: string;
  user_id: string;
  name: string;
  phonemes: {
    consonants: string[];
    vowels: string[];
    diphthongs: string[];
  };
  alphabet_mappings: {
    consonants: { [key: string]: string };
    vowels: { [key: string]: string };
    diphthongs: { [key: string]: string };
  };
  syllables: string;
  rules: string;
  created_at: string;
}

export interface Word {
  id: string;
  language_id: string;
  word: string;
  ipa: string;
  pos: string[];
  is_root: boolean;
  embedding: number[] | null;
  created_at: string;
  translations?: Translation[];
  etymology?: Etymology;
  violations?: Violation[];
}

export interface Translation {
  id: string;
  word_id: string;
  language_code: string;
  meaning: string;
  created_at: string;
}

export interface Etymology {
  id: string;
  word_id: string;
  parent_word_id: string | null;
  derivation_type: string | null;
  derivation_notes: string | null;
  created_at: string;
}

export interface Violation {
  id: string;
  word_id: string;
  violation_type: string;
  description: string;
  severity: string;
  created_at: string;
}
