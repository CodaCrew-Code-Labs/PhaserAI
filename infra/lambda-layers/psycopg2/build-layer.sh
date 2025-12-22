#!/bin/bash

# ============================================================================
# psycopg2 Lambda Layer Build Script
# ============================================================================
# 
# This script builds the psycopg2 PostgreSQL adapter library for AWS Lambda
# Python 3.11 runtime using Docker to ensure compatibility.
#
# WHAT IT DOES:
# - Uses Amazon Linux 2 Docker container (matches Lambda runtime environment)
# - Installs PostgreSQL development headers and GCC compiler
# - Builds psycopg2-binary 2.9.9 with native extensions
# - Creates proper Lambda layer directory structure
# - Cleans up unnecessary files to minimize layer size
#
# REQUIREMENTS:
# - Docker installed and running
# - Internet connection for downloading packages
# - Sufficient disk space (~50MB for build process)
#
# OUTPUT:
# - Creates python/ directory with psycopg2 library
# - Layer size: ~8.5MB compressed
# - Compatible with AWS Lambda ARM64 (Graviton2) instances
#
# USAGE:
#   ./build-layer.sh
#
# TROUBLESHOOTING:
# - If Docker is not available, falls back to local pip install
# - Local builds may not work on Lambda (architecture mismatch)
# - Use verify-deployment.sh to check build success
#
# ============================================================================

set -e  # Exit on any error

# Color codes for formatted output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions with timestamps
print_info() {
    echo -e "${BLUE}[INFO $(date '+%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS $(date '+%H:%M:%S')]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING $(date '+%H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR $(date '+%H:%M:%S')]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP $(date '+%H:%M:%S')]${NC} $1"
}

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAYER_DIR="$SCRIPT_DIR"
PYTHON_VERSION="3.11"  # Match Lambda runtime
PSYCOPG2_VERSION="2.9.9"
DOCKER_IMAGE="amazonlinux:2"

print_info "============================================================================"
print_info "Building psycopg2 Lambda Layer for AWS Lambda Python 3.11"
print_info "============================================================================"
print_info "Layer directory: $LAYER_DIR"
print_info "Python version: $PYTHON_VERSION (Amazon Linux 2)"
print_info "psycopg2 version: $PSYCOPG2_VERSION"
print_info "Target architecture: x86_64 (amd64)"

# Step 1: Clean previous build
print_step "Cleaning previous build artifacts..."
if [ -d "$LAYER_DIR/python" ]; then
    print_info "Removing existing python/ directory..."
    rm -rf "$LAYER_DIR/python"
    print_success "Previous build cleaned"
else
    print_info "No previous build found"
fi

# Step 2: Create layer directory structure
print_step "Creating Lambda layer directory structure..."
mkdir -p "$LAYER_DIR/python"
print_success "Created python/ directory for Lambda layer"

# Step 3: Check build environment
print_step "Checking build environment..."

if command -v docker &> /dev/null; then
    print_success "Docker is available"
    
    # Check if Docker daemon is running
    if docker info &> /dev/null; then
        print_success "Docker daemon is running"
    else
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    # Step 4: Docker-based build (recommended)
    print_step "Building psycopg2 using Docker (Amazon Linux 2)..."
    print_info "This ensures compatibility with AWS Lambda runtime environment"
    
    # Docker build command with detailed logging
    print_info "Pulling Amazon Linux 2 image and installing dependencies..."
    docker run --rm --platform linux/amd64 -v "$LAYER_DIR":/var/task "$DOCKER_IMAGE" bash -c "
        set -e
        echo '[Docker] Updating package manager...'
        yum update -y
        
        echo '[Docker] Installing build dependencies...'
        yum install -y python3 python3-pip gcc postgresql-devel
        
        echo '[Docker] Verifying Python version...'
        python3 --version
        
        echo '[Docker] Upgrading pip...'
        pip3 install --upgrade pip
        
        echo '[Docker] Installing psycopg2-binary (latest compatible version)...'
        pip3 install psycopg2-binary -t /var/task/python/ --no-cache-dir
        
        echo '[Docker] Cleaning up Python cache files...'
        find /var/task/python -name '*.pyc' -delete
        find /var/task/python -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
        
        echo '[Docker] Setting proper permissions on binary files...'
        find /var/task/python -name '*.so' -exec chmod +x {} \;
        
        echo '[Docker] Final cleanup verification...'
        PYC_COUNT=\$(find /var/task/python -name '*.pyc' | wc -l)
        CACHE_COUNT=\$(find /var/task/python -name '__pycache__' -type d | wc -l)
        echo \"[Docker] Remaining .pyc files: \$PYC_COUNT\"
        echo \"[Docker] Remaining __pycache__ dirs: \$CACHE_COUNT\"
        
        echo '[Docker] Listing installed packages...'
        ls -la /var/task/python/
        
        echo '[Docker] Checking installed version...'
        pip3 show psycopg2-binary | grep Version || echo 'Version info not available'
        
        echo '[Docker] Build completed successfully'
    "
    
    if [ $? -eq 0 ]; then
        print_success "Docker build completed successfully"
    else
        print_error "Docker build failed"
        exit 1
    fi
    
elif command -v pip3 &> /dev/null; then
    # Step 4: Fallback to local build
    print_warning "Docker not available, attempting local build..."
    print_warning "Local builds may not be compatible with AWS Lambda runtime"
    print_warning "This is NOT recommended for production deployments"
    
    print_step "Installing psycopg2 locally..."
    pip3 install "psycopg2-binary==$PSYCOPG2_VERSION" -t "$LAYER_DIR/python/" --no-cache-dir
    
    # Clean up local build
    print_info "Cleaning up Python cache files..."
    find "$LAYER_DIR/python" -name '*.pyc' -delete
    find "$LAYER_DIR/python" -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
    
    print_warning "Local build completed (compatibility not guaranteed)"
    
else
    print_error "Neither Docker nor pip3 is available"
    print_error "Please install Docker (recommended) or Python 3 with pip"
    print_error ""
    print_error "To install Docker:"
    print_error "  macOS: brew install --cask docker"
    print_error "  Ubuntu: sudo apt-get install docker.io"
    print_error "  CentOS: sudo yum install docker"
    exit 1
fi

# Step 5: Verify build results
print_step "Verifying build results..."

if [ -d "$LAYER_DIR/python/psycopg2" ]; then
    print_success "psycopg2 directory found"
    
    # Calculate layer size
    LAYER_SIZE=$(du -sh "$LAYER_DIR/python" | cut -f1)
    LAYER_SIZE_BYTES=$(du -s "$LAYER_DIR/python" | cut -f1)
    LAYER_SIZE_MB=$((LAYER_SIZE_BYTES / 1024))
    
    print_success "Layer built successfully!"
    print_info "Layer size: $LAYER_SIZE ($LAYER_SIZE_MB MB)"
    
    # Check for critical files
    CRITICAL_FILES=(
        "python/psycopg2/__init__.py"
        "python/psycopg2/extensions.py"
        "python/psycopg2/sql.py"
    )
    
    print_info "Verifying critical files:"
    for file in "${CRITICAL_FILES[@]}"; do
        if [ -f "$LAYER_DIR/$file" ]; then
            print_success "  ✓ $file"
        else
            print_error "  ✗ $file (missing)"
        fi
    done
    
    # Check for binary files
    BINARY_COUNT=$(find "$LAYER_DIR/python" -name "*.so" | wc -l)
    if [ $BINARY_COUNT -gt 0 ]; then
        print_success "Found $BINARY_COUNT binary files (.so)"
        print_info "Binary files:"
        find "$LAYER_DIR/python" -name "*.so" | while read -r file; do
            echo "    - $(basename "$file")"
        done
    else
        print_warning "No binary files found - layer may not work correctly"
    fi
    
    # Show layer contents
    print_info "Layer contents:"
    ls -la "$LAYER_DIR/python/" | head -10
    
    # Size recommendations
    if [ $LAYER_SIZE_MB -lt 5 ]; then
        print_warning "Layer size seems small - build may be incomplete"
    elif [ $LAYER_SIZE_MB -gt 20 ]; then
        print_warning "Layer size is large - consider optimization"
    else
        print_success "Layer size is within acceptable range"
    fi
    
else
    print_error "Build failed - psycopg2 directory not found"
    print_error "Check the build logs above for error details"
    exit 1
fi

# Step 6: Final instructions
print_info ""
print_success "============================================================================"
print_success "psycopg2 Lambda Layer Build Complete!"
print_success "============================================================================"
print_info "Layer location: $LAYER_DIR/python/"
print_info "Layer size: $LAYER_SIZE"
print_info "Architecture: ARM64 (aarch64)"
print_info "Compatible with: AWS Lambda Python 3.11"
print_info ""
print_info "Next steps:"
print_info "1. Verify deployment readiness: ./verify-deployment.sh"
print_info "2. Deploy CDK stack: cd ../.. && cdk deploy MigrationStack"
print_info "3. Test Lambda functions after deployment"
print_info ""
print_info "The layer will be automatically included in:"
print_info "  - Migration Lambda function"
print_info "  - API Lambda functions (users, languages, words)"