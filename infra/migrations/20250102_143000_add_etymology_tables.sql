-- Migration: Add Etymology and Validation Tables
-- Author: Development Team
-- Date: 2025-01-02 14:30:00
-- Description: Adds tables for word etymology tracking and phonological violation logging
-- Dependencies: 20250101_120000_initial_schema.sql

-- UP: Apply changes
BEGIN;

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

-- Etymology indexes
CREATE INDEX IF NOT EXISTS idx_word_etymology_word ON app_8b514_word_etymology(word_id);
CREATE INDEX IF NOT EXISTS idx_word_etymology_parent ON app_8b514_word_etymology(parent_word_id);
CREATE INDEX IF NOT EXISTS idx_word_etymology_type ON app_8b514_word_etymology(derivation_type);

-- Validation indexes
CREATE INDEX IF NOT EXISTS idx_phonological_violations_word ON app_8b514_phonological_violations(word_id);
CREATE INDEX IF NOT EXISTS idx_phonological_violations_type ON app_8b514_phonological_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_phonological_violations_severity ON app_8b514_phonological_violations(severity);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE app_8b514_word_etymology IS 'Tracks word derivation relationships and etymology';
COMMENT ON COLUMN app_8b514_word_etymology.derivation_type IS 'Type of derivation: compound, affix, sound_change, borrowing, etc.';
COMMENT ON COLUMN app_8b514_word_etymology.parent_word_id IS 'Reference to parent word if derived from another word';

COMMENT ON TABLE app_8b514_phonological_violations IS 'Logs phonological rule violations for words';
COMMENT ON COLUMN app_8b514_phonological_violations.violation_type IS 'Type of violation: invalid_phoneme, syllable_structure, phonotactic_rule, etc.';
COMMENT ON COLUMN app_8b514_phonological_violations.severity IS 'Severity level: error, warning, info';

-- ============================================================================
-- RECORD MIGRATION
-- ============================================================================

INSERT INTO schema_migrations (version, applied_at, description) 
VALUES ('20250102_143000', NOW(), 'Add etymology and validation tables')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- DOWN: Rollback changes (for reference)
-- ============================================================================

-- BEGIN;
-- DROP TABLE IF EXISTS app_8b514_phonological_violations CASCADE;
-- DROP TABLE IF EXISTS app_8b514_word_etymology CASCADE;
-- DELETE FROM schema_migrations WHERE version = '20250102_143000';
-- COMMIT;