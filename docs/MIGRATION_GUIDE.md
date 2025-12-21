# Database Migration Guide

This guide explains how to use the PhaserAI database migration system to manage schema changes safely and efficiently.

## Overview

The PhaserAI migration system provides:
- **Versioned migrations**: Track schema changes over time
- **Automated deployment**: Migrations run automatically during CDK deployment
- **Manual control**: Run migrations manually when needed
- **Rollback support**: Safely revert changes if needed
- **Environment-specific**: Different strategies for dev/staging/production

## Quick Start

### 1. Check Migration Status
```bash
# Using the migration script
./scripts/migrate.sh status

# Or directly with npm
cd infra && npm run migrate:status
```

### 2. Apply All Pending Migrations
```bash
# Development environment
./scripts/migrate.sh up

# Production environment
ENVIRONMENT=prod ./scripts/migrate.sh up
```

### 3. Create a New Migration
```bash
# Create new migration file
touch infra/migrations/$(date +%Y%m%d_%H%M%S)_add_new_feature.sql
```

## Migration File Structure

### Naming Convention
```
YYYYMMDD_HHMMSS_description.sql
```

Examples:
- `20250101_120000_initial_schema.sql`
- `20250102_143000_add_etymology_tables.sql`
- `20250103_091500_add_user_preferences.sql`

### File Template
```sql
-- Migration: [Description]
-- Author: [Your Name]
-- Date: [YYYY-MM-DD HH:MM:SS]
-- Description: [Detailed description of changes]
-- Dependencies: [Previous migration file]

-- UP: Apply changes
BEGIN;

-- Your schema changes here
CREATE TABLE IF NOT EXISTS new_table (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);

-- Record migration (optional - handled automatically)
INSERT INTO schema_migrations (version, applied_at, description) 
VALUES ('20250104_100000', NOW(), 'Add new feature table')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- DOWN: Rollback changes (for reference)
-- BEGIN;
-- DROP TABLE IF EXISTS new_table CASCADE;
-- DELETE FROM schema_migrations WHERE version = '20250104_100000';
-- COMMIT;
```

## Usage Examples

### Development Workflow

#### 1. Create New Migration
```bash
# Create migration file
MIGRATION_FILE="infra/migrations/$(date +%Y%m%d_%H%M%S)_add_word_difficulty.sql"
touch "$MIGRATION_FILE"

# Edit the file with your changes
vim "$MIGRATION_FILE"
```

#### 2. Test Migration Locally
```bash
# Check current status
./scripts/migrate.sh status

# Apply your migration
./scripts/migrate.sh up

# Verify the changes
./scripts/migrate.sh status
```

#### 3. Test Rollback (if needed)
```bash
# Rollback last migration
./scripts/migrate.sh down

# Check status
./scripts/migrate.sh status
```

### Production Deployment

#### 1. Pre-deployment Checklist
- [ ] Migration tested in development
- [ ] Migration tested in staging
- [ ] Database backup verified
- [ ] Rollback plan documented
- [ ] Performance impact assessed
- [ ] Team notified of deployment

#### 2. Deploy with Migrations
```bash
# Set production environment
export ENVIRONMENT=prod
export DB_HOST=your-rds-endpoint.amazonaws.com
export DB_NAME=phaserai_prod
export DB_USER=phaserai_admin
export DB_PASSWORD=your-secure-password

# Optional: Set S3 bucket for backups
export BACKUP_S3_BUCKET=your-backup-bucket

# Run migration
./scripts/migrate.sh up
```

#### 3. Automated Deployment via CDK
```bash
# Migrations run automatically during CDK deployment
cd infra
cdk deploy --all
```

## Advanced Usage

### Running Specific Migrations

#### Apply migrations up to a specific version
```bash
./scripts/migrate.sh up 20250102_143000
```

#### Rollback to a specific version
```bash
./scripts/migrate.sh down 20250101_120000
```

### Environment-Specific Migrations

#### Development
```bash
ENVIRONMENT=dev ./scripts/migrate.sh up
```

#### Staging
```bash
ENVIRONMENT=staging \
DB_HOST=staging-db.amazonaws.com \
DB_NAME=phaserai_staging \
DB_USER=phaserai_admin \
./scripts/migrate.sh up
```

#### Production
```bash
ENVIRONMENT=prod \
DB_HOST=prod-db.amazonaws.com \
DB_NAME=phaserai_prod \
DB_USER=phaserai_admin \
BACKUP_S3_BUCKET=phaserai-backups \
./scripts/migrate.sh up
```

### Lambda-based Migrations

#### Invoke migration Lambda directly
```bash
aws lambda invoke \
  --function-name phaserai-migration-prod-MigrationFunction \
  --payload '{"action":"up"}' \
  response.json
```

#### Check migration status via Lambda
```bash
aws lambda invoke \
  --function-name phaserai-migration-prod-MigrationFunction \
  --payload '{"action":"status"}' \
  response.json && cat response.json
```

## Best Practices

### 1. Migration Design

#### Always Use Transactions
```sql
BEGIN;
-- Your changes here
COMMIT;
```

#### Make Migrations Idempotent
```sql
CREATE TABLE IF NOT EXISTS new_table (...);
ALTER TABLE existing_table ADD COLUMN IF NOT EXISTS new_column TEXT;
CREATE INDEX IF NOT EXISTS idx_name ON table(column);
```

#### Provide Default Values
```sql
ALTER TABLE words ADD COLUMN difficulty INTEGER DEFAULT 1;
```

### 2. Data Migrations

#### Separate Schema and Data Changes
```sql
-- Schema migration: 20250104_100000_add_difficulty_column.sql
ALTER TABLE words ADD COLUMN difficulty INTEGER DEFAULT 1;

-- Data migration: 20250104_100001_populate_difficulty_data.sql
UPDATE words SET difficulty = 
  CASE 
    WHEN LENGTH(word) <= 3 THEN 1
    WHEN LENGTH(word) <= 6 THEN 2
    ELSE 3
  END;
```

#### Use Batch Processing for Large Updates
```sql
-- Process in batches to avoid long locks
DO $$
DECLARE
    batch_size INTEGER := 1000;
    processed INTEGER := 0;
BEGIN
    LOOP
        UPDATE words 
        SET difficulty = CASE 
            WHEN LENGTH(word) <= 3 THEN 1
            WHEN LENGTH(word) <= 6 THEN 2
            ELSE 3
        END
        WHERE id IN (
            SELECT id FROM words 
            WHERE difficulty IS NULL 
            LIMIT batch_size
        );
        
        GET DIAGNOSTICS processed = ROW_COUNT;
        EXIT WHEN processed = 0;
        
        RAISE NOTICE 'Processed % rows', processed;
        COMMIT;
    END LOOP;
END $$;
```

### 3. Index Management

#### Create Indexes Concurrently in Production
```sql
-- For production environments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_words_difficulty 
ON words(difficulty);

-- For development (faster)
CREATE INDEX IF NOT EXISTS idx_words_difficulty 
ON words(difficulty);
```

#### Drop Indexes Before Large Data Changes
```sql
-- Drop index before bulk update
DROP INDEX IF EXISTS idx_words_word;

-- Perform bulk update
UPDATE words SET word = LOWER(word);

-- Recreate index
CREATE INDEX idx_words_word ON words(word);
```

### 4. Testing Migrations

#### Test on Copy of Production Data
```bash
# Create test database with production data
pg_dump -h prod-db -U user -d phaserai_prod | psql -h test-db -U user -d phaserai_test

# Test migration on copy
ENVIRONMENT=test ./scripts/migrate.sh up
```

#### Measure Performance Impact
```sql
-- Add timing to your migrations
\timing on

-- Your migration SQL here

-- Check execution plan for complex queries
EXPLAIN ANALYZE SELECT * FROM words WHERE difficulty = 1;
```

## Troubleshooting

### Common Issues

#### Migration Fails Midway
```bash
# Check migration status
./scripts/migrate.sh status

# Check database logs
# AWS RDS: Check CloudWatch logs
# Local: Check PostgreSQL logs

# Fix the issue and retry
./scripts/migrate.sh up
```

#### Migration Marked as Applied but Changes Missing
```bash
# Check what's actually in the database
psql -h your-db -U user -d database -c "\dt"

# If needed, manually fix and update migration record
psql -h your-db -U user -d database -c "
  UPDATE schema_migrations 
  SET applied_at = NOW() 
  WHERE version = '20250104_100000'
"
```

#### Rollback Not Working
```bash
# Check if DOWN section exists in migration file
grep -A 20 "-- DOWN:" infra/migrations/20250104_100000_migration.sql

# If no DOWN section, create manual rollback
psql -h your-db -U user -d database -c "
  -- Manual rollback SQL here
  DROP TABLE IF EXISTS new_table;
  DELETE FROM schema_migrations WHERE version = '20250104_100000';
"
```

### Recovery Procedures

#### Restore from Backup
```bash
# List available backups
aws s3 ls s3://your-backup-bucket/database-backups/

# Download backup
aws s3 cp s3://your-backup-bucket/database-backups/backup_20250104_095000.sql /tmp/

# Restore database
psql -h your-db -U user -d database < /tmp/backup_20250104_095000.sql
```

#### Reset Migration State
```bash
# DANGER: Only use in development
# This will reset all migration tracking
psql -h your-db -U user -d database -c "
  DROP TABLE IF EXISTS schema_migrations;
  -- Recreate with current state
  CREATE TABLE schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64),
    execution_time_ms INTEGER,
    description TEXT
  );
  -- Mark all existing migrations as applied
  INSERT INTO schema_migrations (version, description) VALUES
  ('20250101_120000', 'Initial schema'),
  ('20250102_143000', 'Etymology tables');
"
```

## Monitoring and Alerts

### CloudWatch Metrics
- Migration execution time
- Migration success/failure rate
- Database connection errors

### Alerts
- Failed migrations
- Long-running migrations (>15 minutes)
- Database connection issues during migration

### Logging
- All migrations logged to CloudWatch
- Migration status tracked in database
- Backup creation logged

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Database Migration
on:
  push:
    branches: [main]
    paths: ['infra/migrations/**']

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Migrations
        env:
          ENVIRONMENT: prod
          DB_HOST: ${{ secrets.DB_HOST }}
          DB_NAME: ${{ secrets.DB_NAME }}
          DB_USER: ${{ secrets.DB_USER }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
        run: ./scripts/migrate.sh up
```

### CDK Integration
Migrations run automatically during CDK deployment via the MigrationStack custom resource.

## Security Considerations

### Database Credentials
- Use AWS Secrets Manager in production
- Rotate credentials regularly
- Use least-privilege access

### Migration Access
- Limit who can run production migrations
- Require approval for production changes
- Log all migration activities

### Backup Security
- Encrypt backups at rest and in transit
- Secure S3 bucket access
- Regular backup testing

## Support

For issues with migrations:
1. Check the troubleshooting section above
2. Review CloudWatch logs
3. Contact the development team
4. Create an issue in the project repository

Remember: Always test migrations thoroughly before applying to production!