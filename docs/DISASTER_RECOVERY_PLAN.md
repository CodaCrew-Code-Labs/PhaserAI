# PhaserAI Disaster Recovery Plan

This document outlines the comprehensive disaster recovery procedures for the PhaserAI application, covering database recovery, infrastructure restoration, and business continuity.

## 📋 Table of Contents

- [Overview](#overview)
- [Recovery Objectives](#recovery-objectives)
- [Backup Strategy](#backup-strategy)
- [Recovery Procedures](#recovery-procedures)
- [Infrastructure Recovery](#infrastructure-recovery)
- [Data Recovery](#data-recovery)
- [Testing Procedures](#testing-procedures)
- [Communication Plan](#communication-plan)
- [Post-Recovery Actions](#post-recovery-actions)

## 🎯 Overview

### Disaster Scenarios Covered
- **Database Corruption**: RDS instance failure or data corruption
- **Regional Outage**: AWS region unavailability
- **Infrastructure Failure**: CDK stack corruption or deletion
- **Security Breach**: Unauthorized access or data compromise
- **Human Error**: Accidental deletion or misconfiguration
- **Natural Disasters**: Physical infrastructure damage

### Recovery Team Roles
- **Incident Commander**: Overall recovery coordination
- **Database Administrator**: Database recovery and validation
- **Infrastructure Engineer**: AWS infrastructure restoration
- **Security Officer**: Security assessment and remediation
- **Communications Lead**: Stakeholder communication

## 📊 Recovery Objectives

### Production Environment
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Data Loss Tolerance**: Maximum 1 hour of data
- **Availability Target**: 99.9% uptime

### Staging Environment
- **RTO**: 8 hours
- **RPO**: 24 hours
- **Data Loss Tolerance**: Maximum 24 hours of data
- **Availability Target**: 99% uptime

### Development Environment
- **RTO**: 24 hours
- **RPO**: 7 days
- **Data Loss Tolerance**: Maximum 7 days of data
- **Availability Target**: 95% uptime

## 💾 Backup Strategy

### Automated Backups

#### AWS Backup Service
```yaml
Production Schedule:
  - Daily: 2:00 AM UTC (35-day retention)
  - Weekly: Sunday 1:00 AM UTC (1-year retention)
  - Monthly: 1st day 12:00 AM UTC (7-year retention)

Staging Schedule:
  - Daily: 3:00 AM UTC (7-day retention)

Development Schedule:
  - Daily: 4:00 AM UTC (3-day retention)
```

#### RDS Automated Backups
- **Point-in-time Recovery**: Enabled with 7-day retention (production)
- **Backup Window**: 1:00-2:00 AM UTC
- **Maintenance Window**: Sunday 2:00-3:00 AM UTC
- **Multi-AZ**: Enabled for production
- **Encryption**: Enabled for all environments

#### Manual Backups
- **Pre-deployment**: Before major releases
- **Pre-maintenance**: Before infrastructure changes
- **On-demand**: Via migration scripts or AWS console

### Backup Verification

#### Automated Verification (Daily at 6:00 AM UTC)
```python
# Verification checks performed:
- Backup completion status
- Backup file integrity
- Backup age (must be < 25 hours)
- Encryption status
- Size validation
```

#### Manual Verification (Weekly)
```bash
# Test backup restoration
aws backup start-restore-job \
  --recovery-point-arn arn:aws:backup:region:account:recovery-point:vault/backup-id \
  --metadata '{"DBInstanceIdentifier":"test-restore-instance"}'
```

## 🔄 Recovery Procedures

### 1. Incident Detection and Assessment

#### Automated Monitoring
- CloudWatch alarms for database connectivity
- Application health checks
- Backup verification alerts
- Security monitoring alerts

#### Manual Detection
- User reports of service unavailability
- Monitoring dashboard alerts
- Performance degradation reports

#### Initial Assessment Checklist
- [ ] Confirm incident scope and impact
- [ ] Identify affected systems and users
- [ ] Determine if this is a disaster recovery scenario
- [ ] Activate incident response team
- [ ] Begin incident documentation

### 2. Immediate Response Actions

#### Communication
```bash
# Send initial alert
aws sns publish \
  --topic-arn arn:aws:sns:region:account:disaster-recovery-alerts \
  --subject "INCIDENT: PhaserAI Service Disruption" \
  --message "Incident detected at $(date). Recovery team activated."
```

#### Service Status
- Update status page
- Notify key stakeholders
- Activate communication plan

#### Data Protection
- Stop all write operations if possible
- Preserve current state for forensic analysis
- Document current system status

### 3. Database Recovery Procedures

#### Scenario A: Database Corruption (Minor)
```bash
# 1. Stop application traffic
aws elbv2 modify-target-group \
  --target-group-arn $TARGET_GROUP_ARN \
  --health-check-enabled false

# 2. Create immediate backup
aws rds create-db-snapshot \
  --db-instance-identifier phaserai-prod \
  --db-snapshot-identifier emergency-backup-$(date +%Y%m%d-%H%M%S)

# 3. Restore from latest automated backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier phaserai-prod-restored \
  --db-snapshot-identifier latest-automated-snapshot

# 4. Update DNS/connection strings
# 5. Restart application services
# 6. Verify data integrity
```

#### Scenario B: Complete Database Loss
```bash
# 1. Identify latest valid backup
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name phaserai-prod-vault \
  --by-resource-arn arn:aws:rds:region:account:db:phaserai-prod

# 2. Restore from AWS Backup
aws backup start-restore-job \
  --recovery-point-arn $RECOVERY_POINT_ARN \
  --metadata '{
    "DBInstanceIdentifier": "phaserai-prod-restored",
    "DBInstanceClass": "db.t3.small",
    "MultiAZ": true,
    "PubliclyAccessible": false
  }'

# 3. Monitor restoration progress
aws backup describe-restore-job --restore-job-id $RESTORE_JOB_ID

# 4. Update infrastructure to point to restored database
# 5. Run data validation procedures
```

#### Scenario C: Point-in-Time Recovery
```bash
# Restore to specific point in time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier phaserai-prod \
  --target-db-instance-identifier phaserai-prod-pitr \
  --restore-time 2025-01-01T10:30:00.000Z \
  --db-subnet-group-name phaserai-prod-subnet-group \
  --vpc-security-group-ids sg-12345678
```

### 4. Infrastructure Recovery

#### CDK Stack Recovery
```bash
# 1. Verify CDK state
cd infra
cdk diff

# 2. Restore from source control
git checkout main
git pull origin main

# 3. Redeploy infrastructure
cdk deploy --all --require-approval never

# 4. Verify all resources are created correctly
aws cloudformation describe-stacks \
  --stack-name phaserai-prod-database-prod
```

#### Lambda Function Recovery
```bash
# 1. Redeploy Lambda functions
cdk deploy phaserai-prod-api-prod

# 2. Test function connectivity
aws lambda invoke \
  --function-name phaserai-prod-api-HealthFunction \
  --payload '{}' \
  response.json

# 3. Verify database connectivity
aws lambda invoke \
  --function-name phaserai-prod-api-UsersFunction \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  response.json
```

#### API Gateway Recovery
```bash
# 1. Verify API Gateway deployment
aws apigateway get-rest-apis

# 2. Test API endpoints
curl -X GET https://api-id.execute-api.region.amazonaws.com/prod/health

# 3. Update DNS if necessary
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://dns-update.json
```

### 5. Application Recovery

#### Frontend Deployment
```bash
# 1. Build application
npm run build

# 2. Deploy to S3/CloudFront
aws s3 sync dist/ s3://phaserai-prod-frontend/

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

#### Configuration Recovery
```bash
# 1. Restore environment variables
aws ssm get-parameters-by-path \
  --path "/phaserai/prod/" \
  --recursive

# 2. Update application configuration
# 3. Restart application services
```

## 🧪 Testing Procedures

### Monthly DR Testing

#### Database Recovery Test
```bash
#!/bin/bash
# Monthly database recovery test

# 1. Create test restoration
RESTORE_ID=$(aws backup start-restore-job \
  --recovery-point-arn $LATEST_BACKUP_ARN \
  --metadata '{"DBInstanceIdentifier":"dr-test-'$(date +%Y%m%d)'"}' \
  --query 'RestoreJobId' --output text)

# 2. Wait for completion
aws backup wait restore-job-completed --restore-job-id $RESTORE_ID

# 3. Test database connectivity
psql -h dr-test-$(date +%Y%m%d).region.rds.amazonaws.com \
     -U phaserai_admin -d phaserai_prod -c "SELECT COUNT(*) FROM app_8b514_users;"

# 4. Cleanup test instance
aws rds delete-db-instance \
  --db-instance-identifier dr-test-$(date +%Y%m%d) \
  --skip-final-snapshot
```

#### Infrastructure Recovery Test
```bash
#!/bin/bash
# Quarterly infrastructure recovery test

# 1. Deploy to test environment
cd infra
cdk deploy --all --context environment=dr-test

# 2. Run application tests
npm run test:integration

# 3. Cleanup test environment
cdk destroy --all --context environment=dr-test --force
```

### Annual DR Drill

#### Full Disaster Simulation
1. **Simulate Regional Outage**
   - Deploy to alternate region
   - Test cross-region backup restoration
   - Validate DNS failover

2. **Complete Infrastructure Loss**
   - Delete all CDK stacks
   - Restore from source control
   - Validate data integrity

3. **Security Breach Simulation**
   - Rotate all credentials
   - Restore from clean backup
   - Implement security patches

## 📞 Communication Plan

### Stakeholder Notification

#### Internal Team
```bash
# Slack notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 DISASTER RECOVERY ACTIVATED: PhaserAI incident in progress. Recovery team mobilized."}' \
  $SLACK_WEBHOOK_URL

# Email notification
aws ses send-email \
  --source noreply@phaserai.com \
  --destination ToAddresses=team@phaserai.com \
  --message Subject={Data="DR Activation"},Body={Text={Data="Disaster recovery procedures activated..."}}
```

#### External Communication
- **Status Page**: Update with incident details
- **Customer Email**: Notify affected users
- **Social Media**: Post service status updates
- **Support Team**: Brief on incident and expected resolution

### Communication Templates

#### Initial Incident Report
```
Subject: [INCIDENT] PhaserAI Service Disruption - Investigation Underway

We are currently investigating reports of service disruption affecting PhaserAI.

Incident Details:
- Start Time: [TIME]
- Affected Services: [SERVICES]
- Impact: [DESCRIPTION]
- Status: Investigating

We will provide updates every 30 minutes until resolved.

Next Update: [TIME]
```

#### Recovery Progress Update
```
Subject: [UPDATE] PhaserAI Recovery in Progress

Recovery Update:
- Current Status: [STATUS]
- Progress: [PERCENTAGE]%
- ETA: [TIME]
- Actions Taken: [ACTIONS]

We continue to work on full service restoration.

Next Update: [TIME]
```

#### Resolution Notification
```
Subject: [RESOLVED] PhaserAI Service Fully Restored

Service has been fully restored as of [TIME].

Incident Summary:
- Duration: [DURATION]
- Root Cause: [CAUSE]
- Resolution: [ACTIONS]
- Data Loss: [NONE/MINIMAL/DETAILS]

Post-incident review will be conducted and shared within 48 hours.
```

## ✅ Post-Recovery Actions

### Immediate Actions (0-4 hours)
- [ ] Verify all services are operational
- [ ] Confirm data integrity
- [ ] Monitor system performance
- [ ] Update stakeholders on resolution
- [ ] Document recovery actions taken

### Short-term Actions (4-24 hours)
- [ ] Conduct preliminary root cause analysis
- [ ] Review and update monitoring alerts
- [ ] Validate backup integrity
- [ ] Check security posture
- [ ] Gather feedback from recovery team

### Long-term Actions (1-7 days)
- [ ] Complete detailed post-incident review
- [ ] Update disaster recovery procedures
- [ ] Implement preventive measures
- [ ] Conduct lessons learned session
- [ ] Update documentation and runbooks

### Post-Incident Review Template

#### Incident Summary
- **Incident ID**: [ID]
- **Start Time**: [TIME]
- **End Time**: [TIME]
- **Duration**: [DURATION]
- **Severity**: [1-5]
- **Services Affected**: [LIST]

#### Timeline of Events
| Time | Event | Action Taken | Owner |
|------|-------|--------------|-------|
| [TIME] | [EVENT] | [ACTION] | [PERSON] |

#### Root Cause Analysis
- **Primary Cause**: [DESCRIPTION]
- **Contributing Factors**: [LIST]
- **Detection Method**: [HOW DISCOVERED]
- **Time to Detection**: [DURATION]

#### Recovery Analysis
- **RTO Achieved**: [TIME] (Target: 4 hours)
- **RPO Achieved**: [TIME] (Target: 1 hour)
- **Data Loss**: [AMOUNT]
- **Recovery Method**: [DESCRIPTION]

#### Action Items
| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| [ACTION] | [PERSON] | [DATE] | [HIGH/MED/LOW] |

#### Lessons Learned
- **What Went Well**: [LIST]
- **What Could Be Improved**: [LIST]
- **Process Changes**: [LIST]
- **Technology Changes**: [LIST]

## 📚 Reference Information

### Emergency Contacts
- **Incident Commander**: [NAME] - [PHONE] - [EMAIL]
- **Database Administrator**: [NAME] - [PHONE] - [EMAIL]
- **Infrastructure Engineer**: [NAME] - [PHONE] - [EMAIL]
- **Security Officer**: [NAME] - [PHONE] - [EMAIL]
- **AWS Support**: [SUPPORT CASE URL]

### Key Resources
- **AWS Console**: https://console.aws.amazon.com
- **Backup Vault**: phaserai-prod-vault
- **S3 Backup Bucket**: phaserai-prod-database-backups
- **CloudWatch Dashboard**: [URL]
- **Status Page**: [URL]

### Recovery Scripts Location
- **GitHub Repository**: https://github.com/org/phaserai
- **Scripts Directory**: `/scripts/disaster-recovery/`
- **Documentation**: `/docs/`

### Backup Locations
- **Primary**: AWS Backup Vault (us-east-1)
- **Secondary**: S3 Cross-Region Replication (us-west-2)
- **Tertiary**: Glacier Deep Archive (long-term retention)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-01  
**Next Review**: 2025-04-01  
**Owner**: Infrastructure Team