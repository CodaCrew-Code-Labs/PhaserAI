#!/bin/bash

# ============================================================================
# Docker Development Helper Script
# ============================================================================
#
# This script provides convenient commands for Docker-based development
# of the PhaserAI application.
#
# USAGE:
#   ./scripts/docker-dev.sh <command>
#
# COMMANDS:
#   start       - Start development environment
#   stop        - Stop all services
#   restart     - Restart all services
#   build       - Build all images
#   logs        - Show logs for all services
#   shell       - Open shell in app container
#   db-shell    - Open PostgreSQL shell
#   migrate     - Run database migrations
#   clean       - Clean up containers and images
#   status      - Show status of all services
#
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
ENV_FILE="$PROJECT_ROOT/.env.docker"

# Logging functions
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

print_header() {
    echo -e "${CYAN}============================================================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}============================================================================${NC}"
}

# Check prerequisites
check_prerequisites() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Use docker compose if available, otherwise docker-compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi
}

# Load environment variables
load_environment() {
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        print_info "Loading environment from .env.local"
        export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
    elif [ -f "$ENV_FILE" ]; then
        print_info "Loading environment from .env.docker"
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    else
        print_warning "No environment file found. Using defaults."
    fi
}

# Start development environment
start_dev() {
    print_header "Starting PhaserAI Development Environment"
    
    print_info "Starting services: app-dev, postgres, redis..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d app-dev postgres redis
    
    print_info "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    if $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        print_success "Development environment started successfully!"
        print_info ""
        print_info "Services available at:"
        print_info "  Frontend (dev):  http://localhost:5173"
        print_info "  Database:        localhost:5432"
        print_info "  Redis:           localhost:6379"
        print_info ""
        print_info "Use './scripts/docker-dev.sh logs' to view logs"
        print_info "Use './scripts/docker-dev.sh shell' to access app container"
    else
        print_error "Failed to start some services. Check logs for details."
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs
    fi
}

# Stop all services
stop_services() {
    print_header "Stopping PhaserAI Services"
    
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" down
    print_success "All services stopped"
}

# Restart services
restart_services() {
    print_header "Restarting PhaserAI Services"
    
    stop_services
    sleep 2
    start_dev
}

# Build all images
build_images() {
    print_header "Building PhaserAI Docker Images"
    
    print_info "Building development image..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" build app-dev
    
    print_info "Building production image..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" build app-prod
    
    print_success "All images built successfully"
}

# Show logs
show_logs() {
    local service=${1:-}
    
    if [ -n "$service" ]; then
        print_info "Showing logs for service: $service"
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs -f "$service"
    else
        print_info "Showing logs for all services"
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs -f
    fi
}

# Open shell in app container
open_shell() {
    print_info "Opening shell in app-dev container..."
    
    if $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps app-dev | grep -q "Up"; then
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec app-dev /bin/sh
    else
        print_error "app-dev container is not running. Start it first with 'start' command."
    fi
}

# Open database shell
open_db_shell() {
    print_info "Opening PostgreSQL shell..."
    
    if $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec postgres psql -U "${POSTGRES_USER:-phaserai_admin}" -d "${POSTGRES_DB:-phaserai_dev}"
    else
        print_error "postgres container is not running. Start it first with 'start' command."
    fi
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"
    
    if ! $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        print_error "postgres container is not running. Start it first."
        exit 1
    fi
    
    print_info "Running migrations..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" --profile migration run --rm migrate
    
    print_success "Migrations completed"
}

# Clean up containers and images
clean_up() {
    print_header "Cleaning Up Docker Resources"
    
    print_info "Stopping and removing containers..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" down -v --remove-orphans
    
    print_info "Removing unused images..."
    docker image prune -f
    
    print_info "Removing unused volumes..."
    docker volume prune -f
    
    print_success "Cleanup completed"
}

# Show service status
show_status() {
    print_header "PhaserAI Services Status"
    
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps
    
    print_info ""
    print_info "Docker images:"
    docker images | grep -E "(phaserai|postgres|redis|nginx)" || echo "No PhaserAI images found"
    
    print_info ""
    print_info "Docker volumes:"
    docker volume ls | grep -E "(phaserai|postgres|redis)" || echo "No PhaserAI volumes found"
}

# Show usage information
show_usage() {
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start       - Start development environment"
    echo "  stop        - Stop all services"
    echo "  restart     - Restart all services"
    echo "  build       - Build all images"
    echo "  logs [svc]  - Show logs for all services or specific service"
    echo "  shell       - Open shell in app container"
    echo "  db-shell    - Open PostgreSQL shell"
    echo "  migrate     - Run database migrations"
    echo "  clean       - Clean up containers and images"
    echo "  status      - Show status of all services"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start development environment"
    echo "  $0 logs app-dev            # Show logs for app-dev service"
    echo "  $0 shell                   # Open shell in app container"
    echo "  $0 migrate                 # Run database migrations"
}

# Main script logic
main() {
    local command=${1:-help}
    
    # Check prerequisites
    check_prerequisites
    
    # Load environment
    load_environment
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    case $command in
        start)
            start_dev
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        build)
            build_images
            ;;
        logs)
            show_logs "$2"
            ;;
        shell)
            open_shell
            ;;
        db-shell)
            open_db_shell
            ;;
        migrate)
            run_migrations
            ;;
        clean)
            clean_up
            ;;
        status)
            show_status
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