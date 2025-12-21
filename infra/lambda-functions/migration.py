import json
import boto3
import psycopg2
import logging
import os
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

class MigrationRunner:
    """Database migration runner for Lambda"""
    
    def __init__(self):
        self.connection = None
        self.secrets_client = boto3.client('secretsmanager')
    
    def get_db_connection(self):
        """Get database connection using credentials from Secrets Manager"""
        if self.connection:
            return self.connection
            
        secret_arn = os.environ.get('SECRET_ARN')
        if not secret_arn:
            raise ValueError('SECRET_ARN environment variable not set')
        
        try:
            secret_response = self.secrets_client.get_secret_value(SecretId=secret_arn)
            secret = json.loads(secret_response['SecretString'])
            
            self.connection = psycopg2.connect(
                host=secret.get('host', os.environ.get('DB_ENDPOINT')),
                port=secret.get('port', 5432),
                database=secret.get('dbname', secret.get('database')),
                user=secret.get('username'),
                password=secret.get('password'),
                sslmode='require'
            )
            
            logger.info('Connected to database')
            return self.connection
            
        except Exception as e:
            logger.error(f'Failed to connect to database: {str(e)}')
            raise
    
    def close_connection(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
            logger.info('Disconnected from database')
    
    def ensure_migrations_table(self):
        """Create schema_migrations table if it doesn't exist"""
        connection = self.get_db_connection()
        cursor = connection.cursor()
        
        try:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(50) PRIMARY KEY,
                    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    checksum VARCHAR(64),
                    execution_time_ms INTEGER,
                    description TEXT
                );
            """)
            connection.commit()
            logger.info('Ensured schema_migrations table exists')
        except Exception as e:
            connection.rollback()
            logger.error(f'Failed to create migrations table: {str(e)}')
            raise
        finally:
            cursor.close()
    
    def get_applied_migrations(self) -> List[str]:
        """Get list of applied migration versions"""
        connection = self.get_db_connection()
        cursor = connection.cursor()
        
        try:
            cursor.execute('SELECT version FROM schema_migrations ORDER BY version')
            return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f'Failed to get applied migrations: {str(e)}')
            return []
        finally:
            cursor.close()
    
    def get_migrations(self) -> List[Dict[str, str]]:
        """Get all available migrations (embedded in Lambda)"""
        return [
            {
                'version': '20250101_120000',
                'description': 'Initial PhaserAI database schema',
                'sql': self.get_initial_schema_migration()
            },
            {
                'version': '20250102_143000',
                'description': 'Add etymology and validation tables',
                'sql': self.get_etymology_tables_migration()
            },
            {
                'version': '20250103_091500',
                'description': 'Add user preferences table',
                'sql': self.get_user_preferences_migration()
            }
        ]
    
    def get_pending_migrations(self) -> List[Dict[str, str]]:
        """Get migrations that haven't been applied yet"""
        all_migrations = self.get_migrations()
        applied_versions = self.get_applied_migrations()
        
        return [m for m in all_migrations if m['version'] not in applied_versions]
    
    def apply_migration(self, migration: Dict[str, str]) -> int:
        """Apply a single migration"""
        connection = self.get_db_connection()
        cursor = connection.cursor()
        
        version = migration['version']
        description = migration['description']
        sql = migration['sql']
        
        logger.info(f'Applying migration: {version} - {description}')
        
        start_time = datetime.now()
        
        try:
            # Execute migration SQL
            cursor.execute(sql)
            
            # Calculate execution time
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # Record migration
            cursor.execute("""
                INSERT INTO schema_migrations (version, applied_at, execution_time_ms, description)
                VALUES (%s, NOW(), %s, %s)
                ON CONFLICT (version) DO UPDATE SET
                    applied_at = NOW(),
                    execution_time_ms = %s
            """, (version, execution_time, description, execution_time))
            
            connection.commit()
            
            logger.info(f'✓ Migration {version} applied successfully ({execution_time}ms)')
            return execution_time
            
        except Exception as e:
            connection.rollback()
            logger.error(f'✗ Migration {version} failed: {str(e)}')
            raise
        finally:
            cursor.close()
    
    def run_migrations(self) -> Dict[str, Any]:
        """Run all pending migrations"""
        try:
            self.ensure_migrations_table()
            
            pending = self.get_pending_migrations()
            
            if not pending:
                logger.info('No pending migrations')
                return {
                    'success': True,
                    'message': 'No pending migrations',
                    'applied_count': 0,
                    'applied_migrations': []
                }
            
            logger.info(f'Found {len(pending)} pending migration(s)')
            
            applied_migrations = []
            total_time = 0
            
            for migration in pending:
                execution_time = self.apply_migration(migration)
                applied_migrations.append({
                    'version': migration['version'],
                    'description': migration['description'],
                    'execution_time_ms': execution_time
                })
                total_time += execution_time
            
            logger.info(f'All migrations applied successfully (total: {total_time}ms)')
            
            return {
                'success': True,
                'message': f'Applied {len(applied_migrations)} migration(s)',
                'applied_count': len(applied_migrations),
                'applied_migrations': applied_migrations,
                'total_execution_time_ms': total_time
            }
            
        except Exception as e:
            logger.error(f'Migration failed: {str(e)}')
            return {
                'success': False,
                'message': f'Migration failed: {str(e)}',
                'error': str(e)
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Get migration status"""
        try:
            self.ensure_migrations_table()
            
            all_migrations = self.get_migrations()
            applied = self.get_applied_migrations()
            pending = self.get_pending_migrations()
            
            return {
                'success': True,
                'total_migrations': len(all_migrations),
                'applied_count': len(applied),
                'pending_count': len(pending),
                'applied_migrations': applied,
                'pending_migrations': [m['version'] for m in pending]
            }
            
        except Exception as e:
            logger.error(f'Failed to get status: {str(e)}')
            return {
                'success': False,
                'error': str(e)
            }
    
    # ========================================================================
    # EMBEDDED MIGRATION SQL
    # ========================================================================
    
    def get_initial_schema_migration(self) -> str:
        """Initial database schema"""
        return """
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS app_8b514_users (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS app_8b514_translations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    word_id UUID REFERENCES app_8b514_words(id) ON DELETE CASCADE NOT NULL,
    language_code TEXT NOT NULL,
    meaning TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS app_8b514_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT REFERENCES app_8b514_users(user_id) ON DELETE CASCADE NOT NULL UNIQUE,
    tier TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_languages_user_id ON app_8b514_languages(user_id);
CREATE INDEX IF NOT EXISTS idx_words_language_id ON app_8b514_words(language_id);
CREATE INDEX IF NOT EXISTS idx_words_is_root ON app_8b514_words(is_root);
CREATE INDEX IF NOT EXISTS idx_translations_word_id ON app_8b514_translations(word_id);
CREATE INDEX IF NOT EXISTS idx_translations_language_code ON app_8b514_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON app_8b514_subscriptions(user_id);

COMMIT;
        """
    
    def get_etymology_tables_migration(self) -> str:
        """Add etymology and validation tables"""
        return """
BEGIN;

CREATE TABLE IF NOT EXISTS app_8b514_word_etymology (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    word_id UUID REFERENCES app_8b514_words(id) ON DELETE CASCADE NOT NULL,
    parent_word_id UUID REFERENCES app_8b514_words(id) ON DELETE SET NULL,
    derivation_type VARCHAR(50),
    derivation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS app_8b514_phonological_violations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    word_id UUID REFERENCES app_8b514_words(id) ON DELETE CASCADE NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_word_etymology_word ON app_8b514_word_etymology(word_id);
CREATE INDEX IF NOT EXISTS idx_word_etymology_parent ON app_8b514_word_etymology(parent_word_id);
CREATE INDEX IF NOT EXISTS idx_phonological_violations_word ON app_8b514_phonological_violations(word_id);

COMMIT;
        """
    
    def get_user_preferences_migration(self) -> str:
        """Add user preferences table"""
        return """
BEGIN;

CREATE TABLE IF NOT EXISTS app_8b514_user_preferences (
    user_id TEXT PRIMARY KEY REFERENCES app_8b514_users(user_id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON app_8b514_user_preferences(user_id);

COMMIT;
        """


def handler(event, context):
    """
    Lambda handler for database migrations
    
    Supports CloudFormation custom resource events and direct invocations
    """
    logger.info(f'Migration Lambda invoked with event: {json.dumps(event)}')
    
    runner = MigrationRunner()
    
    try:
        # Handle CloudFormation custom resource events
        request_type = event.get('RequestType')
        
        if request_type in ['Create', 'Update']:
            # Run migrations on stack create/update
            result = runner.run_migrations()
            
            # Send CloudFormation response if this is a custom resource
            if 'ResponseURL' in event:
                send_cfn_response(event, context, 'SUCCESS', result)
            
            return result
            
        elif request_type == 'Delete':
            # Don't do anything on stack deletion (keep data)
            logger.info('Stack deletion - no action taken')
            
            if 'ResponseURL' in event:
                send_cfn_response(event, context, 'SUCCESS', {
                    'message': 'No action taken on stack deletion'
                })
            
            return {'success': True, 'message': 'No action taken'}
        
        # Handle direct invocations
        action = event.get('action', 'up')
        
        if action == 'up':
            result = runner.run_migrations()
        elif action == 'status':
            result = runner.get_status()
        else:
            result = {
                'success': False,
                'error': f'Unknown action: {action}'
            }
        
        return result
        
    except Exception as e:
        logger.error(f'Migration handler failed: {str(e)}')
        
        error_result = {
            'success': False,
            'error': str(e)
        }
        
        # Send failure response to CloudFormation if needed
        if 'ResponseURL' in event:
            send_cfn_response(event, context, 'FAILED', error_result)
        
        return error_result
        
    finally:
        runner.close_connection()


def send_cfn_response(event, context, status, response_data):
    """Send response to CloudFormation custom resource"""
    import urllib3
    
    http = urllib3.PoolManager()
    
    response_body = json.dumps({
        'Status': status,
        'Reason': f'See CloudWatch Log Stream: {context.log_stream_name}',
        'PhysicalResourceId': context.log_stream_name,
        'StackId': event['StackId'],
        'RequestId': event['RequestId'],
        'LogicalResourceId': event['LogicalResourceId'],
        'Data': response_data
    })
    
    try:
        http.request(
            'PUT',
            event['ResponseURL'],
            body=response_body,
            headers={'Content-Type': 'application/json'}
        )
        logger.info('CloudFormation response sent successfully')
    except Exception as e:
        logger.error(f'Failed to send CloudFormation response: {str(e)}')
