#!/bin/bash

# ============================================================================
# ECR Deployment Script
# ============================================================================
#
# This script deploys the ECR repository and related infrastructure using CDK.
# It handles the complete setup process including dependency installation,
# CDK bootstrap, and stack deployment.
#
# USAGE:
#   ./scripts/deploy-ecr.sh [environment]
#
# PARAMETERS:
#   environment - Target environment (default: dev)
#
# EXAMPLES:
#   ./scripts/deploy-ecr.sh          # Deploy to dev environment
#   ./scripts/deploy-ecr.sh prod     # Deploy to prod environment
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

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Configuration
ENVIRONMENT=${1:-dev}
APP_NAME="phaserai"
STACK_NAME="${APP_NAME}-ecr-${ENVIRONMENT}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$PROJECT_ROOT/infra"

print_info "============================================================================"
print_info "PhaserAI ECR Deployment Script"
print_info "============================================================================"
print_info "Environment: $ENVIRONMENT"
print_info "Stack Name: $STACK_NAME"
print_info "Infrastructure Directory: $INFRA_DIR"

# Step 1: Verify prerequisites
print_step "Verifying prerequisites..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first:"
    print_error "  https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if CDK CLI is installed
if ! command -v cdk &> /dev/null; then
    print_error "CDK CLI is not installed. Installing globally..."
    npm install -g aws-cdk
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

print_success "Prerequisites verified"
print_info "AWS Account: $AWS_ACCOUNT"
print_info "AWS Region: $AWS_REGION"

# Step 2: Navigate to infrastructure directory
print_step "Setting up infrastructure environment..."

if [ ! -d "$INFRA_DIR" ]; then
    print_error "Infrastructure directory not found: $INFRA_DIR"
    exit 1
fi

cd "$INFRA_DIR"

# Step 3: Install dependencies
print_step "Installing CDK dependencies..."

if [ ! -f "package.json" ]; then
    print_error "package.json not found in infrastructure directory"
    exit 1
fi

npm ci
print_success "Dependencies installed"

# Step 4: Build TypeScript
print_step "Building TypeScript code..."
npm run build
print_success "TypeScript build completed"

# Step 5: Bootstrap CDK (if needed)
print_step "Checking CDK bootstrap status..."

if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region "$AWS_REGION" &> /dev/null; then
    print_warning "CDK not bootstrapped in this region. Bootstrapping..."
    cdk bootstrap "aws://$AWS_ACCOUNT/$AWS_REGION"
    print_success "CDK bootstrap completed"
else
    print_info "CDK already bootstrapped"
fi

# Step 6: Synthesize stack
print_step "Synthesizing CDK stack..."
cdk synth "$STACK_NAME" > /dev/null
print_success "Stack synthesis completed"

# Step 7: Deploy ECR stack
print_step "Deploying ECR stack..."
print_info "This may take a few minutes..."

if cdk deploy "$STACK_NAME" --require-approval never; then
    print_success "ECR stack deployed successfully!"
else
    print_error "ECR stack deployment failed"
    exit 1
fi

# Step 8: Display outputs
print_step "Retrieving stack outputs..."

OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs' \
    --output table)

if [ $? -eq 0 ]; then
    print_success "Stack outputs:"
    echo "$OUTPUTS"
else
    print_warning "Could not retrieve stack outputs"
fi

# Step 9: Get specific values for GitHub setup
print_step "Extracting values for GitHub Actions setup..."

REPO_URI=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
    --output text)

ACCESS_KEY_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`AccessKeyId`].OutputValue' \
    --output text)

SECRET_ACCESS_KEY=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`SecretAccessKey`].OutputValue' \
    --output text)

GITHUB_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`GitHubOidcRoleArn`].OutputValue' \
    --output text)

# Step 10: Provide setup instructions
print_success "============================================================================"
print_success "ECR Deployment Complete!"
print_success "============================================================================"

if [ -n "$REPO_URI" ]; then
    print_info "ECR Repository URI: $REPO_URI"
    print_info ""
    print_info "Next Steps:"
    print_info "1. Add the following secrets to your GitHub repository:"
    print_info ""
    print_info "   Option A - Using IAM User (Simpler):"
    print_info "   AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID"
    print_info "   AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY"
    print_info "   AWS_ACCOUNT_ID=$AWS_ACCOUNT"
    print_info ""
    print_info "   Option B - Using OIDC Role (More Secure):"
    print_info "   AWS_ROLE_ARN=$GITHUB_ROLE_ARN"
    print_info "   AWS_ACCOUNT_ID=$AWS_ACCOUNT"
    print_info ""
    print_info "2. Push to main branch to trigger Docker image build and push"
    print_info ""
    print_info "3. View your repository in AWS Console:"
    print_info "   https://console.aws.amazon.com/ecr/repositories/private/$AWS_ACCOUNT/$APP_NAME?region=$AWS_REGION"
    print_info ""
    print_info "4. (Optional) Deploy container infrastructure:"
    print_info "   cdk deploy ${APP_NAME}-container-${ENVIRONMENT}"
else
    print_error "Could not retrieve repository URI from stack outputs"
    print_info "Check the AWS CloudFormation console for more details"
fi

print_info ""
print_info "For more information, see docs/CDK_ECR_DEPLOYMENT.md"
print_success "Deployment script completed successfully!"