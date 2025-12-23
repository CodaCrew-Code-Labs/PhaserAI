import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Pool } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import * as https from 'https';
import * as url from 'url';

interface DatabaseCredentials {
  host: string;
  port: number;
  dbname: string;
  username: string;
  password: string;
}

interface Migration {
  version: string;
  description: string;
  sql: string;
}

interface MigrationResult {
  success: boolean;
  message: string;
  applied_count?: number;
  applied_migrations?: any[];
  total_execution_time_ms?: number;
  error?: string;
}

class MigrationRunner {
  private pool: Pool | null = null;
  private secretsClient: SecretsManagerClient;

  constructor() {
    this.secretsClient = new SecretsManagerClient({});
  }

  async getDbConnection(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    const secretArn = process.env.SECRET_ARN;
    if (!secretArn) {
      throw new Error('SECRET_ARN environment variable not set');
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretArn });
      const response = await this.secretsClient.send(command);
      const secret: DatabaseCredentials = JSON.parse(response.SecretString!);

      this.pool = new Pool({
        host: secret.host || process.env.DB_ENDPOINT,
        port: secret.port || 5432,
        database: secret.dbname,
        user: secret.username,
        password: secret.password,
        ssl: { rejectUnauthorized: false },
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      console.log('Connected to database');
      return this.pool;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async closeConnection(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('Disconnected from database');
    }
  }

  async ensureMigrationsTable(): Promise<void> {
    const pool = await this.getDbConnection();
    const client = await pool.connect();

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(50) PRIMARY KEY,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          checksum VARCHAR(64),
          execution_time_ms INTEGER,
          description TEXT
        );
      `);
      console.log('Ensured schema_migrations table exists');
    } catch (error) {
      console.error('Failed to create migrations table:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAppliedMigrations(): Promise<string[]> {
    const pool = await this.getDbConnection();
    const client = await pool.connect();

    try {
      const result = await client.query('SELECT version FROM schema_migrations ORDER BY version');
      return result.rows.map(row => row.version);
    } catch (error) {
      console.error('Failed to get applied migrations:', error);
      return [];
    } finally {
      client.release();
    }
  }

  getMigrations(): Migration[] {
    return [
      {
        version: '20250101_120000',
        description: 'Initial PhaserAI database schema',
        sql: this.getInitialSchemaMigration()
      },
      {
        version: '20250102_143000',
        description: 'Add etymology and validation tables',
        sql: this.getEtymologyTablesMigration()
      },
      {
        version: '20250103_091500',
        description: 'Add user preferences table',
        sql: this.getUserPreferencesMigration()
      }
    ];
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const allMigrations = this.getMigrations();
    const appliedVersions = await this.getAppliedMigrations();
    
    return allMigrations.filter(m => !appliedVersions.includes(m.version));
  }

  async applyMigration(migration: Migration): Promise<number> {
    const pool = await this.getDbConnection();
    const client = await pool.connect();

    const { version, description, sql } = migration;
    console.log(`Applying migration: ${version} - ${description}`);

    const startTime = Date.now();

    try {
      await client.query(sql);
      
      const executionTime = Date.now() - startTime;
      
      await client.query(`
        INSERT INTO schema_migrations (version, applied_at, execution_time_ms, description)
        VALUES ($1, NOW(), $2, $3)
        ON CONFLICT (version) DO UPDATE SET
          applied_at = NOW(),
          execution_time_ms = $2
      `, [version, executionTime, description]);

      console.log(`✓ Migration ${version} applied successfully (${executionTime}ms)`);
      return executionTime;
    } catch (error) {
      console.error(`✗ Migration ${version} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<MigrationResult> {
    try {
      await this.ensureMigrationsTable();
      
      const pending = await this.getPendingMigrations();
      
      if (!pending.length) {
        console.log('No pending migrations');
        return {
          success: true,
          message: 'No pending migrations',
          applied_count: 0,
          applied_migrations: []
        };
      }

      console.log(`Found ${pending.length} pending migration(s)`);

      const appliedMigrations = [];
      let totalTime = 0;

      for (const migration of pending) {
        const executionTime = await this.applyMigration(migration);
        appliedMigrations.push({
          version: migration.version,
          description: migration.description,
          execution_time_ms: executionTime
        });
        totalTime += executionTime;
      }

      console.log(`All migrations applied successfully (total: ${totalTime}ms)`);

      return {
        success: true,
        message: `Applied ${appliedMigrations.length} migration(s)`,
        applied_count: appliedMigrations.length,
        applied_migrations: appliedMigrations,
        total_execution_time_ms: totalTime
      };
    } catch (error) {
      console.error('Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${(error as Error).message}`,
        error: (error as Error).message
      };
    }
  }

  async getStatus(): Promise<any> {
    try {
      await this.ensureMigrationsTable();
      
      const allMigrations = this.getMigrations();
      const applied = await this.getAppliedMigrations();
      const pending = await this.getPendingMigrations();

      return {
        success: true,
        total_migrations: allMigrations.length,
        applied_count: applied.length,
        pending_count: pending.length,
        applied_migrations: applied,
        pending_migrations: pending.map(m => m.version)
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private getInitialSchemaMigration(): string {
    return `
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
    `;
  }

  private getEtymologyTablesMigration(): string {
    return `
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
    `;
  }

  private getUserPreferencesMigration(): string {
    return `
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
    `;
  }
}

export const handler = async (event: any, context: Context): Promise<any> => {
  console.log('Migration Lambda invoked with event:', JSON.stringify(event));

  const runner = new MigrationRunner();

  try {
    const requestType = event.RequestType;

    if (requestType === 'Create' || requestType === 'Update') {
      const result = await runner.runMigrations();

      if (event.ResponseURL) {
        await sendCfnResponse(event, context, 'SUCCESS', result);
      }

      return result;
    } else if (requestType === 'Delete') {
      console.log('Stack deletion - no action taken');

      if (event.ResponseURL) {
        await sendCfnResponse(event, context, 'SUCCESS', {
          message: 'No action taken on stack deletion'
        });
      }

      return { success: true, message: 'No action taken' };
    }

    const action = event.action || 'up';

    if (action === 'up') {
      return await runner.runMigrations();
    } else if (action === 'status') {
      return await runner.getStatus();
    } else {
      return {
        success: false,
        error: `Unknown action: ${action}`
      };
    }
  } catch (error) {
    console.error('Migration handler failed:', error);

    const errorResult = {
      success: false,
      error: (error as Error).message
    };

    if (event.ResponseURL) {
      await sendCfnResponse(event, context, 'FAILED', errorResult);
    }

    return errorResult;
  } finally {
    await runner.closeConnection();
  }
};

async function sendCfnResponse(event: any, context: Context, status: string, responseData: any): Promise<void> {
  const responseBody = JSON.stringify({
    Status: status,
    Reason: `See CloudWatch Log Stream: ${context.logStreamName}`,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  });

  const parsedUrl = url.parse(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': responseBody.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log('CloudFormation response sent successfully');
      resolve();
    });

    req.on('error', (error) => {
      console.error('Failed to send CloudFormation response:', error);
      reject(error);
    });

    req.write(responseBody);
    req.end();
  });
}