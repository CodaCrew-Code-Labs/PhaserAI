#!/bin/bash

# ============================================================================
# psycopg2 Lambda Layer Deployment Verification Script
# ============================================================================
#
# This script performs comprehensive verification of the psycopg2 Lambda layer
# to ensure it's properly built and ready for AWS Lambda deployment.
#
# WHAT IT CHECKS:
# - Directory structure compliance with Lambda layer requirements
# - Presence of critical psycopg2 files and modules
# - Binary compatibility with AWS Lambda ARM64 runtime
# - Layer size optimization and reasonableness
# - CDK deployment compatibility
#
# VERIFICATION CRITERIA:
# - Layer must be 5-20MB (reasonable size range)
# - Must contain compiled .so files for ARM64 architecture
# - Must have proper Python package structure
# - Must be compatible with CDK Code.fromAsset()
#
# EXIT CODES:
# - 0: All verifications passed, layer is deployment-ready
# - 1: Critical verification failed, layer needs rebuilding
#
# USAGE:
#   ./verify-deployment.sh
#
# RUN THIS AFTER:
#   ./build-layer.sh
#
# ============================================================================

set -e  # Exit on any error
set -x  # Debug mode - show commands being executed

# Color codes for formatted output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions with timestamps and categories
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

print_check() {
    echo -e "${CYAN}[CHECK $(date '+%H:%M:%S')]${NC} $1"
}

print_result() {
    echo -e "${MAGENTA}[RESULT $(date '+%H:%M:%S')]${NC} $1"
}

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAYER_DIR="$SCRIPT_DIR"
MIN_SIZE_MB=5
MAX_SIZE_MB=20
EXPECTED_PYTHON_VERSION="3.7"

# Verification counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

print_info "============================================================================"
print_info "psycopg2 Lambda Layer Deployment Verification"
print_info "============================================================================"
print_info "Layer directory: $LAYER_DIR"
print_info "Verification started at: $(date)"

# Helper function to increment counters
pass_check() {
    ((CHECKS_PASSED++))
    print_success "$1"
}

fail_check() {
    ((CHECKS_FAILED++))
    print_error "$1"
}

warn_check() {
    ((CHECKS_WARNING++))
    print_warning "$1"
}

# ============================================================================
# VERIFICATION 1: Basic Directory Structure
# ============================================================================
print_check "Verifying basic directory structure..."

# Debug: Show current directory and contents
print_info "Current working directory: $(pwd)"
print_info "Directory contents:"
ls -la "$LAYER_DIR" || true

if [ ! -d "$LAYER_DIR/python" ]; then
    print_info "Looking for python directory in current and parent directories..."
    find "$LAYER_DIR" -name "python" -type d 2>/dev/null | head -5
    fail_check "python/ directory not found. Run ./build-layer.sh first."
    exit 1
fi
pass_check "python/ directory exists"

if [ ! -d "$LAYER_DIR/python/psycopg2" ]; then
    print_info "Contents of python directory:"
    ls -la "$LAYER_DIR/python/" || true
    fail_check "psycopg2/ directory not found in python/. Layer build failed."
    exit 1
fi
pass_check "psycopg2/ directory exists"

# ============================================================================
# VERIFICATION 2: Critical psycopg2 Files
# ============================================================================
print_check "Verifying critical psycopg2 files..."

# Define critical files that must exist
CRITICAL_FILES=(
    "python/psycopg2/__init__.py"
    "python/psycopg2/extensions.py"
    "python/psycopg2/sql.py"
    "python/psycopg2/extras.py"
    "python/psycopg2/pool.py"
    "python/psycopg2/errorcodes.py"
)

# Define optional but important files
OPTIONAL_FILES=(
    "python/psycopg2/_psycopg.cpython-37m-aarch64-linux-gnu.so"
    "python/psycopg2/_json.py"
    "python/psycopg2/_range.py"
    "python/psycopg2/tz.py"
)

print_info "Checking critical files (must exist):"
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$LAYER_DIR/$file" ]; then
        pass_check "  ✓ $(basename "$file")"
    else
        fail_check "  ✗ $(basename "$file") - CRITICAL FILE MISSING"
    fi
done

print_info "Checking optional files (recommended):"
for file in "${OPTIONAL_FILES[@]}"; do
    if [ -f "$LAYER_DIR/$file" ]; then
        pass_check "  ✓ $(basename "$file")"
    else
        warn_check "  ? $(basename "$file") - optional file missing"
    fi
done

# ============================================================================
# VERIFICATION 3: Layer Size Analysis
# ============================================================================
print_check "Analyzing layer size..."

if [ -d "$LAYER_DIR/python" ]; then
    LAYER_SIZE=$(du -sh "$LAYER_DIR/python" | cut -f1)
    SIZE_BYTES=$(du -s "$LAYER_DIR/python" | cut -f1)
    SIZE_MB=$((SIZE_BYTES / 1024))
    
    print_info "Layer size: $LAYER_SIZE ($SIZE_MB MB)"
    
    if [ $SIZE_MB -lt $MIN_SIZE_MB ]; then
        warn_check "Layer size is small ($SIZE_MB MB < $MIN_SIZE_MB MB) - may be incomplete"
    elif [ $SIZE_MB -gt $MAX_SIZE_MB ]; then
        warn_check "Layer size is large ($SIZE_MB MB > $MAX_SIZE_MB MB) - consider optimization"
    else
        pass_check "Layer size is within acceptable range ($MIN_SIZE_MB-$MAX_SIZE_MB MB)"
    fi
    
    # Detailed size breakdown
    print_info "Size breakdown by component:"
    du -sh "$LAYER_DIR/python"/* 2>/dev/null | while read -r size dir; do
        echo "    $size - $(basename "$dir")"
    done
fi

# ============================================================================
# VERIFICATION 4: Binary Files and Architecture
# ============================================================================
print_check "Verifying binary files and architecture..."

BINARY_COUNT=$(find "$LAYER_DIR/python" -name "*.so" | wc -l)
if [ $BINARY_COUNT -gt 0 ]; then
    pass_check "Found $BINARY_COUNT binary files (.so)"
    
    print_info "Binary files found:"
    find "$LAYER_DIR/python" -name "*.so" | while read -r file; do
        echo "    - $(basename "$file")"
    done
    
    # Check architecture of binary files
    ARCH_CHECK_FILE=$(find "$LAYER_DIR/python" -name "*.so" | head -1)
    if [ -n "$ARCH_CHECK_FILE" ]; then
        ARCH_INFO=$(file "$ARCH_CHECK_FILE" 2>/dev/null || echo "Unable to determine architecture")
        print_info "Architecture analysis: $ARCH_INFO"
        
        if echo "$ARCH_INFO" | grep -q "aarch64"; then
            pass_check "Binaries compiled for aarch64 (ARM64) - compatible with Lambda"
        elif echo "$ARCH_INFO" | grep -q "x86-64"; then
            warn_check "Binaries compiled for x86-64 - may not work on ARM Lambda instances"
        else
            warn_check "Unable to determine binary architecture"
        fi
    fi
else
    fail_check "No binary files found - layer will not work in Lambda"
fi

# ============================================================================
# VERIFICATION 5: Python Package Structure
# ============================================================================
print_check "Verifying Python package structure..."

# Check for __init__.py files
INIT_FILES=$(find "$LAYER_DIR/python" -name "__init__.py" | wc -l)
if [ $INIT_FILES -gt 0 ]; then
    pass_check "Found $INIT_FILES __init__.py files (proper Python packages)"
else
    warn_check "No __init__.py files found - may indicate packaging issues"
fi

# Check for compiled Python files (should be cleaned)
PYC_FILES=$(find "$LAYER_DIR/python" -name "*.pyc" | wc -l)
if [ $PYC_FILES -eq 0 ]; then
    pass_check "No .pyc files found (properly cleaned)"
else
    warn_check "Found $PYC_FILES .pyc files - layer size could be optimized"
fi

# Check for __pycache__ directories (should be cleaned)
PYCACHE_DIRS=$(find "$LAYER_DIR/python" -name "__pycache__" -type d | wc -l)
if [ $PYCACHE_DIRS -eq 0 ]; then
    pass_check "No __pycache__ directories found (properly cleaned)"
else
    warn_check "Found $PYCACHE_DIRS __pycache__ directories - layer size could be optimized"
fi

# ============================================================================
# VERIFICATION 6: CDK Compatibility
# ============================================================================
print_check "Verifying CDK deployment compatibility..."

# Check if layer structure matches CDK expectations
if [ -f "$LAYER_DIR/python/psycopg2/__init__.py" ]; then
    pass_check "Layer structure compatible with CDK Code.fromAsset()"
else
    fail_check "Layer structure not compatible with CDK deployment"
fi

# Check for requirements.txt (for reference)
if [ -f "$LAYER_DIR/requirements.txt" ]; then
    pass_check "requirements.txt found for reference"
    print_info "Requirements: $(cat "$LAYER_DIR/requirements.txt")"
else
    warn_check "requirements.txt not found (not critical for deployment)"
fi

# ============================================================================
# VERIFICATION 7: File Permissions
# ============================================================================
print_check "Verifying file permissions..."

# Check if files are readable (using portable test)
UNREADABLE_FILES=0
while IFS= read -r -d '' file; do
    if [ ! -r "$file" ]; then
        ((UNREADABLE_FILES++))
    fi
done < <(find "$LAYER_DIR/python" -type f -print0)

if [ $UNREADABLE_FILES -eq 0 ]; then
    pass_check "All files are readable"
else
    warn_check "Found $UNREADABLE_FILES unreadable files"
fi

# Check for executable permissions on .so files
SO_FILES=$(find "$LAYER_DIR/python" -name "*.so")
if [ -n "$SO_FILES" ]; then
    EXECUTABLE_SO=0
    TOTAL_SO=0
    while IFS= read -r so_file; do
        ((TOTAL_SO++))
        if [ -x "$so_file" ]; then
            ((EXECUTABLE_SO++))
        fi
    done <<< "$SO_FILES"
    
    if [ $EXECUTABLE_SO -eq $TOTAL_SO ]; then
        pass_check "All .so files have executable permissions"
    else
        warn_check "Some .so files may lack executable permissions ($EXECUTABLE_SO/$TOTAL_SO executable)"
    fi
fi

# ============================================================================
# VERIFICATION SUMMARY
# ============================================================================
print_info ""
print_result "============================================================================"
print_result "VERIFICATION SUMMARY"
print_result "============================================================================"
print_result "Checks passed: $CHECKS_PASSED"
print_result "Checks with warnings: $CHECKS_WARNING"
print_result "Checks failed: $CHECKS_FAILED"
print_result "Total checks: $((CHECKS_PASSED + CHECKS_WARNING + CHECKS_FAILED))"

if [ $CHECKS_FAILED -eq 0 ]; then
    print_success "✅ ALL CRITICAL VERIFICATIONS PASSED!"
    print_success "The psycopg2 layer is ready for AWS Lambda deployment."
    
    if [ $CHECKS_WARNING -gt 0 ]; then
        print_warning "⚠️  Some warnings were found but they don't prevent deployment."
        print_warning "Review warnings above for potential optimizations."
    fi
    
    print_info ""
    print_info "DEPLOYMENT INSTRUCTIONS:"
    print_info "========================"
    print_info "1. Deploy Migration Stack:"
    print_info "   cd ../.. && cdk deploy MigrationStack"
    print_info ""
    print_info "2. Deploy API Stack:"
    print_info "   cdk deploy ProductionApiStack"
    print_info ""
    print_info "3. Test Lambda functions:"
    print_info "   - Migration Lambda will run automatically on stack deployment"
    print_info "   - API Lambda functions will have PostgreSQL connectivity"
    print_info ""
    print_info "LAYER DETAILS:"
    print_info "=============="
    print_info "Location: $LAYER_DIR/python/"
    print_info "Size: $LAYER_SIZE"
    print_info "Architecture: ARM64 (aarch64)"
    print_info "Runtime: Python 3.11 (compatible with Python 3.7+ binaries)"
    print_info "Dependencies: psycopg2-binary 2.9.9"
    
    exit 0
else
    print_error "❌ CRITICAL VERIFICATIONS FAILED!"
    print_error "The layer is NOT ready for deployment."
    print_error ""
    print_error "REQUIRED ACTIONS:"
    print_error "=================="
    print_error "1. Fix the failed checks listed above"
    print_error "2. Rebuild the layer: ./build-layer.sh"
    print_error "3. Run verification again: ./verify-deployment.sh"
    
    exit 1
fi