#!/bin/bash

# Deployment script for Node.js Lambda migration

set -e

echo "🚀 Starting Lambda migration deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK is not installed"
    exit 1
fi

print_status "Prerequisites check passed"

# Navigate to project root
cd "$(dirname "$0")/.."

# Build Lambda functions
echo "🔨 Building Lambda functions..."
cd infra/lambda-functions-nodejs

if [ ! -f "package.json" ]; then
    print_error "Lambda functions package.json not found"
    exit 1
fi

print_status "Installing Lambda dependencies..."
npm install

print_status "Compiling TypeScript..."
npm run build

if [ ! -d "dist" ]; then
    print_error "TypeScript compilation failed - dist directory not found"
    exit 1
fi

print_status "Lambda functions built successfully"

# Build infrastructure
echo "🏗️ Building infrastructure..."
cd ../

print_status "Installing infrastructure dependencies..."
npm install

print_status "Compiling infrastructure TypeScript..."
npm run build

print_status "Infrastructure built successfully"

# Validate CDK synthesis
echo "🔍 Validating CDK synthesis..."
npm run synth > /dev/null

print_status "CDK synthesis validation passed"

# Show deployment plan
echo "📊 Deployment plan:"
echo "  - Runtime: Python 3.11 → Node.js 20.x"
echo "  - Functions: health, users, languages, words, migration"
echo "  - Database: PostgreSQL (no changes)"
echo "  - API: Same endpoints and functionality"

# Confirm deployment
if [ "$1" != "--auto" ]; then
    echo ""
    read -p "🤔 Do you want to proceed with deployment? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
fi

# Deploy
echo "🚀 Deploying to AWS..."

# Deploy with progress
npm run deploy

if [ $? -eq 0 ]; then
    print_status "Deployment completed successfully!"
    echo ""
    echo "🎉 Lambda migration from Python to Node.js completed!"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Test API endpoints"
    echo "  2. Monitor CloudWatch logs"
    echo "  3. Check performance metrics"
    echo "  4. Validate database operations"
    echo ""
    echo "📊 Monitor the deployment:"
    echo "  - CloudWatch Logs: Check for any errors"
    echo "  - API Gateway: Test endpoint responses"
    echo "  - Lambda Metrics: Monitor cold start times"
    echo ""
else
    print_error "Deployment failed!"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "  1. Check AWS credentials and permissions"
    echo "  2. Verify CDK bootstrap is complete"
    echo "  3. Check CloudFormation stack status"
    echo "  4. Review error logs above"
    echo ""
    echo "🔄 To rollback if needed:"
    echo "  1. Revert CDK stack changes to Python runtime"
    echo "  2. Update asset paths to lambda-functions/"
    echo "  3. Redeploy with: npm run deploy"
    exit 1
fi