import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface BackupStackProps extends cdk.StackProps {
  database: rds.DatabaseInstance;
  environment: string;
  appName: string;
  notificationEmail?: string;
}

export class BackupStack extends cdk.Stack {
  public readonly backupVault: backup.BackupVault;
  public readonly backupBucket: s3.Bucket;
  public readonly verificationFunction: lambda.Function;
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: BackupStackProps) {
    super(scope, id, props);

    const { database, environment, appName, notificationEmail } = props;

    // ============================================================================
    // S3 BUCKET FOR BACKUP STORAGE
    // ============================================================================

    this.backupBucket = new s3.Bucket(this, 'BackupBucket', {
      bucketName: `${appName}-${environment}-database-backups`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [
        {
          id: 'backup-lifecycle',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(180),
            },
          ],
          expiration: environment === 'prod' 
            ? cdk.Duration.days(2555) // 7 years for production
            : cdk.Duration.days(365),   // 1 year for dev/staging
        },
      ],
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // ============================================================================
    // AWS BACKUP VAULT AND PLAN
    // ============================================================================

    // Create backup vault with encryption
    this.backupVault = new backup.BackupVault(this, 'DatabaseBackupVault', {
      backupVaultName: `${appName}-${environment}-vault`,
      encryptionKey: undefined, // Use default AWS managed key
      accessPolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            principals: [new iam.AnyPrincipal()],
            actions: ['backup:DeleteRecoveryPoint'],
            resources: ['*'],
            conditions: {
              StringNotEquals: {
                'aws:PrincipalServiceName': ['backup.amazonaws.com'],
              },
            },
          }),
        ],
      }),
    });

    // Create backup plan with different schedules based on environment
    const backupPlan = new backup.BackupPlan(this, 'DatabaseBackupPlan', {
      backupPlanName: `${appName}-${environment}-backup-plan`,
      backupVault: this.backupVault,
    });

    // Production backup schedule
    if (environment === 'prod') {
      // Daily backups at 2 AM UTC
      backupPlan.addRule(new backup.BackupPlanRule({
        ruleName: 'DailyBackups',
        scheduleExpression: events.Schedule.cron({ hour: '2', minute: '0' }),
        startWindow: cdk.Duration.hours(1),
        completionWindow: cdk.Duration.hours(2),
        deleteAfter: cdk.Duration.days(35), // Keep daily backups for 35 days
        moveToColdStorageAfter: cdk.Duration.days(7),
      }));

      // Weekly backups on Sunday at 1 AM UTC
      backupPlan.addRule(new backup.BackupPlanRule({
        ruleName: 'WeeklyBackups',
        scheduleExpression: events.Schedule.cron({ weekDay: 'SUN', hour: '1', minute: '0' }),
        startWindow: cdk.Duration.hours(1),
        completionWindow: cdk.Duration.hours(3),
        deleteAfter: cdk.Duration.days(365), // Keep weekly backups for 1 year
        moveToColdStorageAfter: cdk.Duration.days(30),
      }));

      // Monthly backups on 1st of month at 12 AM UTC
      backupPlan.addRule(new backup.BackupPlanRule({
        ruleName: 'MonthlyBackups',
        scheduleExpression: events.Schedule.cron({ day: '1', hour: '0', minute: '0' }),
        startWindow: cdk.Duration.hours(2),
        completionWindow: cdk.Duration.hours(4),
        deleteAfter: cdk.Duration.days(2555), // Keep monthly backups for 7 years
        moveToColdStorageAfter: cdk.Duration.days(90),
      }));
    } else {
      // Development/Staging: Daily backups only
      backupPlan.addRule(new backup.BackupPlanRule({
        ruleName: 'DailyBackups',
        scheduleExpression: events.Schedule.cron({ hour: '3', minute: '0' }),
        startWindow: cdk.Duration.hours(1),
        completionWindow: cdk.Duration.hours(2),
        deleteAfter: cdk.Duration.days(7), // Keep for 7 days only
      }));
    }

    // Add database to backup plan
    backupPlan.addSelection('DatabaseSelection', {
      resources: [backup.BackupResource.fromRdsDatabaseInstance(database)],
      allowRestores: true,
    });

    // ============================================================================
    // SNS TOPIC FOR ALERTS
    // ============================================================================

    this.alertTopic = new sns.Topic(this, 'BackupAlertTopic', {
      topicName: `${appName}-${environment}-backup-alerts`,
      displayName: 'PhaserAI Backup Alerts',
    });

    if (notificationEmail) {
      this.alertTopic.addSubscription(
        new subscriptions.EmailSubscription(notificationEmail)
      );
    }

    // ============================================================================
    // BACKUP VERIFICATION LAMBDA
    // ============================================================================

    this.verificationFunction = new lambda.Function(this, 'BackupVerificationFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'backup_verification.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

backup_client = boto3.client('backup')
rds_client = boto3.client('rds')
sns_client = boto3.client('sns')

def handler(event, context):
    """
    Verify database backups and send alerts if issues are found
    """
    try:
        vault_name = event.get('vault_name')
        db_instance_id = event.get('db_instance_id')
        sns_topic_arn = event.get('sns_topic_arn')
        
        if not all([vault_name, db_instance_id, sns_topic_arn]):
            raise ValueError("Missing required parameters")
        
        # Get recent backups
        recent_backups = get_recent_backups(vault_name, db_instance_id)
        
        # Verify backup integrity
        verification_results = verify_backups(recent_backups)
        
        # Check backup freshness
        freshness_check = check_backup_freshness(recent_backups)
        
        # Generate report
        report = generate_verification_report(verification_results, freshness_check)
        
        # Send alerts if issues found
        if report['issues_found']:
            send_alert(sns_topic_arn, report)
        
        logger.info(f"Backup verification completed: {report['summary']}")
        
        return {
            'statusCode': 200,
            'body': json.dumps(report)
        }
        
    except Exception as e:
        logger.error(f"Backup verification failed: {str(e)}")
        send_error_alert(sns_topic_arn, str(e))
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def get_recent_backups(vault_name: str, db_instance_id: str) -> List[Dict]:
    """Get recent backups for the database"""
    try:
        response = backup_client.list_recovery_points_by_backup_vault(
            BackupVaultName=vault_name,
            ByResourceArn=f"arn:aws:rds:*:*:db:{db_instance_id}",
            MaxResults=10
        )
        return response.get('RecoveryPoints', [])
    except Exception as e:
        logger.error(f"Failed to get recent backups: {str(e)}")
        return []

def verify_backups(backups: List[Dict]) -> Dict[str, Any]:
    """Verify backup integrity and completeness"""
    results = {
        'total_backups': len(backups),
        'completed_backups': 0,
        'failed_backups': 0,
        'backup_details': []
    }
    
    for backup in backups:
        backup_detail = {
            'recovery_point_arn': backup['RecoveryPointArn'],
            'creation_date': backup['CreationDate'].isoformat(),
            'status': backup['Status'],
            'size_bytes': backup.get('BackupSizeInBytes', 0),
            'is_encrypted': backup.get('IsEncrypted', False)
        }
        
        if backup['Status'] == 'COMPLETED':
            results['completed_backups'] += 1
            backup_detail['verification_status'] = 'PASSED'
        else:
            results['failed_backups'] += 1
            backup_detail['verification_status'] = 'FAILED'
            backup_detail['failure_reason'] = backup.get('StatusMessage', 'Unknown')
        
        results['backup_details'].append(backup_detail)
    
    return results

def check_backup_freshness(backups: List[Dict]) -> Dict[str, Any]:
    """Check if backups are recent enough"""
    now = datetime.utcnow()
    freshness_threshold = now - timedelta(hours=25)  # Allow 1 hour buffer for daily backups
    
    recent_backups = [
        b for b in backups 
        if b['CreationDate'].replace(tzinfo=None) > freshness_threshold
        and b['Status'] == 'COMPLETED'
    ]
    
    return {
        'has_recent_backup': len(recent_backups) > 0,
        'most_recent_backup': recent_backups[0]['CreationDate'].isoformat() if recent_backups else None,
        'hours_since_last_backup': (now - recent_backups[0]['CreationDate'].replace(tzinfo=None)).total_seconds() / 3600 if recent_backups else None
    }

def generate_verification_report(verification_results: Dict, freshness_check: Dict) -> Dict:
    """Generate comprehensive verification report"""
    issues = []
    
    # Check for failed backups
    if verification_results['failed_backups'] > 0:
        issues.append(f"{verification_results['failed_backups']} backup(s) failed")
    
    # Check backup freshness
    if not freshness_check['has_recent_backup']:
        issues.append("No recent backup found (older than 25 hours)")
    
    # Check if we have any backups at all
    if verification_results['total_backups'] == 0:
        issues.append("No backups found")
    
    return {
        'timestamp': datetime.utcnow().isoformat(),
        'issues_found': len(issues) > 0,
        'issues': issues,
        'summary': f"Verified {verification_results['total_backups']} backups, {verification_results['completed_backups']} completed, {verification_results['failed_backups']} failed",
        'verification_results': verification_results,
        'freshness_check': freshness_check
    }

def send_alert(sns_topic_arn: str, report: Dict):
    """Send alert notification"""
    subject = f"🚨 Database Backup Issues Detected - {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
    
    message = f"""
Database Backup Verification Alert

Issues Found:
{chr(10).join(f"• {issue}" for issue in report['issues'])}

Summary: {report['summary']}

Timestamp: {report['timestamp']}

Please investigate and resolve these backup issues immediately.
    """.strip()
    
    sns_client.publish(
        TopicArn=sns_topic_arn,
        Subject=subject,
        Message=message
    )

def send_error_alert(sns_topic_arn: str, error_message: str):
    """Send error alert"""
    subject = f"❌ Backup Verification Failed - {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
    
    message = f"""
Database Backup Verification Error

The backup verification process failed with the following error:
{error_message}

Please check the CloudWatch logs for more details and resolve the issue.

Timestamp: {datetime.utcnow().isoformat()}
    """.strip()
    
    sns_client.publish(
        TopicArn=sns_topic_arn,
        Subject=subject,
        Message=message
    )
      `),
      timeout: cdk.Duration.minutes(5),
      environment: {
        VAULT_NAME: this.backupVault.backupVaultName,
        DB_INSTANCE_ID: database.instanceIdentifier,
        SNS_TOPIC_ARN: this.alertTopic.topicArn,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Grant permissions to the verification function
    this.verificationFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'backup:ListRecoveryPointsByBackupVault',
        'backup:DescribeRecoveryPoint',
      ],
      resources: [this.backupVault.backupVaultArn, `${this.backupVault.backupVaultArn}/*`],
    }));

    this.verificationFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'rds:DescribeDBInstances',
        'rds:DescribeDBSnapshots',
      ],
      resources: [database.instanceArn],
    }));

    this.alertTopic.grantPublish(this.verificationFunction);

    // ============================================================================
    // SCHEDULED BACKUP VERIFICATION
    // ============================================================================

    // Run verification daily at 6 AM UTC (after backups complete)
    const verificationRule = new events.Rule(this, 'BackupVerificationSchedule', {
      schedule: events.Schedule.cron({ hour: '6', minute: '0' }),
      description: 'Daily backup verification',
    });

    verificationRule.addTarget(new targets.LambdaFunction(this.verificationFunction, {
      event: events.RuleTargetInput.fromObject({
        vault_name: this.backupVault.backupVaultName,
        db_instance_id: database.instanceIdentifier,
        sns_topic_arn: this.alertTopic.topicArn,
      }),
    }));

    // ============================================================================
    // BACKUP FAILURE ALERTS
    // ============================================================================

    // CloudWatch rule for backup job failures
    const backupFailureRule = new events.Rule(this, 'BackupFailureRule', {
      eventPattern: {
        source: ['aws.backup'],
        detailType: ['Backup Job State Change'],
        detail: {
          state: ['FAILED', 'ABORTED', 'EXPIRED'],
        },
      },
    });

    backupFailureRule.addTarget(new targets.SnsTopic(this.alertTopic, {
      message: events.RuleTargetInput.fromText(
        'Backup job failed. Job ID: $.detail.backupJobId, State: $.detail.state, Resource: $.detail.resourceArn'
      ),
    }));

    // ============================================================================
    // OUTPUTS
    // ============================================================================

    new cdk.CfnOutput(this, 'BackupVaultName', {
      value: this.backupVault.backupVaultName,
      description: 'Name of the backup vault',
      exportName: `${appName}-${environment}-backup-vault-name`,
    });

    new cdk.CfnOutput(this, 'BackupBucketName', {
      value: this.backupBucket.bucketName,
      description: 'Name of the backup S3 bucket',
      exportName: `${appName}-${environment}-backup-bucket-name`,
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'ARN of the backup alert SNS topic',
      exportName: `${appName}-${environment}-backup-alert-topic-arn`,
    });

    new cdk.CfnOutput(this, 'VerificationFunctionArn', {
      value: this.verificationFunction.functionArn,
      description: 'ARN of the backup verification function',
      exportName: `${appName}-${environment}-backup-verification-function-arn`,
    });
  }
}