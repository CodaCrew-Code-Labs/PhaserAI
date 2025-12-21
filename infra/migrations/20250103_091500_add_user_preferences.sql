-- Migration: Add User Preferences Table
-- Author: Development Team
-- Date: 2025-01-03 09:15:00
-- Description: Adds user preferences table for storing UI settings and preferences
-- Dependencies: 20250101_120000_initial_schema.sql

-- UP: Apply changes
BEGIN;

-- ============================================================================
-- USER PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_8b514_user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT REFERENCES app_8b514_users(user_id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  notifications_enabled BOOLEAN DEFAULT true,
  auto_save_enabled BOOLEAN DEFAULT true,
  ipa_input_method VARCHAR(20) DEFAULT 'keyboard' CHECK (ipa_input_method IN ('keyboard', 'chart', 'both')),
  default_pos VARCHAR(20) DEFAULT 'noun',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON app_8b514_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_theme ON app_8b514_user_preferences(theme);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON app_8b514_user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE app_8b514_user_preferences IS 'Stores user interface preferences and settings';
COMMENT ON COLUMN app_8b514_user_preferences.theme IS 'UI theme preference: light, dark, or system';
COMMENT ON COLUMN app_8b514_user_preferences.ipa_input_method IS 'Preferred IPA input method: keyboard, chart, or both';
COMMENT ON COLUMN app_8b514_user_preferences.default_pos IS 'Default part of speech for new words';

-- ============================================================================
-- RECORD MIGRATION
-- ============================================================================

INSERT INTO schema_migrations (version, applied_at, description) 
VALUES ('20250103_091500', NOW(), 'Add user preferences table')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================================
-- DOWN: Rollback changes (for reference)
-- ============================================================================

-- BEGIN;
-- DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON app_8b514_user_preferences;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP TABLE IF EXISTS app_8b514_user_preferences CASCADE;
-- DELETE FROM schema_migrations WHERE version = '20250103_091500';
-- COMMIT;