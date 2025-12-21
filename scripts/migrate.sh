#!/bin/bash

# Database Migration Script for PhaserAI
# This script provides a convenient interface for running database migrations

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
INFRA_DIR="$PROJECT_ROOT/infra"

# Default environment
ENVIRONMENT=${ENVIRONMENT:-dev}

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
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or later is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check if infra directory exists
    if [ ! -d "$INFRA_DIR" ]; then
        print_error "Infrastructure directory not found: $INFRA_DIR"
        exit 1
    fi
    
    # Check if migration runner exists
    if [ ! -f "$INFRA_DIR/lib/migration-runner.js" ]; then
        print_error "Migration runner not found. Please ensure the infrastructure is properly set up."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to load environment variables
load_environment() {
    print_info "Loading environment configuration for: $ENVIRONMENT"
    
    # Load environment-specific variables
    case $ENVIRONMENT in
        dev|development)
            export DB_HOST=${DB_HOST:-localhost}
            export DB_PORT=${DB_PORT:-5432}
            export DB_NAME=${DB_NAME:-phaserai_dev}
            export DB_USER=${DB_USER:-phaserai_admin}
            ;;
        staging)
            if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
                print_error "Staging environment requires DB_HOST, DB_NAME, and DB_USER to be set"
                exit 1
            fi
            ;;
        prod|production)
            if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
                print_error "Production environment requires DB_HOST, DB_NAME, and DB_USER to be set"
                exit 1
            fi
            print_warning "Running migrations in PRODUCTION environment!"
            read -p "Are you sure you want to continue? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                print_info "Migration cancelled"
                exit 0
            fi
            ;;
        *)
            print_error "Unknown environment: $ENVIRONMENT"
            print_info "Supported environments: dev, staging, prod"
            exit 1
            ;;
    esac
}

# Function to backup database (production only)
backup_database() {
    if [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "production" ]; then
        print_info "Creating database backup before migration..."
        
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        BACKUP_PATH="/tmp/$BACKUP_FILE"
        
        if command -v pg_dump &> /dev/null; then
            pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_PATH"
            print_success "Database backup created: $BACKUP_PATH"
            
            # Optionally upload to S3
            if command -v aws &> /dev/null && [ -n "$BACKUP_S3_BUCKET" ]; then
                aws s3 cp "$BACKUP_PATH" "s3://$BACKUP_S3_BUCKET/database-backups/$BACKUP_FILE"
                print_success "Backup uploaded to S3: s3://$BACKUP_S3_BUCKET/database-backups/$BACKUP_FILE"
            fi
        else
            print_warning "pg_dump not found. Skipping database backup."
            print_warning "Please ensure you have a recent backup before proceeding."
            read -p "Continue without backup? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                print_info "Migration cancelled"
                exit 0
            fi
        fi
    fi
}

# Function to run migrations
run_migration() {
    local action=$1
    local version=$2
    
    print_info "Running migration: $action ${version:+$version}"
    
    cd "$INFRA_DIR"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    fi
    
    # Run migration
    case $action in
        up)
            if [ -n "$version" ]; then
                node lib/migration-runner.js up "$version"
            else
                node lib/migration-runner.js up
            fi
            ;;
        down)
            if [ -n "$version" ]; then
                node lib/migration-runner.js down "$version"
            else
                node lib/migration-runner.js down
            fi
            ;;
        status)
            node lib/migration-runner.js status
            ;;
        list)
            node lib/migration-runner.js list
            ;;
        *)
            print_error "Unknown migration action: $action"
            exit 1
            ;;
    esac
}

# Function to verify migration
verify_migration() {
    print_info "Verifying migration status..."
    cd "$INFRA_DIR"
    node lib/migration-runner.js status
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  up [version]      Apply migrations (optionally up to specific version)"
    echo "  down [version]    Rollback migrations (optionally down to specific version)"
    echo "  status            Show migration status"
    echo "  list              List all available migrations"
    echo "  help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT       Target environment (dev, staging, prod) [default: dev]"
    echo "  DB_HOST           Database host"
    echo "  DB_PORT           Database port [default: 5432]"
    echo "  DB_NAME           Database name"
    echo "  DB_USER           Database user"
    echo "  DB_PASSWORD       Database password"
    echo "  BACKUP_S3_BUCKET  S3 bucket for backups (production only)"
    echo ""
    echo "Examples:"
    echo "  $0 status                           # Check migration status"
    echo "  $0 up                               # Apply all pending migrations"
    echo "  $0 up 20250101_120000               # Apply migrations up to specific version"
    echo "  $0 down                             # Rollback last migration"
    echo "  ENVIRONMENT=prod $0 up              # Apply migrations in production"
}

# Main script logic
main() {
    local command=$1
    local version=$2
    
    case $command in
        up|down|status|list)
            check_prerequisites
            load_environment
            
            if [ "$command" = "up" ]; then
                backup_database
            fi
            
            run_migration "$command" "$version"
            
            if [ "$command" = "up" ] || [ "$command" = "down" ]; then
                verify_migration
            fi
            
            print_success "Migration command completed successfully"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"