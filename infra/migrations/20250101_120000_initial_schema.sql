-- Migration: Initial PhaserAI Database Schema
-- Author: Development Team
-- Date: 2025-01-01 12:00:00
-- Description: Creates the initial database schema for PhaserAI application
-- Dependencies: None (initial migration)

-- UP: Apply changes
BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MIGRATION TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  checksum VARCHAR(64),
  execution_time_ms INTEGER,
  description TEXT
);

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
-- INDEXES
-- ============================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_languages_user_id ON app_8b514_languages(user_id);
CREATE INDEX IF NOT EXISTS idx_words_language_id ON app_8b514_words(language_id);
CREATE INDEX IF NOT EXISTS idx_words_is_root ON app_8b514_words(is_root);
CREATE INDEX IF NOT EXISTS idx_translations_word_id ON app_8b514_translations(word_id);
CREATE INDEX IF NOT EXISTS idx_translations_language_code ON app_8b514_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON app_8b514_subscriptions(user_id);

-- ============================================================================
-- RECORD MIGRATION
-- ============================================================================

INSERT INTO schema_migrations (version, applied_at, description) 
VALUES ('20250101_120000', NOW(), 'Initial PhaserAI database schema')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- DOWN: Rollback changes (for reference)
-- ============================================================================

-- BEGIN;
-- DROP TABLE IF EXISTS app_8b514_subscriptions CASCADE;
-- DROP TABLE IF EXISTS app_8b514_translations CASCADE;
-- DROP TABLE IF EXISTS app_8b514_words CASCADE;
-- DROP TABLE IF EXISTS app_8b514_languages CASCADE;
-- DROP TABLE IF EXISTS app_8b514_users CASCADE;
-- DROP TABLE IF EXISTS schema_migrations CASCADE;
-- DROP EXTENSION IF EXISTS "uuid-ossp";
-- COMMIT;