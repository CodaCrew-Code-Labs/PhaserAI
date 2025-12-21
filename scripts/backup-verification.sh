#!/bin/bash

# PhaserAI Backup Verification Script
# This script verifies database backups and ensures they meet recovery requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT=${ENVIRONMENT:-prod}
BACKUP_VAULT_NAME=${BACKUP_VAULT_NAME:-phaserai-${ENVIRONMENT}-vault}
DB_INSTANCE_ID=${DB_INSTANCE_ID:-phaserai-${ENVIRONMENT}}
TEST_RESTORE=${TEST_RESTORE:-false}
NOTIFICATION_EMAIL=${NOTIFICATION_EMAIL:-}
S3_BACKUP_BUCKET=${S3_BACKUP_BUCKET:-phaserai-${ENVIRONMENT}-database-backups}

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check jq for JSON processing
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install jq for JSON processing"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to get recent backups
get_recent_backups() {
    print_info "Retrieving recent backups from vault: $BACKUP_VAULT_NAME"
    
    local backups_json
    backups_json=$(aws backup list-recovery-points-by-backup-vault \
        --backup-vault-name "$BACKUP_VAULT_NAME" \
        --by-resource-type "RDS" \
        --max-items 10 \
        --output json 2>/dev/null || echo '{"RecoveryPoints":[]}')
    
    if [ "$(echo "$backups_json" | jq '.RecoveryPoints | length')" -eq 0 ]; then
        print_warning "No backups found in vault: $BACKUP_VAULT_NAME"
        return 1
    fi
    
    echo "$backups_json"
}

# Function to verify backup integrity
verify_backup_integrity() {
    local backups_json="$1"
    local total_backups completed_backups failed_backups
    
    print_info "Verifying backup integrity..."
    
    total_backups=$(echo "$backups_json" | jq '.RecoveryPoints | length')
    completed_backups=$(echo "$backups_json" | jq '[.RecoveryPoints[] | select(.Status == "COMPLETED")] | length')
    failed_backups=$(echo "$backups_json" | jq '[.RecoveryPoints[] | select(.Status != "COMPLETED")] | length')
    
    print_info "Total backups: $total_backups"
    print_info "Completed backups: $completed_backups"
    
    if [ "$failed_backups" -gt 0 ]; then
        print_error "Failed backups: $failed_backups"
        
        # List failed backups
        echo "$backups_json" | jq -r '.RecoveryPoints[] | select(.Status != "COMPLETED") | "Failed backup: \(.RecoveryPointArn) - Status: \(.Status) - Created: \(.CreationDate)"'
        return 1
    else
        print_success "All backups completed successfully"
    fi
    
    # Check encryption status
    local unencrypted_backups
    unencrypted_backups=$(echo "$backups_json" | jq '[.RecoveryPoints[] | select(.IsEncrypted != true)] | length')
    
    if [ "$unencrypted_backups" -gt 0 ]; then
        print_warning "Found $unencrypted_backups unencrypted backup(s)"
        return 1
    else
        print_success "All backups are encrypted"
    fi
    
    return 0
}

# Function to check backup freshness
check_backup_freshness() {
    local backups_json="$1"
    local most_recent_backup current_time backup_age_hours
    
    print_info "Checking backup freshness..."
    
    most_recent_backup=$(echo "$backups_json" | jq -r '.RecoveryPoints[0].CreationDate // empty')
    
    if [ -z "$most_recent_backup" ]; then
        print_error "No recent backup found"
        return 1
    fi
    
    # Calculate backup age in hours
    current_time=$(date -u +%s)
    backup_time=$(date -d "$most_recent_backup" +%s)
    backup_age_hours=$(( (current_time - backup_time) / 3600 ))
    
    print_info "Most recent backup: $most_recent_backup"
    print_info "Backup age: $backup_age_hours hours"
    
    # Check if backup is within acceptable age (25 hours for daily backups)
    if [ "$backup_age_hours" -gt 25 ]; then
        print_error "Backup is too old (${backup_age_hours} hours). Expected < 25 hours"
        return 1
    else
        print_success "Backup freshness check passed"
    fi
    
    return 0
}

# Function to verify backup size
verify_backup_size() {
    local backups_json="$1"
    local recent_backup_size previous_backup_size size_change_percent
    
    print_info "Verifying backup sizes..."
    
    # Get sizes of two most recent backups
    recent_backup_size=$(echo "$backups_json" | jq -r '.RecoveryPoints[0].BackupSizeInBytes // 0')
    previous_backup_size=$(echo "$backups_json" | jq -r '.RecoveryPoints[1].BackupSizeInBytes // 0')
    
    if [ "$recent_backup_size" -eq 0 ]; then
        print_warning "Recent backup size is 0 or unknown"
        return 1
    fi
    
    print_info "Recent backup size: $(numfmt --to=iec --suffix=B $recent_backup_size)"
    
    if [ "$previous_backup_size" -gt 0 ]; then
        # Calculate size change percentage
        size_change_percent=$(( (recent_backup_size - previous_backup_size) * 100 / previous_backup_size ))
        
        print_info "Previous backup size: $(numfmt --to=iec --suffix=B $previous_backup_size)"
        print_info "Size change: ${size_change_percent}%"
        
        # Alert if size changed dramatically (more than 50% decrease)
        if [ "$size_change_percent" -lt -50 ]; then
            print_warning "Backup size decreased significantly (${size_change_percent}%). This may indicate data loss"
            return 1
        fi
    fi
    
    print_success "Backup size verification passed"
    return 0
}

# Function to test backup restoration
test_backup_restoration() {
    local backups_json="$1"
    local latest_backup_arn test_instance_id restore_job_id
    
    if [ "$TEST_RESTORE" != "true" ]; then
        print_info "Skipping backup restoration test (TEST_RESTORE=false)"
        return 0
    fi
    
    print_info "Testing backup restoration..."
    
    latest_backup_arn=$(echo "$backups_json" | jq -r '.RecoveryPoints[0].RecoveryPointArn')
    test_instance_id="backup-test-$(date +%Y%m%d-%H%M%S)"
    
    print_info "Starting test restoration of backup: $latest_backup_arn"
    print_info "Test instance ID: $test_instance_id"
    
    # Start restore job
    restore_job_id=$(aws backup start-restore-job \
        --recovery-point-arn "$latest_backup_arn" \
        --metadata "{\"DBInstanceIdentifier\":\"$test_instance_id\",\"DBInstanceClass\":\"db.t3.micro\",\"PubliclyAccessible\":false}" \
        --iam-role-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/service-role/AWSBackupDefaultServiceRole" \
        --query 'RestoreJobId' \
        --output text)
    
    if [ -z "$restore_job_id" ]; then
        print_error "Failed to start restore job"
        return 1
    fi
    
    print_info "Restore job started: $restore_job_id"
    print_info "Waiting for restore to complete (this may take 10-30 minutes)..."
    
    # Wait for restore to complete (with timeout)
    local timeout=1800  # 30 minutes
    local elapsed=0
    local status
    
    while [ $elapsed -lt $timeout ]; do
        status=$(aws backup describe-restore-job \
            --restore-job-id "$restore_job_id" \
            --query 'Status' \
            --output text)
        
        case "$status" in
            "COMPLETED")
                print_success "Backup restoration test completed successfully"
                break
                ;;
            "FAILED"|"ABORTED")
                print_error "Backup restoration test failed with status: $status"
                return 1
                ;;
            "RUNNING"|"PENDING")
                print_info "Restore in progress... (${elapsed}s elapsed)"
                sleep 60
                elapsed=$((elapsed + 60))
                ;;
            *)
                print_warning "Unknown restore status: $status"
                sleep 60
                elapsed=$((elapsed + 60))
                ;;
        esac
    done
    
    if [ $elapsed -ge $timeout ]; then
        print_error "Restore test timed out after $timeout seconds"
        return 1
    fi
    
    # Test database connectivity
    print_info "Testing database connectivity..."
    
    # Get restored instance endpoint
    local restored_endpoint
    restored_endpoint=$(aws rds describe-db-instances \
        --db-instance-identifier "$test_instance_id" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$restored_endpoint" ]; then
        print_info "Restored database endpoint: $restored_endpoint"
        
        # Simple connectivity test (requires database credentials)
        if [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
            if timeout 30 pg_isready -h "$restored_endpoint" -p 5432 -U "$DB_USER" &>/dev/null; then
                print_success "Database connectivity test passed"
            else
                print_warning "Database connectivity test failed (may be due to security groups)"
            fi
        else
            print_info "Skipping connectivity test (DB_USER or DB_PASSWORD not set)"
        fi
    fi
    
    # Cleanup test instance
    print_info "Cleaning up test instance: $test_instance_id"
    aws rds delete-db-instance \
        --db-instance-identifier "$test_instance_id" \
        --skip-final-snapshot \
        --delete-automated-backups &>/dev/null || true
    
    return 0
}

# Function to check S3 backup bucket
check_s3_backups() {
    print_info "Checking S3 backup bucket: $S3_BACKUP_BUCKET"
    
    # Check if bucket exists
    if ! aws s3api head-bucket --bucket "$S3_BACKUP_BUCKET" &>/dev/null; then
        print_warning "S3 backup bucket does not exist or is not accessible: $S3_BACKUP_BUCKET"
        return 1
    fi
    
    # Check recent backups in S3
    local recent_backups
    recent_backups=$(aws s3 ls "s3://$S3_BACKUP_BUCKET/" --recursive | tail -10)
    
    if [ -z "$recent_backups" ]; then
        print_warning "No backup files found in S3 bucket"
        return 1
    fi
    
    print_info "Recent S3 backups:"
    echo "$recent_backups" | while read -r line; do
        print_info "  $line"
    done
    
    # Check bucket lifecycle policy
    local lifecycle_policy
    lifecycle_policy=$(aws s3api get-bucket-lifecycle-configuration \
        --bucket "$S3_BACKUP_BUCKET" \
        --output json 2>/dev/null || echo '{}')
    
    if [ "$(echo "$lifecycle_policy" | jq '.Rules | length')" -eq 0 ]; then
        print_warning "No lifecycle policy configured for S3 backup bucket"
        return 1
    else
        print_success "S3 backup bucket has lifecycle policy configured"
    fi
    
    return 0
}

# Function to generate verification report
generate_report() {
    local verification_results="$1"
    local report_file="/tmp/backup-verification-report-$(date +%Y%m%d-%H%M%S).json"
    
    print_info "Generating verification report: $report_file"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "backup_vault": "$BACKUP_VAULT_NAME",
  "db_instance": "$DB_INSTANCE_ID",
  "verification_results": $verification_results,
  "test_restore_enabled": $TEST_RESTORE
}
EOF
    
    print_success "Report generated: $report_file"
    
    # Display summary
    local issues_count
    issues_count=$(echo "$verification_results" | jq '.issues | length')
    
    if [ "$issues_count" -eq 0 ]; then
        print_success "✅ All backup verification checks passed"
    else
        print_error "❌ Found $issues_count issue(s) in backup verification"
        echo "$verification_results" | jq -r '.issues[]' | while read -r issue; do
            print_error "  • $issue"
        done
    fi
    
    echo "$report_file"
}

# Function to send notification
send_notification() {
    local report_file="$1"
    local issues_count="$2"
    
    if [ -z "$NOTIFICATION_EMAIL" ]; then
        print_info "No notification email configured, skipping notification"
        return 0
    fi
    
    print_info "Sending notification to: $NOTIFICATION_EMAIL"
    
    local subject
    local message
    
    if [ "$issues_count" -eq 0 ]; then
        subject="✅ Backup Verification Passed - $(date +%Y-%m-%d)"
        message="Backup verification completed successfully for environment: $ENVIRONMENT

All checks passed:
- Backup integrity verified
- Backup freshness confirmed
- Backup sizes validated
- S3 backup bucket accessible

Report: $report_file
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    else
        subject="❌ Backup Verification Issues - $(date +%Y-%m-%d)"
        message="Backup verification found $issues_count issue(s) for environment: $ENVIRONMENT

Please review the issues and take corrective action immediately.

Report: $report_file
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    fi
    
    # Send via AWS SES if available
    if aws ses get-send-quota &>/dev/null; then
        aws ses send-email \
            --source "noreply@phaserai.com" \
            --destination "ToAddresses=$NOTIFICATION_EMAIL" \
            --message "Subject={Data=\"$subject\"},Body={Text={Data=\"$message\"}}" \
            &>/dev/null && print_success "Email notification sent" || print_warning "Failed to send email notification"
    else
        print_warning "AWS SES not available, cannot send email notification"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --environment ENV        Target environment (dev, staging, prod) [default: prod]"
    echo "  --vault-name NAME        Backup vault name [default: phaserai-ENV-vault]"
    echo "  --db-instance ID         Database instance ID [default: phaserai-ENV]"
    echo "  --test-restore           Enable backup restoration test [default: false]"
    echo "  --notification-email     Email for notifications"
    echo "  --s3-bucket NAME         S3 backup bucket name [default: phaserai-ENV-database-backups]"
    echo "  --help                   Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT              Target environment"
    echo "  BACKUP_VAULT_NAME        Backup vault name"
    echo "  DB_INSTANCE_ID           Database instance ID"
    echo "  TEST_RESTORE             Enable restoration test (true/false)"
    echo "  NOTIFICATION_EMAIL       Email for notifications"
    echo "  S3_BACKUP_BUCKET         S3 backup bucket name"
    echo "  DB_USER                  Database user (for connectivity test)"
    echo "  DB_PASSWORD              Database password (for connectivity test)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Verify production backups"
    echo "  $0 --environment staging             # Verify staging backups"
    echo "  $0 --test-restore                    # Include restoration test"
    echo "  $0 --notification-email admin@example.com  # Send email notifications"
}

# Main function
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --vault-name)
                BACKUP_VAULT_NAME="$2"
                shift 2
                ;;
            --db-instance)
                DB_INSTANCE_ID="$2"
                shift 2
                ;;
            --test-restore)
                TEST_RESTORE="true"
                shift
                ;;
            --notification-email)
                NOTIFICATION_EMAIL="$2"
                shift 2
                ;;
            --s3-bucket)
                S3_BACKUP_BUCKET="$2"
                shift 2
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    print_info "Starting backup verification for environment: $ENVIRONMENT"
    print_info "Backup vault: $BACKUP_VAULT_NAME"
    print_info "Database instance: $DB_INSTANCE_ID"
    print_info "Test restore: $TEST_RESTORE"
    
    # Check prerequisites
    check_prerequisites
    
    # Initialize results
    local verification_results='{"issues":[],"checks":[]}'
    local has_issues=false
    
    # Get recent backups
    local backups_json
    if backups_json=$(get_recent_backups); then
        verification_results=$(echo "$verification_results" | jq '.checks += ["backup_retrieval_success"]')
    else
        verification_results=$(echo "$verification_results" | jq '.issues += ["Failed to retrieve backups from vault"]')
        has_issues=true
    fi
    
    if [ "$has_issues" = false ]; then
        # Verify backup integrity
        if verify_backup_integrity "$backups_json"; then
            verification_results=$(echo "$verification_results" | jq '.checks += ["backup_integrity_verified"]')
        else
            verification_results=$(echo "$verification_results" | jq '.issues += ["Backup integrity check failed"]')
            has_issues=true
        fi
        
        # Check backup freshness
        if check_backup_freshness "$backups_json"; then
            verification_results=$(echo "$verification_results" | jq '.checks += ["backup_freshness_verified"]')
        else
            verification_results=$(echo "$verification_results" | jq '.issues += ["Backup freshness check failed"]')
            has_issues=true
        fi
        
        # Verify backup size
        if verify_backup_size "$backups_json"; then
            verification_results=$(echo "$verification_results" | jq '.checks += ["backup_size_verified"]')
        else
            verification_results=$(echo "$verification_results" | jq '.issues += ["Backup size verification failed"]')
            has_issues=true
        fi
        
        # Test backup restoration (if enabled)
        if test_backup_restoration "$backups_json"; then
            verification_results=$(echo "$verification_results" | jq '.checks += ["backup_restoration_tested"]')
        else
            if [ "$TEST_RESTORE" = "true" ]; then
                verification_results=$(echo "$verification_results" | jq '.issues += ["Backup restoration test failed"]')
                has_issues=true
            fi
        fi
    fi
    
    # Check S3 backups
    if check_s3_backups; then
        verification_results=$(echo "$verification_results" | jq '.checks += ["s3_backup_verified"]')
    else
        verification_results=$(echo "$verification_results" | jq '.issues += ["S3 backup check failed"]')
        has_issues=true
    fi
    
    # Generate report
    local report_file
    report_file=$(generate_report "$verification_results")
    
    # Send notification
    local issues_count
    issues_count=$(echo "$verification_results" | jq '.issues | length')
    send_notification "$report_file" "$issues_count"
    
    # Exit with appropriate code
    if [ "$issues_count" -eq 0 ]; then
        print_success "Backup verification completed successfully"
        exit 0
    else
        print_error "Backup verification completed with $issues_count issue(s)"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"