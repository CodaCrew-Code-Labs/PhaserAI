# PhaserAI - AI-Powered Conlang Lexicon Tool

A comprehensive platform for building phonologically-valid constructed languages with AI-powered features, alphabet-to-IPA mapping, and advanced lexicon management. Built with modern web technologies, AWS cloud infrastructure, and enterprise-grade backup and disaster recovery capabilities.


## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Infrastructure](#infrastructure)
- [Database Management](#database-management)
- [Backup & Recovery](#backup--recovery)
- [Data Retention](#data-retention)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Frontend Architecture](#frontend-architecture)
- [Security](#security)
- [Deployment](#deployment)
- [Monitoring & Logging](#monitoring--logging)
- [Testing](#testing)
- [Disaster Recovery](#disaster-recovery)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## 🎯 Overview

PhaserAI is a production-ready web application designed for constructed language (conlang) creators. It provides tools for:

- Creating custom alphabets with IPA phoneme mapping
- Managing comprehensive lexicons with etymology tracking
- Validating phonological rules and syllable structures
- Generating AI-powered word suggestions
- Importing/exporting linguistic data
- Multi-language translation support

### Key Statistics
- **Frontend**: React 19 + TypeScript with 50+ components
- **Backend**: AWS serverless architecture with RDS PostgreSQL
- **Infrastructure**: CDK-managed AWS resources with automated backups
- **Security**: Cognito authentication with row-level security
- **Performance**: <50MB Docker images, sub-second API responses
- **Reliability**: 99.9% uptime target with 4-hour RTO, 1-hour RPO

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │    │   API Gateway    │    │   RDS PostgreSQL│
│   (Frontend)    │◄──►│   + Lambda       │◄──►│   (Database)    │
│                 │    │   (Backend)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌──────────────────┐             │
         └─────────────►│   Cognito Auth   │◄────────────┘
                        │   (Identity)     │
                        └──────────────────┘
                                 │
         ┌──────────────────────────────────────────────────────┐
         │                                                      │
         ▼                       ▼                              ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AWS Backup    │    │   Migration      │    │   Monitoring    │
│   + S3 Storage  │    │   Lambda         │    │   + Alerting    │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Technology Stack

**Frontend:**
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 5.4+ with SWC
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v6

**Backend:**
- **API**: AWS API Gateway + Lambda functions
- **Database**: Amazon RDS PostgreSQL 15.8 with Multi-AZ
- **Authentication**: AWS Cognito with OAuth
- **Infrastructure**: AWS CDK (TypeScript)

**DevOps & Operations:**
- **Containerization**: Docker multi-stage builds
- **Web Server**: Nginx with security headers
- **Monitoring**: CloudWatch + health checks
- **Backup**: AWS Backup + S3 with lifecycle management
- **Migration**: Automated database schema versioning
- **CI/CD**: Ready for GitHub Actions integration

## ✨ Features

### Core Functionality

#### 🔤 Custom Alphabet System
- Define consonants, vowels, and diphthongs
- Map alphabet letters to IPA phonemes
- Bidirectional conversion (alphabet ↔ IPA)
- Support for multi-character mappings (e.g., "th" → "θ")

#### 🔍 Phonological Validation
- Real-time syllable structure checking
- Customizable phonotactic rules
- Violation tracking and reporting
- Visual feedback for invalid constructions

#### 📊 IPA Chart Visualization
- Interactive consonant chart (manner × place)
- Vowel chart (height × backness)
- Highlight enabled phonemes
- Click-to-insert functionality

#### 🌳 Etymology Tracking
- Parent-child word relationships
- Derivation type classification
- Historical sound changes
- Visual etymology trees

#### 🤖 AI Integration
- OpenAI-powered word generation
- Phonologically-aware suggestions
- Context-sensitive recommendations
- Batch generation capabilities

#### 🌐 Multi-language Support
- Translation management
- Language code standardization
- Bulk import/export
- Search across translations

### Advanced Features

#### 📈 Analytics & Insights
- Lexicon growth tracking
- Phoneme frequency analysis
- Etymology depth metrics
- Usage pattern visualization

#### 🔄 Data Management
- JSON/CSV import/export
- Backup and restore
- Data validation
- Migration tools

#### 🎨 User Experience
- Dark/light theme toggle
- Responsive design
- Keyboard shortcuts
- Accessibility compliance

## 📋 Prerequisites

### Development Environment
- **Node.js**: 18.0+ (LTS recommended)
- **Package Manager**: pnpm 8.10+ (preferred) or npm 9+
- **Docker**: 20.10+ (for containerized development)
- **Git**: 2.30+ with SSH key configured

### AWS Account Setup
- **AWS CLI**: 2.0+ configured with appropriate permissions
- **CDK**: 2.170+ installed globally (`npm install -g aws-cdk`)
- **Permissions**: IAM user with CDK deployment permissions

### Required AWS Services
- **RDS**: PostgreSQL database hosting
- **Lambda**: Serverless function execution
- **API Gateway**: REST API management
- **Cognito**: User authentication
- **Secrets Manager**: Credential storage
- **VPC**: Network isolation

## 🚀 Quick Start

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/phaserai.git
cd phaserai

# Install frontend dependencies
pnpm install

# Install infrastructure dependencies
cd infra
npm install
cd ..
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - VITE_API_URL: Your API Gateway URL
# - VITE_COGNITO_USER_POOL_ID: Cognito User Pool ID
# - VITE_COGNITO_CLIENT_ID: Cognito App Client ID
# - VITE_AWS_REGION: AWS region (e.g., us-east-1)
# - VITE_COGNITO_DOMAIN: Cognito hosted UI domain
```

### 3. Infrastructure Deployment

```bash
cd infra

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy all stacks
npm run deploy

# Note the outputs for your .env file
```

### 4. Database Setup

```bash
# Connect to your RDS instance and run:
psql -h your-rds-endpoint -U phaserai_admin -d phaserai_dev

# Execute the schema
\i database-schema.sql
```

### 5. Development Server

```bash
# Start development server
pnpm run dev

# Access at http://localhost:5173
```

## 🛠️ Development Setup

### Local Development

#### Frontend Development
```bash
# Install dependencies
pnpm install

# Start development server with hot reload
pnpm run dev

# Run linter
pnpm run lint

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

#### Infrastructure Development
```bash
cd infra

# Compile TypeScript
npm run build

# Watch for changes
npm run watch

# Synthesize CloudFormation
npm run synth

# Show differences
npm run diff

# Deploy changes
npm run deploy
```

### Docker Development

#### Development Container
```bash
# Build development image
docker build -f Dockerfile.dev -t phaserai-dev .

# Run with hot reload
docker run -p 5173:5173 \
  -v "$(pwd):/app" \
  -v /app/node_modules \
  --env-file .env \
  --name phaserai-dev-container \
  phaserai-dev
```

#### Production Container
```bash
# Build production image
docker build \
  --build-arg VITE_API_URL="$VITE_API_URL" \
  --build-arg VITE_COGNITO_USER_POOL_ID="$VITE_COGNITO_USER_POOL_ID" \
  --build-arg VITE_COGNITO_CLIENT_ID="$VITE_COGNITO_CLIENT_ID" \
  -t phaserai-prod .

# Run production container
docker run -p 3001:80 \
  --name phaserai-prod-container \
  phaserai-prod
```

### CI/CD Pipeline

PhaserAI uses a single, consolidated GitHub Actions workflow (`ci-cd.yml`) that combines all development activities:

**Pipeline Stages:**
1. **Validation & Quality** - Code quality, security scans, formatting checks
2. **Build & Test** - Frontend build, Docker images, Lambda layers, infrastructure
3. **Deploy** - ECR push, EC2 deployment, vulnerability scanning
4. **Notification** - Pipeline summary and PR comments

**Triggers:**
- **Pull Requests**: Validation and build only
- **Main Branch**: Full pipeline with deployment
- **Schedule**: Weekly security scans
- **Manual**: Custom environment deployment

**Key Features:**
- Eliminates duplicate activities across workflows
- Intelligent job skipping based on changes
- Parallel execution where possible
- Comprehensive security scanning
- Automated PR feedback

### Code Quality Tools

#### ESLint Configuration
```bash
# Run linter
pnpm run lint

# Fix auto-fixable issues
pnpm run lint --fix
```

#### TypeScript Checking
```bash
# Type check without emitting
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

## Badges

### Build & CI/CD Workflow Status

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/CodaCrew-Code-Labs/PhaserAI/ci-cd.yml?branch=master&style=for-the-badge&label=CI/CD%20Pipeline)


### Development & Contribution
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)
![Issues](https://img.shields.io/github/issues/CodaCrew-Code-Labs/phaserai?style=for-the-badge)
![Contributors](https://img.shields.io/github/contributors/CodaCrew-Code-Labs/phaserai?style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/CodaCrew-Code-Labs/phaserai?style=for-the-badge)

### Code Quality & Security
Snyk - [Link](https://app.snyk.io/org/codacrew-code-labs/projects?groupBy=targets&before&after&searchQuery=&sortBy=highest+severity&filters[Show]=&filters[Integrations]=&filters[CollectionIds]=)

![CodeFactor Grade (with branch)](https://img.shields.io/codefactor/grade/github/CodaCrew-Code-Labs/PhaserAI/master?style=for-the-badge&label=CodeFactor)
![Codacy grade (branch)](https://img.shields.io/codacy/grade/d956f279c0664cac90e371d00c33d28f/master?style=for-the-badge&label=Codacy%20Grade)
![Dependabot](https://img.shields.io/badge/dependabot-enabled-brightgreen?style=for-the-badge)

### Specialized Features

![AI Powered](https://img.shields.io/badge/AI-OpenAI%20GPT-412991?logo=openai&style=for-the-badge)
![IPA Support](https://img.shields.io/badge/IPA-Phoneme%20Validation-blue?style=for-the-badge)
![Multi-language](https://img.shields.io/badge/i18n-Multi--language-green?style=for-the-badge)
![Accessibility](https://img.shields.io/badge/a11y-WCAG%202.1-blue?style=for-the-badge)

### Technology Stack

![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6?logo=typescript&style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-7.3.0-646CFF?logo=vite&style=for-the-badge)
![AWS CDK](https://img.shields.io/badge/AWS%20CDK-2.170.0-FF9900?logo=amazonaws&style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.8-336791?logo=postgresql&style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-enabled-2496ED?logo=docker&style=for-the-badge)


### Package Management & Dependencies
![pnpm](https://img.shields.io/badge/pnpm-8.10.0-F69220?logo=pnpm&style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&style=for-the-badge)
![Dependencies](https://img.shields.io/librariesio/github/codacrew-code-labs/phaserai?style=for-the-badge)
![Package Manager](https://img.shields.io/badge/package%20manager-pnpm-F69220?style=for-the-badge)

### License & Legal
![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=for-the-badge)
![GDPR Compliant](https://img.shields.io/badge/GDPR-Compliant-green?style=for-the-badge)
![SOX Compliant](https://img.shields.io/badge/SOX-Compliant-blue?style=for-the-badge)

### Deployment & Infrastructure

![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?logo=amazonaws&style=for-the-badge)
![Infrastructure as Code](https://img.shields.io/badge/IaC-AWS%20CDK-FF9900?style=for-the-badge)
![Backup Strategy](https://img.shields.io/badge/Backup-Automated-green?style=for-the-badge)
![Disaster Recovery](https://img.shields.io/badge/DR-4h%20RTO-orange?style=for-the-badge)

## 🏗️ Infrastructure

### AWS CDK Stacks

#### 1. Production Database Stack (`ProductionDatabaseStack`)
**Purpose**: Manages RDS PostgreSQL instance and networking

**Resources:**
- **VPC**: 3-tier architecture (public/private/database subnets)
- **RDS Instance**: PostgreSQL 15.8 with encryption and Multi-AZ
- **Security Groups**: Database and Lambda access control
- **Secrets Manager**: Database credentials
- **Subnet Groups**: Database isolation

**Configuration:**
```typescript
// Environment-specific sizing
const instanceType = environment === 'prod' 
  ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL)
  : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);

// Production features
multiAz: environment === 'prod',
deletionProtection: environment === 'prod',
backupRetention: environment === 'prod' ? 7 : 1 days
```

#### 2. Backup Stack (`BackupStack`)
**Purpose**: Comprehensive backup and recovery management

**Resources:**
- **AWS Backup Vault**: Automated backup scheduling with encryption
- **S3 Backup Bucket**: Long-term storage with intelligent tiering
- **Verification Lambda**: Python-based backup integrity checking
- **SNS Topic**: Automated notifications for backup issues
- **CloudWatch Events**: Scheduled backup verification

**Backup Schedule:**
```yaml
Production:
  Daily: 2:00 AM UTC (35-day retention)
  Weekly: Sunday 1:00 AM UTC (1-year retention)
  Monthly: 1st day 12:00 AM UTC (7-year retention)

Storage Lifecycle:
  Standard → IA (30 days) → Glacier (90 days) → Deep Archive (365 days)
```

#### 3. Migration Stack (`MigrationStack`)
**Purpose**: Automated database schema management

**Resources:**
- **Migration Lambda**: Serverless migration runner
- **Custom Resource**: Automatic migration on deployment
- **VPC Integration**: Secure database access
- **CloudWatch Logs**: Migration execution tracking

**Features:**
- Versioned migration files with UP/DOWN sections
- Automatic execution during CDK deployment
- Rollback capabilities for failed migrations
- Migration status tracking and reporting

#### 4. Production API Stack (`ProductionApiStack`)
**Purpose**: Serverless API with Lambda functions

**Resources:**
- **API Gateway**: REST API with CORS
- **Lambda Functions**: Users, Languages, Words handlers
- **Lambda Layers**: PostgreSQL driver (psycopg2)
- **IAM Roles**: Secrets Manager access
- **CloudWatch Logs**: Function logging

**Endpoints:**
```
GET    /health
POST   /users
GET    /users/{userId}
PUT    /users/{userId}
GET    /users/{userId}/languages
GET    /languages
POST   /languages
GET    /languages/{languageId}
PUT    /languages/{languageId}
DELETE /languages/{languageId}
GET    /languages/{languageId}/words
GET    /words
POST   /words
GET    /words/{wordId}
PUT    /words/{wordId}
DELETE /words/{wordId}
```

#### 5. Cognito Auth Stack (`CognitoAuthStack`)
**Purpose**: User authentication and authorization

**Resources:**
- **User Pool**: Email-based authentication
- **User Pool Client**: SPA configuration
- **User Pool Domain**: Hosted UI
- **Identity Providers**: Google OAuth (optional)

**Features:**
- Email verification required
- Password policy enforcement
- Account recovery via email
- OAuth integration ready
- Hosted UI for sign-in/sign-up

#### 4. Bastion Stack (`BastionStack`)
**Purpose**: Secure database access for administration

**Resources:**
- **EC2 Instance**: t3.micro bastion host
- **Security Group**: SSH and database access
- **Elastic IP**: Static IP address
- **Key Pair**: SSH key management

### Deployment Commands

```bash
cd infra

# Deploy specific stack
cdk deploy phaserai-prod-database-dev

# Deploy all stacks
cdk deploy --all

# Destroy all stacks (careful!)
cdk destroy --all

# Show deployment differences
cdk diff

# Synthesize CloudFormation templates
cdk synth
```

### Environment Variables

The CDK stacks use context variables for configuration:

```bash
# Set context variables
cdk deploy --context appName=phaserai \
           --context environment=prod \
           --context googleClientId=your-client-id \
           --context googleClientSecret=your-secret
```

## 🗄️ Database Schema

### Core Tables

#### Users (`app_8b514_users`)
```sql
CREATE TABLE app_8b514_users (
  user_id TEXT PRIMARY KEY,           -- Cognito user ID
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
### Deployment Commands

```bash
cd infra

# Deploy all stacks including backup and migration
cdk deploy --all --context notificationEmail=admin@example.com

# Deploy specific stacks
cdk deploy phaserai-prod-database-dev
cdk deploy phaserai-backup-dev
cdk deploy phaserai-migration-dev

# Destroy all stacks (careful!)
cdk destroy --all

# Show deployment differences
cdk diff

# Synthesize CloudFormation templates
cdk synth
```

### Environment Variables

The CDK stacks use context variables for configuration:

```bash
# Set context variables
cdk deploy --context appName=phaserai \
           --context environment=prod \
           --context notificationEmail=admin@example.com \
           --context googleClientId=your-client-id \
           --context googleClientSecret=your-secret
```

## 🗄️ Database Management

### Migration System

PhaserAI uses a comprehensive database migration system for schema versioning and automated deployments.

#### Migration Files Structure
```
infra/migrations/
├── 20250101_120000_initial_schema.sql
├── 20250102_143000_add_etymology_tables.sql
├── 20250103_091500_add_user_preferences.sql
└── README.md
```

#### Migration Commands
```bash
# Check migration status
./scripts/migrate.sh status

# Apply all pending migrations
./scripts/migrate.sh up

# Rollback last migration
./scripts/migrate.sh down

# Production migration with backup
ENVIRONMENT=prod ./scripts/migrate.sh up
```

#### Automated Migration
Migrations run automatically during CDK deployment via the MigrationStack custom resource.

### Migration Best Practices
- **Always use transactions**: Wrap changes in BEGIN/COMMIT blocks
- **Make migrations idempotent**: Use IF NOT EXISTS clauses
- **Test thoroughly**: Test on development before production
- **Backup before production**: Automatic backups before migration

## 💾 Backup & Recovery

### Automated Backup System

#### Backup Schedule
```yaml
Production Environment:
  Daily Backups:
    Time: 2:00 AM UTC
    Retention: 35 days
    Storage: Standard → IA (30 days)
  
  Weekly Backups:
    Time: Sunday 1:00 AM UTC
    Retention: 1 year
    Storage: IA → Glacier (30 days)
  
  Monthly Backups:
    Time: 1st day 12:00 AM UTC
    Retention: 7 years
    Storage: Glacier → Deep Archive (90 days)

Staging/Development:
  Daily Backups:
    Time: 3:00/4:00 AM UTC
    Retention: 7/3 days
    Storage: Standard only
```

#### Backup Verification
```bash
# Daily automated verification (runs at 6:00 AM UTC)
./scripts/backup-verification.sh

# Manual verification with restoration test
./scripts/backup-verification.sh --test-restore

# Production verification with notifications
ENVIRONMENT=prod ./scripts/backup-verification.sh --notification-email admin@example.com
```

#### Backup Features
- **Automated Scheduling**: AWS Backup service with lifecycle management
- **Cross-Region Replication**: Geographic redundancy for disaster recovery
- **Encryption**: All backups encrypted at rest and in transit
- **Integrity Verification**: Daily automated backup validation
- **Point-in-Time Recovery**: 7-day PITR for production databases

### Disaster Recovery

#### Recovery Objectives
```yaml
Production:
  RTO (Recovery Time Objective): 4 hours
  RPO (Recovery Point Objective): 1 hour
  Data Loss Tolerance: Maximum 1 hour

Staging:
  RTO: 8 hours
  RPO: 24 hours
  Data Loss Tolerance: Maximum 24 hours
```

#### Disaster Recovery Testing
```bash
# Test database recovery
./scripts/disaster-recovery-test.sh --test-type database

# Test infrastructure recovery
./scripts/disaster-recovery-test.sh --test-type infrastructure

# Test cross-region failover
./scripts/disaster-recovery-test.sh --test-type cross-region

# Run all DR tests
./scripts/disaster-recovery-test.sh --test-type all
```

#### Recovery Procedures
- **Database Corruption**: Restore from latest automated backup
- **Regional Outage**: Failover to cross-region backup
- **Infrastructure Failure**: Redeploy from CDK source control
- **Security Breach**: Clean backup restoration with credential rotation

## 📊 Data Retention

### Retention Policies

#### User Data
| Data Type | Production | Staging | Development |
|-----------|------------|---------|-------------|
| Active user accounts | While active + 3 years | 30 days | 7 days |
| Deleted user accounts | 30 days recovery period | 7 days | 1 day |
| User preferences | Same as user account | 30 days | 7 days |
| Authentication logs | 1 year | 30 days | 7 days |

#### Application Data
| Data Type | Production | Staging | Development |
|-----------|------------|---------|-------------|
| Languages & words | While user active + 30 days | 7 days | 3 days |
| Etymology data | While user active + 30 days | 7 days | 3 days |
| Violation logs | 90 days | 30 days | 7 days |
| Performance metrics | 1 year detailed, 3 years aggregated | 30 days | 7 days |

#### System Data
| Data Type | Production | Staging | Development |
|-----------|------------|---------|-------------|
| Application logs | 90 days | 30 days | 7 days |
| Security logs | 1 year | 90 days | 7 days |
| Audit trails | 7 years (compliance) | 90 days | 7 days |
| Backup data | See backup schedule | 7 days | 3 days |

### Compliance Features
- **GDPR Compliance**: Right to access, rectification, erasure, and portability
- **CCPA Compliance**: California consumer privacy rights
- **SOX Compliance**: 7-year audit trail retention
- **Automated Cleanup**: Scheduled jobs for expired data removal
- **User Rights**: Self-service data export and deletion requests

### Data Retention Commands
```bash
# Check retention compliance
cd infra && npm run retention:check

# Generate retention report
cd infra && npm run retention:report

# Manual cleanup (development only)
cd infra && npm run retention:cleanup
```

## 🗄️ Database Schema

### Core Tables

#### Users (`app_8b514_users`)
```sql
CREATE TABLE app_8b514_users (
  user_id TEXT PRIMARY KEY,           -- Cognito user ID
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Languages (`app_8b514_languages`)
```sql
CREATE TABLE app_8b514_languages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT REFERENCES app_8b514_users(user_id),
  name TEXT NOT NULL,
  phonemes JSONB NOT NULL DEFAULT '{"consonants":[],"vowels":[],"diphthongs":[]}',
  alphabet_mappings JSONB NOT NULL DEFAULT '{"consonants":{},"vowels":{},"diphthongs":{}}',
  syllables TEXT NOT NULL DEFAULT 'CV',
  rules TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Words (`app_8b514_words`)
```sql
CREATE TABLE app_8b514_words (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  language_id UUID REFERENCES app_8b514_languages(id),
  word TEXT NOT NULL,
  ipa TEXT NOT NULL,
  pos TEXT[] NOT NULL DEFAULT '{}',
  is_root BOOLEAN NOT NULL DEFAULT false,
  embedding FLOAT[] NULL,              -- For AI features
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Translations (`app_8b514_translations`)
```sql
CREATE TABLE app_8b514_translations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word_id UUID REFERENCES app_8b514_words(id),
  language_code TEXT NOT NULL,         -- ISO 639-1 codes
  meaning TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Etymology & Validation Tables

#### Word Etymology (`app_8b514_word_etymology`)
```sql
CREATE TABLE app_8b514_word_etymology (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word_id UUID REFERENCES app_8b514_words(id),
  parent_word_id UUID REFERENCES app_8b514_words(id),
  derivation_type VARCHAR(50),         -- 'compound', 'affix', 'sound_change'
  derivation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Phonological Violations (`app_8b514_phonological_violations`)
```sql
CREATE TABLE app_8b514_phonological_violations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word_id UUID REFERENCES app_8b514_words(id),
  violation_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Migration Tracking

#### Schema Migrations (`schema_migrations`)
```sql
CREATE TABLE schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checksum VARCHAR(64),
  execution_time_ms INTEGER,
  description TEXT
);
```

### Indexes

Performance-optimized indexes for common queries:

```sql
-- Core table indexes
CREATE INDEX idx_languages_user_id ON app_8b514_languages(user_id);
CREATE INDEX idx_words_language_id ON app_8b514_words(language_id);
CREATE INDEX idx_words_is_root ON app_8b514_words(is_root);
CREATE INDEX idx_translations_word_id ON app_8b514_translations(word_id);
CREATE INDEX idx_translations_language_code ON app_8b514_translations(language_code);

-- Etymology indexes
CREATE INDEX idx_word_etymology_word ON app_8b514_word_etymology(word_id);
CREATE INDEX idx_word_etymology_parent ON app_8b514_word_etymology(parent_word_id);

-- Validation indexes
CREATE INDEX idx_phonological_violations_word ON app_8b514_phonological_violations(word_id);
```

## 📡 API Documentation

### Authentication

All API endpoints (except `/health`) require authentication via AWS Cognito JWT tokens.

**Headers:**
```
Authorization: Bearer <cognito-jwt-token>
Content-Type: application/json
```

### Error Handling

**Standard Error Response:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

### Endpoints

#### Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

#### Users

**Get User:**
```http
GET /users/{userId}
```

**Create User:**
```http
POST /users
Content-Type: application/json

{
  "user_id": "cognito-user-id",
  "email": "user@example.com",
  "username": "username"
}
```

#### Languages

**List User Languages:**
```http
GET /users/{userId}/languages
```

**Get Language:**
```http
GET /languages/{languageId}
```

**Create Language:**
```http
POST /languages
Content-Type: application/json

{
  "user_id": "cognito-user-id",
  "name": "My Conlang",
  "phonemes": {
    "consonants": ["p", "t", "k"],
    "vowels": ["a", "i", "u"],
    "diphthongs": []
  },
  "alphabet_mappings": {
    "consonants": {"p": "p", "t": "t", "k": "k"},
    "vowels": {"a": "a", "i": "i", "u": "u"},
    "diphthongs": {}
  },
  "syllables": "CV",
  "rules": "No consonant clusters"
}
```

#### Words

**List Language Words:**
```http
GET /languages/{languageId}/words
```

**Create Word:**
```http
POST /words
Content-Type: application/json

{
  "language_id": "uuid",
  "word": "taku",
  "ipa": "taku",
  "pos": ["noun"],
  "is_root": true,
  "translations": [
    {
      "language_code": "en",
      "meaning": "house"
    }
  ]
}
```

## 🎨 Frontend Architecture

### Component Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui base components
│   ├── forms/           # Form-specific components
│   ├── charts/          # Data visualization
│   └── layout/          # Layout components
├── pages/               # Route components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and services
├── types/               # TypeScript type definitions
└── styles/              # Global styles
```

### State Management

#### Zustand Stores

**Auth Store (`useAuthStore`):**
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}
```

**Language Store (`useLanguageStore`):**
```typescript
interface LanguageState {
  currentLanguage: Language | null;
  languages: Language[];
  setCurrentLanguage: (language: Language) => void;
  addLanguage: (language: Language) => void;
  updateLanguage: (id: string, updates: Partial<Language>) => void;
}
```

#### TanStack Query

**Query Keys:**
```typescript
const queryKeys = {
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  languages: ['languages'] as const,
  userLanguages: (userId: string) => ['languages', 'user', userId] as const,
  language: (id: string) => ['languages', id] as const,
  words: ['words'] as const,
  languageWords: (languageId: string) => ['words', 'language', languageId] as const,
  word: (id: string) => ['words', id] as const,
};
```

### Custom Hooks

#### `useLanguageData`
```typescript
export function useLanguageData(languageId: string) {
  const { data: language, isLoading: languageLoading } = useQuery({
    queryKey: queryKeys.language(languageId),
    queryFn: () => api.getLanguage(languageId),
  });

  const { data: words, isLoading: wordsLoading } = useQuery({
    queryKey: queryKeys.languageWords(languageId),
    queryFn: () => api.getWords(languageId),
    enabled: !!languageId,
  });

  return {
    language,
    words,
    isLoading: languageLoading || wordsLoading,
  };
}
```

#### `usePhonemeValidation`
```typescript
export function usePhonemeValidation(language: Language) {
  return useCallback((word: string, ipa: string) => {
    const violations: Violation[] = [];
    
    // Validate phonemes exist in language
    const ipaPhonemes = parseIPA(ipa);
    const validPhonemes = [
      ...language.phonemes.consonants,
      ...language.phonemes.vowels,
      ...language.phonemes.diphthongs,
    ];
    
    ipaPhonemes.forEach(phoneme => {
      if (!validPhonemes.includes(phoneme)) {
        violations.push({
          type: 'invalid_phoneme',
          description: `Phoneme '${phoneme}' not defined in language`,
          severity: 'error',
        });
      }
    });
    
    return violations;
  }, [language]);
}
```

### Form Validation

Using React Hook Form + Zod:

```typescript
const languageSchema = z.object({
  name: z.string().min(1, 'Language name is required'),
  phonemes: z.object({
    consonants: z.array(z.string()).min(1, 'At least one consonant required'),
    vowels: z.array(z.string()).min(1, 'At least one vowel required'),
    diphthongs: z.array(z.string()),
  }),
  syllables: z.string().min(1, 'Syllable structure required'),
  rules: z.string(),
});

type LanguageFormData = z.infer<typeof languageSchema>;

export function LanguageForm() {
  const form = useForm<LanguageFormData>({
    resolver: zodResolver(languageSchema),
    defaultValues: {
      name: '',
      phonemes: { consonants: [], vowels: [], diphthongs: [] },
      syllables: 'CV',
      rules: '',
    },
  });

  // Form implementation...
}
```

## 🔐 Security

### Authentication Flow

1. **User Registration/Login**: Cognito handles user management
2. **JWT Token**: Issued by Cognito, includes user claims
3. **API Authorization**: Lambda functions validate JWT tokens
4. **Database Access**: Row-level security based on user_id

### Security Headers

**Nginx Configuration:**
```nginx
# Security headers
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

### Data Protection

#### Row Level Security (RLS)
```sql
-- Enable RLS on all user tables
ALTER TABLE app_8b514_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_8b514_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_8b514_translations ENABLE ROW LEVEL SECURITY;

-- Example policy for languages table
CREATE POLICY "Users can only access their own languages" ON app_8b514_languages
  FOR ALL USING (user_id = current_setting('app.current_user_id'));
```

#### Input Validation
- **Frontend**: Zod schemas for all forms
- **Backend**: Lambda function input validation
- **Database**: Constraints and triggers

#### Secrets Management
- **Database Credentials**: AWS Secrets Manager
- **API Keys**: Environment variables (not in code)
- **OAuth Secrets**: Secure parameter store

### OWASP Compliance

**Implemented Protections:**
- ✅ SQL Injection: Parameterized queries
- ✅ XSS: Content Security Policy + input sanitization
- ✅ CSRF: SameSite cookies + CORS configuration
- ✅ Authentication: JWT tokens with expiration
- ✅ Authorization: Role-based access control
- ✅ Data Exposure: Row-level security
- ✅ Logging: Structured logging without sensitive data

## 🚀 Deployment

### Production Deployment Checklist

#### Pre-deployment
- [ ] Run all tests (`npm test`)
- [ ] Build passes without warnings (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates ready
- [ ] Monitoring configured

#### Infrastructure Deployment
```bash
cd infra

# Deploy database stack first
cdk deploy phaserai-prod-database-prod

# Deploy API stack
cdk deploy phaserai-prod-api-prod

# Deploy auth stack
cdk deploy phaserai-auth-prod

# Deploy bastion (optional)
cdk deploy phaserai-prod-bastion-prod
```

#### Application Deployment
```bash
# Build production image
docker build \
  --build-arg VITE_API_URL="$VITE_API_URL" \
  --build-arg VITE_COGNITO_USER_POOL_ID="$VITE_COGNITO_USER_POOL_ID" \
  --build-arg VITE_COGNITO_CLIENT_ID="$VITE_COGNITO_CLIENT_ID" \
  --build-arg VITE_AWS_REGION="$VITE_AWS_REGION" \
  --build-arg VITE_COGNITO_DOMAIN="$VITE_COGNITO_DOMAIN" \
  -t phaserai:latest .

# Tag for registry
docker tag phaserai:latest your-registry/phaserai:latest

# Push to registry
docker push your-registry/phaserai:latest
```

### Environment-Specific Configuration

#### Development
```bash
# .env.development
VITE_API_URL=https://dev-api.phaserai.com
VITE_COGNITO_USER_POOL_ID=us-east-1_devpool123
VITE_COGNITO_CLIENT_ID=devclient123
```

#### Staging
```bash
# .env.staging
VITE_API_URL=https://staging-api.phaserai.com
VITE_COGNITO_USER_POOL_ID=us-east-1_stagingpool123
VITE_COGNITO_CLIENT_ID=stagingclient123
```

#### Production
```bash
# .env.production
VITE_API_URL=https://api.phaserai.com
VITE_COGNITO_USER_POOL_ID=us-east-1_prodpool123
VITE_COGNITO_CLIENT_ID=prodclient123
```

### CI/CD Pipeline (GitHub Actions Example)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run test
      - run: pnpm run build

  deploy-infrastructure:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: cd infra && npm install
      - run: cd infra && npm run deploy

  deploy-application:
    needs: [test, deploy-infrastructure]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: your-registry/phaserai:latest
          build-args: |
            VITE_API_URL=${{ secrets.VITE_API_URL }}
            VITE_COGNITO_USER_POOL_ID=${{ secrets.VITE_COGNITO_USER_POOL_ID }}
```

## 📊 Monitoring & Logging

### Health Checks

**Application Health:**
```http
GET /health
```
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "version": "1.0.0",
  "database": "connected",
  "memory": "45MB",
  "uptime": "2h 15m"
}
```

**Docker Health Check:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
```

### Logging

#### Application Logs
```typescript
// Structured logging
const logger = {
  info: (message: string, meta?: object) => {
    if (import.meta.env.PROD) {
      console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
    } else {
      console.log(message, meta);
    }
  },
  error: (message: string, error?: Error, meta?: object) => {
    const logData = {
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      ...meta,
      timestamp: new Date().toISOString(),
    };
    console.error(JSON.stringify(logData));
  },
};
```

#### Nginx Access Logs
```nginx
log_format json_combined escape=json
  '{'
    '"time_local":"$time_local",'  
    '"remote_addr":"$remote_addr",'  
    '"request":"$request",'  
    '"status":$status,'  
    '"body_bytes_sent":$body_bytes_sent,'  
    '"http_referer":"$http_referer",'  
    '"http_user_agent":"$http_user_agent",'  
    '"request_time":$request_time'  
  '}';

access_log /var/log/nginx/access.log json_combined;
```

### Monitoring Commands

```bash
# View application logs
docker logs -f phaserai-prod-container

# Monitor resource usage
docker stats phaserai-prod-container

# Check health status
curl http://localhost/health

# View nginx logs
docker exec phaserai-prod-container tail -f /var/log/nginx/access.log
```

### CloudWatch Integration

**Lambda Function Logs:**
- Automatic log group creation
- 1-week retention by default
- Structured JSON logging

**RDS Monitoring:**
- Performance Insights enabled (production)
- CloudWatch metrics for CPU, memory, connections
- Automated backups with point-in-time recovery

**API Gateway Logs:**
- Request/response logging
- Error rate monitoring
- Latency tracking

**Backup Monitoring:**
- Daily backup verification at 6:00 AM UTC
- Automated alerts for backup failures
- Cross-region backup status monitoring
- Storage cost optimization tracking

## 🧪 Testing

### Testing Strategy

#### Unit Tests
- **Framework**: Jest + React Testing Library
- **Coverage**: Components, hooks, utilities
- **Location**: `src/**/__tests__/`

#### Integration Tests
- **Framework**: Jest + MSW (Mock Service Worker)
- **Coverage**: API integration, user flows
- **Location**: `src/__tests__/integration/`

#### End-to-End Tests
- **Framework**: Playwright
- **Coverage**: Critical user journeys
- **Location**: `e2e/`

#### Infrastructure Tests
- **Framework**: CDK Unit Tests + AWS Testing Library
- **Coverage**: CDK stack validation, resource configuration
- **Location**: `infra/test/`

### Test Setup

```bash
# Install testing dependencies
pnpm add -D jest @testing-library/react @testing-library/jest-dom
pnpm add -D @testing-library/user-event msw playwright

# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Run e2e tests
pnpm test:e2e
```

### Example Tests

#### Component Test
```typescript
// src/components/__tests__/LanguageForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageForm } from '../LanguageForm';

describe('LanguageForm', () => {
  it('validates required fields', async () => {
    render(<LanguageForm onSubmit={jest.fn()} />);
    
    fireEvent.click(screen.getByRole('button', { name: /create language/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Language name is required')).toBeInTheDocument();
    });
  });

  it('submits valid form data', async () => {
    const onSubmit = jest.fn();
    render(<LanguageForm onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/language name/i), {
      target: { value: 'Test Language' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /create language/i }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Language',
        // ... other form data
      });
    });
  });
});
```

#### API Test
```typescript
// src/lib/__tests__/api-client.test.ts
import { api } from '../api-client';
import { server } from '../mocks/server';

describe('API Client', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('creates a new language', async () => {
    const languageData = {
      name: 'Test Language',
      phonemes: { consonants: ['p'], vowels: ['a'], diphthongs: [] },
    };

    const result = await api.createLanguage(languageData);
    
    expect(result).toMatchObject({
      id: expect.any(String),
      name: 'Test Language',
    });
  });
});
```

#### E2E Test
```typescript
// e2e/language-creation.spec.ts
import { test, expect } from '@playwright/test';

test('user can create a new language', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Login flow
  await page.click('text=Sign In');
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'password123');
  await page.click('[data-testid=sign-in-button]');
  
  // Create language
  await page.click('text=Create New Language');
  await page.fill('[data-testid=language-name]', 'My Test Language');
  await page.click('[data-testid=add-consonant]');
  await page.fill('[data-testid=consonant-input]', 'p');
  await page.click('[data-testid=add-vowel]');
  await page.fill('[data-testid=vowel-input]', 'a');
  await page.click('[data-testid=create-language-button]');
  
  // Verify creation
  await expect(page.locator('text=My Test Language')).toBeVisible();
});
```

## 🚨 Disaster Recovery

### Disaster Recovery Testing

PhaserAI includes comprehensive disaster recovery testing capabilities to ensure business continuity.

#### DR Test Types

**Database Recovery Testing:**
```bash
# Test database backup restoration
./scripts/disaster-recovery-test.sh --test-type database

# Test with cleanup disabled (for investigation)
./scripts/disaster-recovery-test.sh --test-type database --no-cleanup
```

**Infrastructure Recovery Testing:**
```bash
# Test complete infrastructure deployment from source
./scripts/disaster-recovery-test.sh --test-type infrastructure

# Test with notifications
./scripts/disaster-recovery-test.sh --test-type infrastructure --notification-email admin@example.com
```

**Cross-Region Recovery Testing:**
```bash
# Test cross-region failover capabilities
./scripts/disaster-recovery-test.sh --test-type cross-region
```

**Security Breach Recovery Testing:**
```bash
# Test security incident recovery procedures
./scripts/disaster-recovery-test.sh --test-type security
```

**Comprehensive DR Testing:**
```bash
# Run all disaster recovery tests
./scripts/disaster-recovery-test.sh --test-type all --notification-email team@example.com
```

#### DR Testing Schedule

**Monthly Tests:**
- Database recovery validation
- Backup integrity verification
- Infrastructure deployment testing

**Quarterly Tests:**
- Cross-region failover testing
- Complete infrastructure recovery
- Security breach simulation

**Annual Tests:**
- Full disaster simulation
- Regional outage scenario
- Complete data center loss simulation

### Recovery Procedures

#### Database Recovery
1. **Assess Impact**: Determine scope of database issues
2. **Stop Traffic**: Prevent further data corruption
3. **Identify Backup**: Select appropriate recovery point
4. **Restore Database**: Use AWS Backup or point-in-time recovery
5. **Validate Data**: Run integrity checks
6. **Resume Operations**: Gradually restore traffic

#### Infrastructure Recovery
1. **Source Control**: Ensure latest CDK code is available
2. **Deploy Infrastructure**: Use CDK to recreate resources
3. **Restore Configuration**: Apply environment-specific settings
4. **Test Connectivity**: Verify all services are operational
5. **Update DNS**: Point traffic to new infrastructure

#### Security Incident Recovery
1. **Isolate Systems**: Prevent further compromise
2. **Rotate Credentials**: Update all passwords and keys
3. **Clean Restore**: Restore from known-good backup
4. **Security Patches**: Apply latest security updates
5. **Monitor**: Enhanced monitoring for suspicious activity

### Recovery Documentation

**Detailed Procedures**: See [docs/DISASTER_RECOVERY_PLAN.md](docs/DISASTER_RECOVERY_PLAN.md)
**Migration Guide**: See [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md)
**Data Retention Policy**: See [docs/DATA_RETENTION_POLICY.md](docs/DATA_RETENTION_POLICY.md)

## 🤝 Contributing

### Development Workflow

1. **Fork & Clone**
   ```bash
   git clone https://github.com/your-username/phaserai.git
   cd phaserai
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Development Setup**
   ```bash
   pnpm install
   cd infra && npm install && cd ..
   cp .env.example .env
   # Configure your .env file
   ```

4. **Make Changes**
   - Follow TypeScript best practices
   - Add tests for new functionality
   - Update documentation as needed
   - Follow existing code style

5. **Test Your Changes**
   ```bash
   pnpm run lint
   pnpm run test
   pnpm run build
   
   # Test infrastructure changes
   cd infra && npm run test
   
   # Test migrations
   ./scripts/migrate.sh status
   ```

6. **Commit & Push**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   git push origin feature/your-feature-name
   ```

7. **Create Pull Request**
   - Provide clear description
   - Link related issues
   - Include screenshots for UI changes

### Code Standards

#### TypeScript
- Use strict mode
- Prefer interfaces over types for object shapes
- Use proper generic constraints
- Document complex types

```typescript
// Good
interface LanguageFormProps {
  language?: Language;
  onSubmit: (data: LanguageFormData) => Promise<void>;
  isLoading?: boolean;
}

// Avoid
type LanguageFormProps = {
  language: Language | undefined;
  onSubmit: Function;
  isLoading: boolean | undefined;
};
```

#### React Components
- Use functional components with hooks
- Prefer composition over inheritance
- Extract custom hooks for reusable logic
- Use proper prop types

```typescript
// Good
export function LanguageForm({ language, onSubmit, isLoading = false }: LanguageFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<LanguageFormData>();
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form content */}
    </form>
  );
}

// Avoid
export const LanguageForm: React.FC<any> = (props) => {
  // Component implementation
};
```

#### CSS/Styling
- Use Tailwind CSS classes
- Follow mobile-first responsive design
- Use CSS custom properties for theming
- Maintain consistent spacing scale

```tsx
// Good
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-sm">
  <h2 className="text-xl font-semibold text-gray-900">Title</h2>
  <p className="text-gray-600">Description</p>
</div>

// Avoid inline styles
<div style={{ display: 'flex', padding: '24px' }}>
```

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add phoneme validation to word creation form
fix: resolve IPA chart rendering issue on mobile
docs: update API documentation for languages endpoint
refactor: extract common form validation logic
test: add unit tests for etymology tracking
chore: update dependencies to latest versions
```

### Pull Request Guidelines

#### PR Title
Use conventional commit format:
```
feat: add real-time phonological validation
```

#### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Issue Templates

#### Bug Report
```markdown
**Describe the bug**
A clear description of the bug

**To Reproduce**
Steps to reproduce the behavior

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 1.0.0]
```

#### Feature Request
```markdown
**Is your feature request related to a problem?**
A clear description of the problem

**Describe the solution you'd like**
A clear description of what you want to happen

**Describe alternatives you've considered**
Alternative solutions or features considered

**Additional context**
Any other context or screenshots
```

## 🐛 Troubleshooting

### Common Issues

#### Environment Variables Not Loading
**Problem**: Environment variables are undefined in the application

**Solutions:**
1. Check `.env` file format (no quotes around values)
   ```bash
   # ✅ Correct
   VITE_API_URL=https://api.example.com
   
   # ❌ Wrong
   VITE_API_URL="https://api.example.com"
   ```

2. Ensure variables start with `VITE_` prefix
3. Restart development server after changes
4. Check build-time vs runtime variables

#### Docker Hot Reload Not Working
**Problem**: Changes not reflected in development container

**Solutions:**
1. Verify volume mounting:
   ```bash
   docker run -v "$(pwd):/app" -v /app/node_modules ...
   ```

2. Check file permissions (especially on Windows/WSL)
3. Ensure `.dockerignore` doesn't exclude source files
4. Try rebuilding the development image

#### Database Connection Issues
**Problem**: Cannot connect to RDS database

**Solutions:**
1. Check security group rules
2. Verify VPC configuration
3. Confirm database endpoint and credentials
4. Test connection from bastion host:
   ```bash
   psql -h your-rds-endpoint -U phaserai_admin -d phaserai_dev
   ```

#### Migration Issues
**Problem**: Database migrations failing or stuck

**Solutions:**
1. Check migration status:
   ```bash
   ./scripts/migrate.sh status
   ```

2. Verify database connectivity:
   ```bash
   psql -h your-db -U user -d database -c "SELECT 1;"
   ```

3. Check migration file syntax:
   ```bash
   # Validate SQL syntax
   psql -h your-db -U user -d database --dry-run -f migration.sql
   ```

4. Manual migration rollback:
   ```bash
   ./scripts/migrate.sh down
   ```

5. Reset migration state (development only):
   ```sql
   DELETE FROM schema_migrations WHERE version = 'problematic_version';
   ```

#### Backup Verification Failures
**Problem**: Backup verification script reporting issues

**Solutions:**
1. Check backup vault access:
   ```bash
   aws backup list-recovery-points-by-backup-vault --backup-vault-name your-vault
   ```

2. Verify backup age:
   ```bash
   ./scripts/backup-verification.sh --environment prod
   ```

3. Test backup restoration:
   ```bash
   ./scripts/backup-verification.sh --test-restore
   ```

4. Check S3 backup bucket:
   ```bash
   aws s3 ls s3://your-backup-bucket/
   ```

5. Review CloudWatch logs for backup Lambda function

#### Disaster Recovery Test Failures
**Problem**: DR tests failing or timing out

**Solutions:**
1. Check AWS permissions:
   ```bash
   aws sts get-caller-identity
   aws backup list-backup-vaults
   ```

2. Verify test environment resources:
   ```bash
   ./scripts/disaster-recovery-test.sh --test-type database --no-cleanup
   ```

3. Check restoration timeout settings:
   ```bash
   # Increase timeout for large databases
   export DR_TEST_TIMEOUT=3600
   ```

4. Review test logs:
   ```bash
   tail -f /tmp/dr-test-report-*.json
   ```

#### Authentication Errors
**Problem**: Cognito authentication failing

**Solutions:**
1. Verify Cognito configuration in `.env`
2. Check callback URLs in Cognito console
3. Ensure user pool client settings are correct
4. Clear browser cache and cookies
5. Check CloudWatch logs for detailed errors

#### Build Failures
**Problem**: Production build fails

**Solutions:**
1. Check TypeScript errors:
   ```bash
   npx tsc --noEmit
   ```

2. Verify all dependencies are installed:
   ```bash
   pnpm install
   ```

3. Clear build cache:
   ```bash
   rm -rf dist node_modules/.vite
   pnpm install
   ```

4. Check for missing environment variables in build

#### API Gateway Errors
**Problem**: API requests returning 500 errors

**Solutions:**
1. Check Lambda function logs in CloudWatch
2. Verify database connection from Lambda
3. Check IAM permissions for Secrets Manager
4. Test Lambda functions individually
5. Verify API Gateway integration configuration

### Debug Commands

```bash
# Check Docker container logs
docker logs -f container-name

# Inspect running container
docker exec -it container-name /bin/sh

# Check network connectivity
docker exec container-name ping database-endpoint

# View environment variables
docker exec container-name env

# Check file permissions
docker exec container-name ls -la /app

# Test database connection
docker exec container-name psql -h endpoint -U user -d database

# Check CDK diff
cd infra && cdk diff

# Validate CloudFormation template
cd infra && cdk synth

# Check AWS credentials
aws sts get-caller-identity
```

### Performance Issues

#### Slow API Responses
**Diagnostics:**
1. Check CloudWatch metrics for Lambda duration
2. Monitor RDS performance insights
3. Review database query performance
4. Check network latency

**Solutions:**
1. Add database indexes for common queries
2. Implement caching (Redis/ElastiCache)
3. Optimize Lambda function code
4. Use connection pooling

#### Large Bundle Size
**Diagnostics:**
```bash
# Analyze bundle
pnpm run build
npx vite-bundle-analyzer dist
```

**Solutions:**
1. Implement code splitting
2. Remove unused dependencies
3. Use dynamic imports for large components
4. Optimize images and assets

### Getting Help

1. **Check Documentation**: Review this README and linked guides
   - [Migration Guide](docs/MIGRATION_GUIDE.md)
   - [Disaster Recovery Plan](docs/DISASTER_RECOVERY_PLAN.md)
   - [Data Retention Policy](docs/DATA_RETENTION_POLICY.md)

2. **Search Issues**: Look for similar problems in GitHub issues

3. **Create Issue**: Use issue templates for bug reports or feature requests

4. **Run Diagnostics**: Use built-in diagnostic tools
   ```bash
   # Health check
   curl http://localhost/health
   
   # Backup verification
   ./scripts/backup-verification.sh
   
   # DR test
   ./scripts/disaster-recovery-test.sh --test-type database
   
   # Migration status
   ./scripts/migrate.sh status
   ```

5. **Community**: Join our Discord/Slack for real-time help

6. **Contact**: Reach out to maintainers for urgent issues

## 📚 Additional Documentation

### Operational Guides
- **[Migration Guide](docs/MIGRATION_GUIDE.md)**: Complete database migration procedures
- **[Disaster Recovery Plan](docs/DISASTER_RECOVERY_PLAN.md)**: Comprehensive DR procedures and testing
- **[Data Retention Policy](docs/DATA_RETENTION_POLICY.md)**: Data lifecycle and compliance requirements

### Scripts Reference
- **`./scripts/migrate.sh`**: Database migration management
- **`./scripts/backup-verification.sh`**: Backup integrity verification
- **`./scripts/disaster-recovery-test.sh`**: DR testing and validation

### Infrastructure Components
- **BackupStack**: Automated backup and verification system
- **MigrationStack**: Database schema management and versioning
- **ProductionDatabaseStack**: RDS instance with Multi-AZ and encryption
- **ProductionApiStack**: Serverless API with Lambda functions
- **CognitoAuthStack**: User authentication and authorization

## 📝 License

© 2025 PhaserAI - All rights reserved

This project is proprietary software. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited without explicit written permission from the copyright holders.

### Commercial Use
For commercial licensing inquiries, please contact: [licensing@phaserai.com](mailto:licensing@phaserai.com)

### Contributor License Agreement
By contributing to this project, you agree that your contributions will be licensed under the same terms as the project.

---

**Built with ❤️ for constructed language creators worldwide**

*PhaserAI empowers linguists, writers, and world-builders to create rich, phonologically-consistent constructed languages with enterprise-grade reliability, comprehensive backup systems, and automated disaster recovery capabilities.*
