import { Handler } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface MigrationEvent {
  action: 'up' | 'down' | 'status';
  version?: string;
  dryRun?: boolean;
}

interface MigrationResponse {
  success: boolean;
  message: string;
  appliedMigrations?: string[];
  pendingMigrations?: string[];
  error?: string;
}

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

interface Migration {
  version: string;
  file: string;
  checksum: string;
  content: string;
  description: string;
}

export class LambdaMigrationRunner {
  private client: Client | null = null;
  private secretsClient: SecretsManagerClient;

  constructor() {
    this.secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async getDatabaseConfig(): Promise<DatabaseConfig> {
    const secretArn = process.env.SECRET_ARN;
    if (!secretArn) {
      throw new Error('SECRET_ARN environment variable not set');
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretArn });
      const response = await this.secretsClient.send(command);
      
      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }

      const secret = JSON.parse(response.SecretString);
      
      return {
        host: process.env.DB_ENDPOINT || secret.host,
        port: secret.port || 5432,
        database: secret.dbname || secret.database,
        username: secret.username,
        password: secret.password
      };
    } catch (error) {
      console.error('Failed to get database config:', error);
      throw new Error('Failed to retrieve database credentials');
    }
  }

  async connect(): Promise<void> {
    const config = await this.getDatabaseConfig();
    
    this.client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: { rejectUnauthorized: false }
    });

    await this.client.connect();
    console.log('Connected to database');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      console.log('Disconnected from database');
    }
  }

  async ensureMigrationsTable(): Promise<void> {
    if (!this.client) throw new Error('Database not connected');

    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum VARCHAR(64),
        execution_time_ms INTEGER,
        description TEXT
      );
    `;
    
    await this.client.query(query);
  }

  async getAppliedMigrations(): Promise<string[]> {
    if (!this.client) throw new Error('Database not connected');

    const result = await this.client.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    return result.rows.map((row: { version: string }) => row.version);
  }

  getMigrationFiles(): Migration[] {
    // In Lambda, migrations would be bundled with the function
    // For now, we'll include them as embedded strings or load from S3
    const migrations: Migration[] = [
      {
        version: '20250101_120000',
        file: '20250101_120000_initial_schema.sql',
        content: this.getInitialSchemaMigration(),
        checksum: '',
        description: 'Initial PhaserAI database schema'
      },
      {
        version: '20250102_143000',
        file: '20250102_143000_add_etymology_tables.sql',
        content: this.getEtymologyTablesMigration(),
        checksum: '',
        description: 'Add etymology and validation tables'
      }
    ];

    // Calculate checksums
    return migrations.map(migration => ({
      ...migration,
      checksum: crypto.createHash('md5').update(migration.content).digest('hex')
    }));
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const allMigrations = this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    
    return allMigrations.filter(migration => 
      !appliedMigrations.includes(migration.version)
    );
  }

  extractUpSection(content: string): string {
    const upMatch = content.match(/-- UP:.*?\n(.*?)(?=-- DOWN:|-- ============================================================================\n-- DOWN:|$)/s);
    return upMatch ? upMatch[1].trim() : content;
  }

  async applyMigration(migration: Migration, dryRun: boolean = false): Promise<void> {
    if (!this.client) throw new Error('Database not connected');

    console.log(`${dryRun ? 'DRY RUN: ' : ''}Applying migration: ${migration.version}`);
    
    const startTime = Date.now();
    
    try {
      const upSection = this.extractUpSection(migration.content);
      
      if (dryRun) {
        console.log('SQL to be executed:');
        console.log(upSection);
        return;
      }
      
      // Execute migration in a transaction
      await this.client.query('BEGIN');
      
      try {
        await this.client.query(upSection);
        
        const executionTime = Date.now() - startTime;
        
        // Record migration
        const recordQuery = `
          INSERT INTO schema_migrations (version, applied_at, checksum, execution_time_ms, description)
          VALUES ($1, NOW(), $2, $3, $4)
          ON CONFLICT (version) DO UPDATE SET
            applied_at = NOW(),
            checksum = $2,
            execution_time_ms = $3
        `;
        
        await this.client.query(recordQuery, [
          migration.version,
          migration.checksum,
          executionTime,
          migration.description
        ]);
        
        await this.client.query('COMMIT');
        
        console.log(`✓ Migration ${migration.version} applied successfully (${executionTime}ms)`);
        
      } catch (error) {
        await this.client.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error(`✗ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  async runMigrations(targetVersion?: string, dryRun: boolean = false): Promise<string[]> {
    await this.ensureMigrationsTable();
    
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return [];
    }
    
    const migrationsToApply = targetVersion
      ? pendingMigrations.filter(m => m.version <= targetVersion)
      : pendingMigrations;
    
    console.log(`${dryRun ? 'DRY RUN: ' : ''}Applying ${migrationsToApply.length} migration(s)...`);
    
    const appliedVersions: string[] = [];
    
    for (const migration of migrationsToApply) {
      await this.applyMigration(migration, dryRun);
      appliedVersions.push(migration.version);
    }
    
    console.log(`${dryRun ? 'DRY RUN: ' : ''}All migrations processed successfully`);
    return appliedVersions;
  }

  async getMigrationStatus(): Promise<{ applied: string[], pending: string[] }> {
    await this.ensureMigrationsTable();
    
    const allMigrations = this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = await this.getPendingMigrations();
    
    return {
      applied: appliedMigrations,
      pending: pendingMigrations.map(m => m.version)
    };
  }

  // Embedded migration content (in production, these would be loaded from S3 or bundled)
  private getInitialSchemaMigration(): string {
    return `
-- Migration: Initial PhaserAI Database Schema
-- UP: Apply changes
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  checksum VARCHAR(64),
  execution_time_ms INTEGER,
  description TEXT
);

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
-- Migration: Add Etymology and Validation Tables
-- UP: Apply changes
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
}

export const handler: Handler<MigrationEvent, MigrationResponse> = async (event) => {
  const runner = new LambdaMigrationRunner();
  
  try {
    await runner.connect();
    
    switch (event.action) {
      case 'up': {
        const appliedMigrations = await runner.runMigrations(event.version, event.dryRun);
        return {
          success: true,
          message: `Applied ${appliedMigrations.length} migration(s)`,
          appliedMigrations
        };
      }
        
      case 'status': {
        const status = await runner.getMigrationStatus();
        return {
          success: true,
          message: `Applied: ${status.applied.length}, Pending: ${status.pending.length}`,
          appliedMigrations: status.applied,
          pendingMigrations: status.pending
        };
      }
        
      default:
        return {
          success: false,
          message: 'Invalid action. Use "up" or "status"',
          error: 'Invalid action'
        };
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      message: 'Migration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    await runner.disconnect();
  }
};