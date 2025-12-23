#!/bin/bash

# Validation script for Lambda migration

set -e

echo "🧪 Validating Lambda migration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Get API URL from CDK outputs
get_api_url() {
    cd "$(dirname "$0")/../infra"
    API_URL=$(cdk list --json | jq -r '.[] | select(contains("api")) | .' 2>/dev/null || echo "")
    if [ -z "$API_URL" ]; then
        print_warning "Could not automatically detect API URL"
        echo "Please provide the API Gateway URL:"
        read -p "API URL: " API_URL
    fi
    echo "$API_URL"
}

# Test health endpoint
test_health() {
    print_info "Testing health endpoint..."
    
    local response=$(curl -s -w "%{http_code}" "$API_URL/health" -o /tmp/health_response.json)
    local http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        local status=$(cat /tmp/health_response.json | jq -r '.status' 2>/dev/null || echo "unknown")
        if [ "$status" = "healthy" ]; then
            print_status "Health endpoint working correctly"
            return 0
        else
            print_error "Health endpoint returned unexpected status: $status"
            return 1
        fi
    else
        print_error "Health endpoint returned HTTP $http_code"
        cat /tmp/health_response.json 2>/dev/null || echo "No response body"
        return 1
    fi
}

# Test database connectivity
test_database() {
    print_info "Testing database connectivity via Lambda..."
    
    # This would require invoking a Lambda function directly
    # For now, we'll check if the migration function exists
    cd "$(dirname "$0")/../infra"
    
    local migration_function=$(aws lambda list-functions --query 'Functions[?contains(FunctionName, `Migration`)].FunctionName' --output text 2>/dev/null || echo "")
    
    if [ -n "$migration_function" ]; then
        print_status "Migration function found: $migration_function"
        
        # Test migration status
        local result=$(aws lambda invoke --function-name "$migration_function" --payload '{"action":"status"}' /tmp/migration_response.json 2>/dev/null && cat /tmp/migration_response.json || echo '{"success":false}')
        local success=$(echo "$result" | jq -r '.success' 2>/dev/null || echo "false")
        
        if [ "$success" = "true" ]; then
            print_status "Database connectivity test passed"
            return 0
        else
            print_warning "Database connectivity test inconclusive"
            return 1
        fi
    else
        print_warning "Migration function not found - skipping database test"
        return 1
    fi
}

# Test Lambda function runtime
test_runtime() {
    print_info "Checking Lambda function runtimes..."
    
    local functions=$(aws lambda list-functions --query 'Functions[?contains(FunctionName, `phaserai`)].{Name:FunctionName,Runtime:Runtime}' --output json 2>/dev/null || echo '[]')
    
    if [ "$functions" = "[]" ]; then
        print_warning "No PhaserAI Lambda functions found"
        return 1
    fi
    
    local node_count=$(echo "$functions" | jq '[.[] | select(.Runtime | startswith("nodejs"))] | length')
    local python_count=$(echo "$functions" | jq '[.[] | select(.Runtime | startswith("python"))] | length')
    
    print_info "Found $node_count Node.js functions and $python_count Python functions"
    
    if [ "$node_count" -gt 0 ]; then
        print_status "Node.js Lambda functions detected"
        echo "$functions" | jq -r '.[] | select(.Runtime | startswith("nodejs")) | "  - \(.Name): \(.Runtime)"'
        return 0
    else
        print_error "No Node.js Lambda functions found"
        return 1
    fi
}

# Test build artifacts
test_build() {
    print_info "Checking build artifacts..."
    
    cd "$(dirname "$0")/../infra/lambda-functions-nodejs"
    
    if [ ! -d "dist" ]; then
        print_error "TypeScript build output not found"
        return 1
    fi
    
    local js_files=$(find dist -name "*.js" | wc -l)
    if [ "$js_files" -gt 0 ]; then
        print_status "Found $js_files compiled JavaScript files"
        ls -la dist/*.js | sed 's/^/  /'
        return 0
    else
        print_error "No compiled JavaScript files found"
        return 1
    fi
}

# Main validation
main() {
    echo "🔍 Starting validation checks..."
    echo ""
    
    local passed=0
    local total=0
    
    # Test 1: Build artifacts
    total=$((total + 1))
    if test_build; then
        passed=$((passed + 1))
    fi
    echo ""
    
    # Test 2: Lambda runtime
    total=$((total + 1))
    if test_runtime; then
        passed=$((passed + 1))
    fi
    echo ""
    
    # Test 3: Health endpoint (if API URL provided)
    if [ -n "${API_URL:-}" ] || [ "$1" = "--with-api" ]; then
        if [ -z "${API_URL:-}" ]; then
            API_URL=$(get_api_url)
        fi
        
        if [ -n "$API_URL" ]; then
            total=$((total + 1))
            if test_health; then
                passed=$((passed + 1))
            fi
            echo ""
        fi
    fi
    
    # Test 4: Database connectivity
    total=$((total + 1))
    if test_database; then
        passed=$((passed + 1))
    fi
    echo ""
    
    # Summary
    echo "📊 Validation Summary:"
    echo "  Passed: $passed/$total tests"
    
    if [ "$passed" -eq "$total" ]; then
        print_status "All validation tests passed! 🎉"
        echo ""
        echo "✅ Migration appears successful:"
        echo "  - Lambda functions compiled correctly"
        echo "  - Node.js runtime detected"
        echo "  - Basic functionality working"
        echo ""
        return 0
    else
        print_warning "Some validation tests failed"
        echo ""
        echo "🔧 Recommended actions:"
        echo "  - Check CloudWatch logs for errors"
        echo "  - Verify deployment completed successfully"
        echo "  - Test API endpoints manually"
        echo ""
        return 1
    fi
}

# Run validation
main "$@"