#!/bin/bash

# ============================================================================
# Fix pnpm Lockfile Script
# ============================================================================
#
# This script helps fix pnpm-lock.yaml when it's out of sync with package.json
# Common scenarios:
# - Dependencies were added/updated but lockfile wasn't regenerated
# - Merge conflicts in lockfile
# - Manual package.json edits
#
# USAGE:
#   ./scripts/fix-lockfile.sh
#
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_info "============================================================================"
print_info "Fixing pnpm Lockfile"
print_info "============================================================================"

cd "$PROJECT_ROOT"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is not installed. Please install pnpm first:"
    echo "  npm install -g pnpm@8.10.0"
    exit 1
fi

# Check current pnpm version
PNPM_VERSION=$(pnpm --version)
print_info "Current pnpm version: $PNPM_VERSION"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found in current directory"
    exit 1
fi

print_success "Found package.json"

# Check if pnpm-lock.yaml exists
if [ ! -f "pnpm-lock.yaml" ]; then
    print_warning "pnpm-lock.yaml not found - will be created"
else
    print_info "Found existing pnpm-lock.yaml"
    
    # Backup existing lockfile
    cp pnpm-lock.yaml pnpm-lock.yaml.backup
    print_info "Created backup: pnpm-lock.yaml.backup"
fi

# Test if lockfile is in sync
print_info "Testing if lockfile is in sync with package.json..."

if pnpm install --frozen-lockfile > /dev/null 2>&1; then
    print_success "Lockfile is already in sync with package.json!"
    
    # Clean up backup if we created one
    if [ -f "pnpm-lock.yaml.backup" ]; then
        rm pnpm-lock.yaml.backup
        print_info "Removed backup file (not needed)"
    fi
    
    exit 0
else
    print_warning "Lockfile is out of sync with package.json"
fi

# Show what will change
print_info "Analyzing dependency changes..."

# Remove node_modules to ensure clean install
if [ -d "node_modules" ]; then
    print_info "Removing existing node_modules..."
    rm -rf node_modules
fi

# Regenerate lockfile
print_info "Regenerating pnpm-lock.yaml..."

if pnpm install; then
    print_success "Successfully regenerated pnpm-lock.yaml"
else
    print_error "Failed to regenerate lockfile"
    
    # Restore backup if it exists
    if [ -f "pnpm-lock.yaml.backup" ]; then
        mv pnpm-lock.yaml.backup pnpm-lock.yaml
        print_info "Restored backup lockfile"
    fi
    
    exit 1
fi

# Verify the fix
print_info "Verifying the fix..."

if pnpm install --frozen-lockfile > /dev/null 2>&1; then
    print_success "✅ Lockfile is now in sync with package.json!"
else
    print_error "❌ Lockfile is still out of sync"
    exit 1
fi

# Show changes if backup exists
if [ -f "pnpm-lock.yaml.backup" ]; then
    print_info "Changes made to lockfile:"
    
    if command -v diff &> /dev/null; then
        echo "--- pnpm-lock.yaml.backup (old)"
        echo "+++ pnpm-lock.yaml (new)"
        diff -u pnpm-lock.yaml.backup pnpm-lock.yaml | head -20 || true
        echo ""
        echo "(showing first 20 lines of diff)"
    else
        print_info "Install 'diff' to see detailed changes"
    fi
    
    # Ask if user wants to keep backup
    read -p "Keep backup file? (y/N): " keep_backup
    if [[ $keep_backup =~ ^[Yy]$ ]]; then
        print_info "Backup kept as pnpm-lock.yaml.backup"
    else
        rm pnpm-lock.yaml.backup
        print_info "Backup file removed"
    fi
fi

print_success "============================================================================"
print_success "Lockfile fix completed successfully!"
print_success "============================================================================"

print_info "Next steps:"
print_info "1. Review the changes in pnpm-lock.yaml"
print_info "2. Test your application: pnpm run dev"
print_info "3. Commit the changes:"
print_info "   git add pnpm-lock.yaml"
print_info "   git commit -m 'chore: update pnpm-lock.yaml'"

print_info ""
print_info "The CI/CD pipeline should now work without lockfile errors."