# Database Migrations

This directory contains database migration files for PhaserAI. Migrations are versioned SQL files that allow you to evolve your database schema over time while maintaining data integrity.

## Migration System

### File Naming Convention
```
YYYYMMDD_HHMMSS_description.sql
```

Examples:
- `20250101_120000_initial_schema.sql`
- `20250102_143000_add_etymology_tables.sql`
- `20250103_091500_add_alphabet_mappings.sql`

### Migration Structure
Each migration file should contain:
1. **UP section**: Changes to apply
2. **DOWN section**: Changes to rollback (optional but recommended)
3. **Metadata comments**: Description, author, dependencies

### Example Migration File
```sql
-- Migration: Add user preferences table
-- Author: Development Team
-- Date: 2025-01-01
-- Dependencies: 20250101_120000_initial_schema.sql

-- UP: Apply changes
BEGIN;

CREATE TABLE app_8b514_user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT REFERENCES app_8b514_users(user_id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON app_8b514_user_preferences(user_id);

-- Record migration
INSERT INTO schema_migrations (version, applied_at) VALUES ('20250101_130000', NOW());

COMMIT;

-- DOWN: Rollback changes (for reference)
-- BEGIN;
-- DROP TABLE IF EXISTS app_8b514_user_preferences;
-- DELETE FROM schema_migrations WHERE version = '20250101_130000';
-- COMMIT;
```

## Usage

### Apply Migrations
```bash
# Apply all pending migrations
npm run migrate:up

# Apply specific migration
npm run migrate:up 20250101_130000

# Apply migrations in production
npm run migrate:prod
```

### Rollback Migrations
```bash
# Rollback last migration
npm run migrate:down

# Rollback to specific version
npm run migrate:down 20250101_120000
```

### Migration Status
```bash
# Check migration status
npm run migrate:status

# List all migrations
npm run migrate:list
```

## Best Practices

### 1. Always Use Transactions
Wrap your migrations in `BEGIN;` and `COMMIT;` blocks.

### 2. Make Migrations Idempotent
Use `IF NOT EXISTS` and `IF EXISTS` clauses where appropriate.

### 3. Test Migrations
- Test on development database first
- Verify data integrity after migration
- Test rollback procedures

### 4. Backup Before Production
Always backup production database before applying migrations.

### 5. Column Additions
When adding columns, provide default values:
```sql
ALTER TABLE app_8b514_words 
ADD COLUMN difficulty_level INTEGER DEFAULT 1;
```

### 6. Index Creation
Create indexes concurrently in production:
```sql
CREATE INDEX CONCURRENTLY idx_words_difficulty 
ON app_8b514_words(difficulty_level);
```

### 7. Data Migrations
For data transformations, use separate migration files:
```sql
-- Update existing data
UPDATE app_8b514_words 
SET difficulty_level = 
  CASE 
    WHEN LENGTH(word) <= 3 THEN 1
    WHEN LENGTH(word) <= 6 THEN 2
    ELSE 3
  END
WHERE difficulty_level IS NULL;
```

## Migration Tracking

The system uses a `schema_migrations` table to track applied migrations:

```sql
CREATE TABLE schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checksum VARCHAR(64),
  execution_time_ms INTEGER
);
```

## Environment-Specific Migrations

### Development
- Migrations applied automatically on startup
- Can use destructive operations for testing

### Staging
- Manual migration approval required
- Full backup before migration
- Rollback plan documented

### Production
- Requires approval from senior developer
- Scheduled maintenance window
- Database backup verified
- Rollback plan tested
- Performance impact assessed

## Troubleshooting

### Failed Migration
1. Check migration logs
2. Verify database connection
3. Check for syntax errors
4. Ensure proper permissions
5. Rollback if necessary

### Migration Conflicts
1. Coordinate with team on schema changes
2. Use feature branches for migrations
3. Resolve conflicts before merging
4. Test merged migrations

### Performance Issues
1. Use `EXPLAIN ANALYZE` for complex queries
2. Create indexes concurrently
3. Consider maintenance windows for large changes
4. Monitor database performance during migration