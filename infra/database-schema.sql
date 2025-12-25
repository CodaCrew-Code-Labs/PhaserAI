-- PhaserAI RDS PostgreSQL Schema
-- This schema is for RDS without Supabase auth, so no RLS policies

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (stores Cognito user info)
CREATE TABLE IF NOT EXISTS app_8b514_users (
  user_id TEXT PRIMARY KEY, -- Cognito user ID (not UUID)
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Languages table
CREATE TABLE IF NOT EXISTS app_8b514_languages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT REFERENCES app_8b514_users(user_id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phonemes JSONB NOT NULL DEFAULT '{"consonants":[],"vowels":[],"diphthongs":[]}'::jsonb,
  alphabet_mappings JSONB NOT NULL DEFAULT '{"consonants":{},"vowels":{},"diphthongs":{}}'::jsonb,
  syllables TEXT NOT NULL DEFAULT 'CV',
  syllable_rules JSONB DEFAULT '{}'::jsonb,
  rules TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON COLUMN app_8b514_languages.alphabet_mappings IS 
'Stores mapping between alphabet letters and IPA phonemes. Structure: {"consonants": {"p": "p", "th": "θ"}, "vowels": {"a": "a", "e": "e"}, "diphthongs": {"ai": "ai"}}';

-- Words table
CREATE TABLE IF NOT EXISTS app_8b514_words (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  language_id UUID REFERENCES app_8b514_languages(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  ipa TEXT NOT NULL,
  pos TEXT[] NOT NULL DEFAULT '{}',
  is_root BOOLEAN NOT NULL DEFAULT false,
  embedding FLOAT[] NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Translations table
CREATE TABLE IF NOT EXISTS app_8b514_translations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word_id UUID REFERENCES app_8b514_words(id) ON DELETE CASCADE NOT NULL,
  language_code TEXT NOT NULL,
  meaning TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS app_8b514_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT REFERENCES app_8b514_users(user_id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- ETYMOLOGY & VALIDATION TABLES
-- ============================================================================

-- Word etymology table to track word derivations
CREATE TABLE IF NOT EXISTS app_8b514_word_etymology (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word_id UUID REFERENCES app_8b514_words(id) ON DELETE CASCADE NOT NULL,
  parent_word_id UUID REFERENCES app_8b514_words(id) ON DELETE SET NULL,
  derivation_type VARCHAR(50), -- e.g., 'compound', 'affix', 'sound_change', 'borrowing'
  derivation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Phonological violations table to track rule violations
CREATE TABLE IF NOT EXISTS app_8b514_phonological_violations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word_id UUID REFERENCES app_8b514_words(id) ON DELETE CASCADE NOT NULL,
  violation_type VARCHAR(100) NOT NULL, -- e.g., 'invalid_phoneme', 'syllable_structure', 'phonotactic_rule'
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning', -- 'error', 'warning', 'info'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_languages_user_id ON app_8b514_languages(user_id);
CREATE INDEX IF NOT EXISTS idx_words_language_id ON app_8b514_words(language_id);
CREATE INDEX IF NOT EXISTS idx_words_is_root ON app_8b514_words(is_root);
CREATE INDEX IF NOT EXISTS idx_translations_word_id ON app_8b514_translations(word_id);
CREATE INDEX IF NOT EXISTS idx_translations_language_code ON app_8b514_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON app_8b514_subscriptions(user_id);

-- Etymology indexes
CREATE INDEX IF NOT EXISTS idx_word_etymology_word ON app_8b514_word_etymology(word_id);
CREATE INDEX IF NOT EXISTS idx_word_etymology_parent ON app_8b514_word_etymology(parent_word_id);

-- Validation indexes
CREATE INDEX IF NOT EXISTS idx_phonological_violations_word ON app_8b514_phonological_violations(word_id);

COMMIT;