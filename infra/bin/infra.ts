#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CognitoAuthStack } from '../lib/cognito-auth-stack';
import { ProductionDatabaseStack } from '../lib/production-database-stack';
import { ProductionApiStack } from '../lib/production-api-stack';
import { BastionStack } from '../lib/bastion-stack';
import { MigrationStack } from '../lib/migration-stack';
import { BackupStack } from '../lib/backup-stack';
import { EcrStack } from '../lib/ecr-stack';
import { Ec2WebStack } from '../lib/ec2-web-stack';

const app = new cdk.App();

// Get configuration from context or environment
const appName = app.node.tryGetContext('appName') || 'phaserai';
const environment = app.node.tryGetContext('environment') || 'dev';
const notificationEmail = app.node.tryGetContext('notificationEmail') || '';

// Common environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Google OAuth credentials (optional - pass via context or leave empty)
const googleClientId = app.node.tryGetContext('googleClientId') || '';
const googleClientSecret = app.node.tryGetContext('googleClientSecret') || '';

// Callback URLs for your app
const callbackUrls = app.node.tryGetContext('callbackUrls') || [
  'http://localhost:5173/dashboard',
  'http://localhost:3000/dashboard',
];
const logoutUrls = app.node.tryGetContext('logoutUrls') || [
  'http://localhost:5173/',
  'http://localhost:3000/',
];

// Create ECR stack first (no dependencies)
const ecrStack = new EcrStack(app, `${appName}-ecr-${environment}`, {
  appName,
  environment,
  env,
});

// Create production database stack
const productionDatabaseStack = new ProductionDatabaseStack(app, `${appName}-prod-database-${environment}`, {
  appName,
  environment,
  env,
});

// Create backup stack
const backupStack = new BackupStack(app, `${appName}-backup-${environment}`, {
  database: productionDatabaseStack.database,
  environment,
  appName,
  notificationEmail,
  env,
});
backupStack.addDependency(productionDatabaseStack);

// Create migration stack
const migrationStack = new MigrationStack(app, `${appName}-migration-${environment}`, {
  vpc: productionDatabaseStack.vpc,
  databaseSecretArn: productionDatabaseStack.databaseSecret.secretArn,
  databaseEndpoint: productionDatabaseStack.database.instanceEndpoint.hostname,
  lambdaSecurityGroup: productionDatabaseStack.lambdaSecurityGroup,
  env,
});
migrationStack.addDependency(productionDatabaseStack);

// Create bastion stack for database access
new BastionStack(app, `${appName}-prod-bastion-${environment}`, {
  vpc: productionDatabaseStack.vpc,
  databaseSecurityGroup: productionDatabaseStack.databaseSecurityGroup,
  databaseEndpoint: productionDatabaseStack.database.instanceEndpoint.hostname,
  databaseSecretArn: productionDatabaseStack.databaseSecret.secretArn,
  env,
});

// Create production API stack
const productionApiStack = new ProductionApiStack(app, `${appName}-prod-api-${environment}`, {
  vpc: productionDatabaseStack.vpc,
  databaseSecretArn: productionDatabaseStack.databaseSecret.secretArn,
  databaseEndpoint: productionDatabaseStack.database.instanceEndpoint.hostname,
  lambdaSecurityGroup: productionDatabaseStack.lambdaSecurityGroup,
  env,
});

// API depends on database and migrations
productionApiStack.addDependency(productionDatabaseStack);
productionApiStack.addDependency(migrationStack);

// Create EC2 web hosting stack
const ec2WebStack = new Ec2WebStack(app, `${appName}-web-${environment}`, {
  appName,
  environment,
  vpc: productionDatabaseStack.vpc,
  ecrRepository: ecrStack.repository,
  databaseSecretArn: productionDatabaseStack.databaseSecret.secretArn,
  databaseEndpoint: productionDatabaseStack.database.instanceEndpoint.hostname,
  databaseSecurityGroupId: productionDatabaseStack.databaseSecurityGroup.securityGroupId,
  env,
});

// Web stack depends on database and ECR
ec2WebStack.addDependency(productionDatabaseStack);
ec2WebStack.addDependency(ecrStack);
// Temporarily removed migration dependency due to psycopg2 layer issue
// ec2WebStack.addDependency(migrationStack);

// Create auth stack
new CognitoAuthStack(app, `${appName}-auth-${environment}`, {
  appName,
  environment,
  googleClientId,
  googleClientSecret,
  callbackUrls,
  logoutUrls,
  env,
});
