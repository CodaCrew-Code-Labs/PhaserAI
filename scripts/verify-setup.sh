#!/bin/bash

# ============================================================================
# Setup Verification Script
# ============================================================================
#
# This script verifies that the development environment is properly set up
# and ready for CI/CD workflows.
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

print_info "============================================================================"
print_info "PhaserAI Development Environment Verification"
print_info "============================================================================"

# Check Node.js version
NODE_VERSION=$(node --version)
print_info "Node.js version: $NODE_VERSION"

if [[ "$NODE_VERSION" =~ ^v(18|20|22)\. ]]; then
    print_success "Node.js version is compatible"
else
    print_warning "Node.js version may not be optimal (recommended: 18.x, 20.x, or 22.x)"
fi

# Check pnpm version
PNPM_VERSION=$(pnpm --version)
print_info "pnpm version: $PNPM_VERSION"

if [[ "$PNPM_VERSION" =~ ^8\. ]]; then
    print_success "pnpm version is compatible"
else
    print_warning "pnpm version may not be optimal (recommended: 8.x)"
fi

# Check lockfile sync
print_info "Checking pnpm lockfile sync..."
if pnpm install --frozen-lockfile > /dev/null 2>&1; then
    print_success "pnpm-lock.yaml is in sync with package.json"
else
    print_error "pnpm-lock.yaml is out of sync with package.json"
    print_info "Run: pnpm run fix-lockfile"
    exit 1
fi

# Check TypeScript
print_info "Running TypeScript type check..."
if pnpm run type-check > /dev/null 2>&1; then
    print_success "TypeScript type check passed"
else
    print_error "TypeScript type check failed"
    exit 1
fi

# Check linting
print_info "Running ESLint check..."
if pnpm run lint > /dev/null 2>&1; then
    print_success "ESLint check passed"
else
    print_error "ESLint check failed"
    exit 1
fi

# Check formatting
print_info "Checking code formatting..."
if pnpm run format:check > /dev/null 2>&1; then
    print_success "Code formatting check passed"
else
    print_warning "Code formatting issues found - run 'pnpm run format' to fix"
fi

# Check build
print_info "Testing production build..."
if pnpm run build > /dev/null 2>&1; then
    print_success "Production build successful"
    
    # Check if dist directory was created
    if [ -d "dist" ]; then
        DIST_SIZE=$(du -sh dist | cut -f1)
        print_info "Build output size: $DIST_SIZE"
    fi
else
    print_error "Production build failed"
    exit 1
fi

# Check Docker setup
print_info "Checking Docker setup..."
if command -v docker &> /dev/null; then
    print_success "Docker is available"
    
    if docker info > /dev/null 2>&1; then
        print_success "Docker daemon is running"
    else
        print_warning "Docker daemon is not running"
    fi
else
    print_warning "Docker is not installed"
fi

print_success "============================================================================"
print_success "Environment Verification Complete!"
print_success "============================================================================"

print_info "✅ All critical checks passed"
print_info "🚀 Ready for development and CI/CD"
print_info ""
print_info "Next steps:"
print_info "  - Start development: pnpm run dev"
print_info "  - Run Docker build: pnpm run docker:build"
print_info "  - Push changes to trigger CI/CD"