#!/bin/bash

# PhaserAI Disaster Recovery Testing Script
# This script performs comprehensive disaster recovery testing

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
ENVIRONMENT=${ENVIRONMENT:-dr-test}
TEST_TYPE=${TEST_TYPE:-database}
CLEANUP=${CLEANUP:-true}
NOTIFICATION_EMAIL=${NOTIFICATION_EMAIL:-}
BACKUP_VAULT_NAME=${BACKUP_VAULT_NAME:-phaserai-prod-vault}
SOURCE_DB_INSTANCE=${SOURCE_DB_INSTANCE:-phaserai-prod}

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
    print_info "Checking prerequisites for disaster recovery testing..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        exit 1
    fi
    
    # Check CDK
    if ! command -v cdk &> /dev/null; then
        print_error "AWS CDK is not installed"
        exit 1
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to test database recovery
test_database_recovery() {
    print_info "Starting database recovery test..."
    
    local test_instance_id="dr-test-db-$(date +%Y%m%d-%H%M%S)"
    local restore_job_id
    
    # Get latest backup
    print_info "Finding latest backup..."
    local latest_backup_arn
    latest_backup_arn=$(aws backup list-recovery-points-by-backup-vault \
        --backup-vault-name "$BACKUP_VAULT_NAME" \
        --by-resource-type "RDS" \
        --max-items 1 \
        --query 'RecoveryPoints[0].RecoveryPointArn' \
        --output text)
    
    if [ "$latest_backup_arn" = "None" ] || [ -z "$latest_backup_arn" ]; then
        print_error "No backups found in vault: $BACKUP_VAULT_NAME"
        return 1
    fi
    
    print_info "Latest backup: $latest_backup_arn"
    
    # Start restore job
    print_info "Starting database restore..."
    restore_job_id=$(aws backup start-restore-job \
        --recovery-point-arn "$latest_backup_arn" \
        --metadata "{
            \"DBInstanceIdentifier\":\"$test_instance_id\",
            \"DBInstanceClass\":\"db.t3.micro\",
            \"PubliclyAccessible\":false,
            \"MultiAZ\":false,
            \"StorageEncrypted\":true
        }" \
        --iam-role-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/service-role/AWSBackupDefaultServiceRole" \
        --query 'RestoreJobId' \
        --output text)
    
    if [ -z "$restore_job_id" ]; then
        print_error "Failed to start restore job"
        return 1
    fi
    
    print_info "Restore job ID: $restore_job_id"
    
    # Wait for restore to complete
    print_info "Waiting for restore to complete (this may take 15-30 minutes)..."
    local timeout=2400  # 40 minutes
    local elapsed=0
    local status
    
    while [ $elapsed -lt $timeout ]; do
        status=$(aws backup describe-restore-job \
            --restore-job-id "$restore_job_id" \
            --query 'Status' \
            --output text)
        
        case "$status" in
            "COMPLETED")
                print_success "Database restore completed successfully"
                break
                ;;
            "FAILED"|"ABORTED")
                print_error "Database restore failed with status: $status"
                return 1
                ;;
            "RUNNING"|"PENDING")
                print_info "Restore in progress... (${elapsed}s elapsed)"
                sleep 120  # Check every 2 minutes
                elapsed=$((elapsed + 120))
                ;;
            *)
                print_warning "Unknown restore status: $status"
                sleep 120
                elapsed=$((elapsed + 120))
                ;;
        esac
    done
    
    if [ $elapsed -ge $timeout ]; then
        print_error "Restore timed out after $timeout seconds"
        return 1
    fi
    
    # Test database connectivity and data integrity
    test_database_integrity "$test_instance_id"
    local integrity_result=$?
    
    # Cleanup test instance
    if [ "$CLEANUP" = "true" ]; then
        print_info "Cleaning up test database instance..."
        aws rds delete-db-instance \
            --db-instance-identifier "$test_instance_id" \
            --skip-final-snapshot \
            --delete-automated-backups &>/dev/null || true
        print_success "Test instance cleanup initiated"
    else
        print_warning "Test instance left running: $test_instance_id"
    fi
    
    return $integrity_result
}

# Function to test database integrity
test_database_integrity() {
    local test_instance_id="$1"
    
    print_info "Testing database integrity..."
    
    # Get database endpoint
    local db_endpoint
    db_endpoint=$(aws rds describe-db-instances \
        --db-instance-identifier "$test_instance_id" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    if [ -z "$db_endpoint" ] || [ "$db_endpoint" = "None" ]; then
        print_error "Could not get database endpoint"
        return 1
    fi
    
    print_info "Database endpoint: $db_endpoint"
    
    # Test basic connectivity
    if timeout 30 pg_isready -h "$db_endpoint" -p 5432 &>/dev/null; then
        print_success "Database is accepting connections"
    else
        print_warning "Database connectivity test failed (may be due to security groups)"
        return 1
    fi
    
    # If database credentials are available, test data integrity
    if [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
        print_info "Testing data integrity with database queries..."
        
        # Test basic table existence and row counts
        local test_queries=(
            "SELECT COUNT(*) FROM app_8b514_users;"
            "SELECT COUNT(*) FROM app_8b514_languages;"
            "SELECT COUNT(*) FROM app_8b514_words;"
            "SELECT COUNT(*) FROM schema_migrations;"
        )
        
        for query in "${test_queries[@]}"; do
            if timeout 30 psql -h "$db_endpoint" -U "$DB_USER" -d phaserai_prod -c "$query" &>/dev/null; then
                print_success "Query executed successfully: $query"
            else
                print_error "Query failed: $query"
                return 1
            fi
        done
        
        print_success "Database integrity tests passed"
    else
        print_info "Skipping data integrity tests (DB_USER or DB_PASSWORD not set)"
    fi
    
    return 0
}

# Function to test infrastructure recovery
test_infrastructure_recovery() {
    print_info "Starting infrastructure recovery test..."
    
    local test_stack_suffix="dr-test-$(date +%Y%m%d-%H%M%S)"
    
    # Deploy test infrastructure
    print_info "Deploying test infrastructure..."
    cd "$PROJECT_ROOT/infra"
    
    # Deploy with test context
    if cdk deploy --all \
        --context environment="$test_stack_suffix" \
        --context appName="phaserai" \
        --require-approval never \
        --outputs-file "/tmp/cdk-outputs-$test_stack_suffix.json"; then
        print_success "Test infrastructure deployed successfully"
    else
        print_error "Failed to deploy test infrastructure"
        return 1
    fi
    
    # Verify deployed resources
    print_info "Verifying deployed resources..."
    
    # Check if stacks exist
    local stacks=(
        "phaserai-prod-database-$test_stack_suffix"
        "phaserai-prod-api-$test_stack_suffix"
        "phaserai-auth-$test_stack_suffix"
    )
    
    for stack in "${stacks[@]}"; do
        if aws cloudformation describe-stacks --stack-name "$stack" &>/dev/null; then
            print_success "Stack exists: $stack"
        else
            print_error "Stack not found: $stack"
            return 1
        fi
    done
    
    # Test API endpoints
    print_info "Testing API endpoints..."
    local api_url
    api_url=$(jq -r '.["phaserai-prod-api-'$test_stack_suffix'"].ApiUrl' "/tmp/cdk-outputs-$test_stack_suffix.json" 2>/dev/null || echo "")
    
    if [ -n "$api_url" ]; then
        if curl -s -f "$api_url/health" &>/dev/null; then
            print_success "API health check passed"
        else
            print_warning "API health check failed (may be due to cold start)"
        fi
    else
        print_warning "Could not determine API URL"
    fi
    
    # Cleanup test infrastructure
    if [ "$CLEANUP" = "true" ]; then
        print_info "Cleaning up test infrastructure..."
        if cdk destroy --all \
            --context environment="$test_stack_suffix" \
            --context appName="phaserai" \
            --force; then
            print_success "Test infrastructure cleanup completed"
        else
            print_warning "Test infrastructure cleanup may have failed"
        fi
    else
        print_warning "Test infrastructure left deployed with suffix: $test_stack_suffix"
    fi
    
    return 0
}

# Function to test cross-region recovery
test_cross_region_recovery() {
    print_info "Starting cross-region recovery test..."
    
    local primary_region="us-east-1"
    local secondary_region="us-west-2"
    local current_region
    current_region=$(aws configure get region)
    
    print_info "Primary region: $primary_region"
    print_info "Secondary region: $secondary_region"
    print_info "Current region: $current_region"
    
    # Check if cross-region backups exist
    print_info "Checking cross-region backup availability..."
    
    local cross_region_backups
    cross_region_backups=$(aws backup list-recovery-points-by-backup-vault \
        --backup-vault-name "phaserai-prod-vault" \
        --region "$secondary_region" \
        --max-items 5 \
        --query 'RecoveryPoints | length' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$cross_region_backups" -gt 0 ]; then
        print_success "Found $cross_region_backups cross-region backup(s)"
    else
        print_warning "No cross-region backups found in $secondary_region"
        return 1
    fi
    
    # Test deployment in secondary region
    print_info "Testing deployment in secondary region..."
    
    local test_stack_suffix="dr-cross-region-$(date +%Y%m%d-%H%M%S)"
    
    cd "$PROJECT_ROOT/infra"
    
    # Deploy minimal stack in secondary region
    if AWS_DEFAULT_REGION="$secondary_region" cdk deploy phaserai-auth-"$test_stack_suffix" \
        --context environment="$test_stack_suffix" \
        --context appName="phaserai" \
        --require-approval never; then
        print_success "Cross-region deployment successful"
    else
        print_error "Cross-region deployment failed"
        return 1
    fi
    
    # Cleanup
    if [ "$CLEANUP" = "true" ]; then
        print_info "Cleaning up cross-region test resources..."
        AWS_DEFAULT_REGION="$secondary_region" cdk destroy phaserai-auth-"$test_stack_suffix" \
            --context environment="$test_stack_suffix" \
            --context appName="phaserai" \
            --force &>/dev/null || true
    fi
    
    return 0
}

# Function to test security breach recovery
test_security_breach_recovery() {
    print_info "Starting security breach recovery simulation..."
    
    # This test simulates recovery procedures after a security breach
    # In a real scenario, this would involve:
    # 1. Credential rotation
    # 2. Security group updates
    # 3. Access log analysis
    # 4. Clean backup restoration
    
    print_info "Simulating credential rotation..."
    
    # Test secret rotation capability
    local test_secret_name="phaserai-dr-test-secret-$(date +%Y%m%d-%H%M%S)"
    
    # Create test secret
    aws secretsmanager create-secret \
        --name "$test_secret_name" \
        --description "DR test secret" \
        --secret-string '{"username":"test","password":"initial-password"}' \
        &>/dev/null
    
    # Update secret (simulating rotation)
    if aws secretsmanager update-secret \
        --secret-id "$test_secret_name" \
        --secret-string '{"username":"test","password":"rotated-password"}' \
        &>/dev/null; then
        print_success "Secret rotation test passed"
    else
        print_error "Secret rotation test failed"
        return 1
    fi
    
    # Cleanup test secret
    if [ "$CLEANUP" = "true" ]; then
        aws secretsmanager delete-secret \
            --secret-id "$test_secret_name" \
            --force-delete-without-recovery \
            &>/dev/null || true
    fi
    
    print_info "Testing security group updates..."
    
    # Create test security group
    local test_sg_id
    test_sg_id=$(aws ec2 create-security-group \
        --group-name "dr-test-sg-$(date +%Y%m%d-%H%M%S)" \
        --description "DR test security group" \
        --query 'GroupId' \
        --output text)
    
    if [ -n "$test_sg_id" ]; then
        print_success "Test security group created: $test_sg_id"
        
        # Test rule modification
        if aws ec2 authorize-security-group-ingress \
            --group-id "$test_sg_id" \
            --protocol tcp \
            --port 443 \
            --cidr 0.0.0.0/0 \
            &>/dev/null; then
            print_success "Security group rule modification test passed"
        else
            print_error "Security group rule modification test failed"
        fi
        
        # Cleanup
        if [ "$CLEANUP" = "true" ]; then
            aws ec2 delete-security-group --group-id "$test_sg_id" &>/dev/null || true
        fi
    else
        print_error "Failed to create test security group"
        return 1
    fi
    
    print_success "Security breach recovery simulation completed"
    return 0
}

# Function to generate test report
generate_test_report() {
    local test_results="$1"
    local report_file="/tmp/dr-test-report-$(date +%Y%m%d-%H%M%S).json"
    
    print_info "Generating disaster recovery test report..."
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "test_type": "$TEST_TYPE",
  "environment": "$ENVIRONMENT",
  "test_results": $test_results,
  "cleanup_enabled": $CLEANUP
}
EOF
    
    print_success "Test report generated: $report_file"
    
    # Display summary
    local passed_tests failed_tests
    passed_tests=$(echo "$test_results" | jq '.passed | length')
    failed_tests=$(echo "$test_results" | jq '.failed | length')
    
    print_info "Test Summary:"
    print_info "  Passed: $passed_tests"
    print_info "  Failed: $failed_tests"
    
    if [ "$failed_tests" -eq 0 ]; then
        print_success "✅ All disaster recovery tests passed"
    else
        print_error "❌ $failed_tests disaster recovery test(s) failed"
        echo "$test_results" | jq -r '.failed[]' | while read -r test; do
            print_error "  • $test"
        done
    fi
    
    echo "$report_file"
}

# Function to send notification
send_notification() {
    local report_file="$1"
    local failed_tests="$2"
    
    if [ -z "$NOTIFICATION_EMAIL" ]; then
        print_info "No notification email configured"
        return 0
    fi
    
    print_info "Sending test results notification..."
    
    local subject message
    
    if [ "$failed_tests" -eq 0 ]; then
        subject="✅ DR Test Passed - $(date +%Y-%m-%d)"
        message="Disaster recovery test completed successfully.

Test Type: $TEST_TYPE
Environment: $ENVIRONMENT
All tests passed.

Report: $report_file
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    else
        subject="❌ DR Test Failed - $(date +%Y-%m-%d)"
        message="Disaster recovery test completed with $failed_tests failure(s).

Test Type: $TEST_TYPE
Environment: $ENVIRONMENT
Please review the failures and update DR procedures.

Report: $report_file
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    fi
    
    # Send notification via AWS SES
    if aws ses get-send-quota &>/dev/null; then
        aws ses send-email \
            --source "noreply@phaserai.com" \
            --destination "ToAddresses=$NOTIFICATION_EMAIL" \
            --message "Subject={Data=\"$subject\"},Body={Text={Data=\"$message\"}}" \
            &>/dev/null && print_success "Notification sent" || print_warning "Failed to send notification"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --test-type TYPE         Type of DR test (database|infrastructure|cross-region|security|all) [default: database]"
    echo "  --environment ENV        Test environment suffix [default: dr-test]"
    echo "  --no-cleanup             Skip cleanup of test resources"
    echo "  --notification-email     Email for test result notifications"
    echo "  --backup-vault NAME      Backup vault name [default: phaserai-prod-vault]"
    echo "  --source-db ID           Source database instance [default: phaserai-prod]"
    echo "  --help                   Show this help message"
    echo ""
    echo "Test Types:"
    echo "  database                 Test database backup and restore"
    echo "  infrastructure           Test infrastructure deployment from code"
    echo "  cross-region             Test cross-region failover capabilities"
    echo "  security                 Test security breach recovery procedures"
    echo "  all                      Run all test types"
    echo ""
    echo "Environment Variables:"
    echo "  TEST_TYPE                Type of DR test to run"
    echo "  ENVIRONMENT              Test environment suffix"
    echo "  CLEANUP                  Enable/disable cleanup (true/false)"
    echo "  NOTIFICATION_EMAIL       Email for notifications"
    echo "  BACKUP_VAULT_NAME        Backup vault name"
    echo "  SOURCE_DB_INSTANCE       Source database instance"
    echo "  DB_USER                  Database user for connectivity tests"
    echo "  DB_PASSWORD              Database password for connectivity tests"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Test database recovery"
    echo "  $0 --test-type infrastructure        # Test infrastructure recovery"
    echo "  $0 --test-type all                   # Run all tests"
    echo "  $0 --no-cleanup                      # Keep test resources"
}

# Main function
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --test-type)
                TEST_TYPE="$2"
                shift 2
                ;;
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --no-cleanup)
                CLEANUP="false"
                shift
                ;;
            --notification-email)
                NOTIFICATION_EMAIL="$2"
                shift 2
                ;;
            --backup-vault)
                BACKUP_VAULT_NAME="$2"
                shift 2
                ;;
            --source-db)
                SOURCE_DB_INSTANCE="$2"
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
    
    print_info "Starting disaster recovery test"
    print_info "Test type: $TEST_TYPE"
    print_info "Environment: $ENVIRONMENT"
    print_info "Cleanup enabled: $CLEANUP"
    
    # Check prerequisites
    check_prerequisites
    
    # Initialize test results
    local test_results='{"passed":[],"failed":[]}'
    
    # Run tests based on type
    case "$TEST_TYPE" in
        database)
            if test_database_recovery; then
                test_results=$(echo "$test_results" | jq '.passed += ["database_recovery"]')
            else
                test_results=$(echo "$test_results" | jq '.failed += ["database_recovery"]')
            fi
            ;;
        infrastructure)
            if test_infrastructure_recovery; then
                test_results=$(echo "$test_results" | jq '.passed += ["infrastructure_recovery"]')
            else
                test_results=$(echo "$test_results" | jq '.failed += ["infrastructure_recovery"]')
            fi
            ;;
        cross-region)
            if test_cross_region_recovery; then
                test_results=$(echo "$test_results" | jq '.passed += ["cross_region_recovery"]')
            else
                test_results=$(echo "$test_results" | jq '.failed += ["cross_region_recovery"]')
            fi
            ;;
        security)
            if test_security_breach_recovery; then
                test_results=$(echo "$test_results" | jq '.passed += ["security_breach_recovery"]')
            else
                test_results=$(echo "$test_results" | jq '.failed += ["security_breach_recovery"]')
            fi
            ;;
        all)
            # Run all tests
            local tests=("database" "infrastructure" "cross-region" "security")
            for test in "${tests[@]}"; do
                print_info "Running $test recovery test..."
                case "$test" in
                    database)
                        if test_database_recovery; then
                            test_results=$(echo "$test_results" | jq '.passed += ["database_recovery"]')
                        else
                            test_results=$(echo "$test_results" | jq '.failed += ["database_recovery"]')
                        fi
                        ;;
                    infrastructure)
                        if test_infrastructure_recovery; then
                            test_results=$(echo "$test_results" | jq '.passed += ["infrastructure_recovery"]')
                        else
                            test_results=$(echo "$test_results" | jq '.failed += ["infrastructure_recovery"]')
                        fi
                        ;;
                    cross-region)
                        if test_cross_region_recovery; then
                            test_results=$(echo "$test_results" | jq '.passed += ["cross_region_recovery"]')
                        else
                            test_results=$(echo "$test_results" | jq '.failed += ["cross_region_recovery"]')
                        fi
                        ;;
                    security)
                        if test_security_breach_recovery; then
                            test_results=$(echo "$test_results" | jq '.passed += ["security_breach_recovery"]')
                        else
                            test_results=$(echo "$test_results" | jq '.failed += ["security_breach_recovery"]')
                        fi
                        ;;
                esac
            done
            ;;
        *)
            print_error "Unknown test type: $TEST_TYPE"
            show_usage
            exit 1
            ;;
    esac
    
    # Generate report
    local report_file
    report_file=$(generate_test_report "$test_results")
    
    # Send notification
    local failed_count
    failed_count=$(echo "$test_results" | jq '.failed | length')
    send_notification "$report_file" "$failed_count"
    
    # Exit with appropriate code
    if [ "$failed_count" -eq 0 ]; then
        print_success "All disaster recovery tests completed successfully"
        exit 0
    else
        print_error "Disaster recovery tests completed with $failed_count failure(s)"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"