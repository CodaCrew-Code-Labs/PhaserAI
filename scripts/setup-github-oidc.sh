#!/bin/bash

# ============================================================================
# GitHub OIDC Setup Script
# ============================================================================
#
# This script helps you configure GitHub secrets for OIDC authentication
# with AWS ECR. It extracts the necessary values from your deployed CDK stack.
#
# USAGE:
#   ./scripts/setup-github-oidc.sh
#
# ============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

echo "============================================================================"
echo "GitHub OIDC Setup for ECR"
echo "============================================================================"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install it first."
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

# Get AWS account and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

print_info "AWS Account: $AWS_ACCOUNT"
print_info "AWS Region: $AWS_REGION"

# Check if ECR stack exists
STACK_NAME="phaserai-ecr-dev"
print_step "Checking CDK ECR stack..."

if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" &> /dev/null; then
    print_error "CDK ECR stack not found: $STACK_NAME"
    print_info "Deploy it first: ./scripts/deploy-ecr.sh"
    exit 1
fi

print_success "CDK ECR stack found"

# Get OIDC role ARN
print_step "Extracting OIDC role ARN..."
ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`GitHubOidcRoleArn`].OutputValue' \
    --output text)

if [ -z "$ROLE_ARN" ] || [ "$ROLE_ARN" = "None" ]; then
    print_error "Could not find OIDC role ARN in stack outputs"
    print_info "Check if the stack deployed correctly"
    exit 1
fi

print_success "OIDC role ARN: $ROLE_ARN"

# Get repository URI
print_step "Extracting ECR repository URI..."
REPO_URI=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
    --output text)

if [ -z "$REPO_URI" ] || [ "$REPO_URI" = "None" ]; then
    print_error "Could not find repository URI in stack outputs"
    exit 1
fi

print_success "ECR repository URI: $REPO_URI"

# Check if GitHub OIDC provider exists
print_step "Checking GitHub OIDC provider..."
OIDC_PROVIDER_ARN="arn:aws:iam::$AWS_ACCOUNT:oidc-provider/token.actions.githubusercontent.com"

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" &> /dev/null; then
    print_success "GitHub OIDC provider exists"
else
    print_warning "GitHub OIDC provider not found"
    print_info "Creating GitHub OIDC provider..."
    
    aws iam create-open-id-connect-provider \
        --url https://token.actions.githubusercontent.com \
        --client-id-list sts.amazonaws.com \
        --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
    
    print_success "GitHub OIDC provider created"
fi

# Get current Git repository info
print_step "Getting repository information..."
if git remote get-url origin &> /dev/null; then
    REPO_URL=$(git remote get-url origin)
    GITHUB_REPO=$(echo "$REPO_URL" | sed 's/.*github.com[:/]//; s/.git$//')
    print_info "GitHub repository: $GITHUB_REPO"
else
    print_warning "Could not determine GitHub repository"
    GITHUB_REPO="your-org/your-repo"
fi

# Display setup instructions
echo ""
echo "============================================================================"
echo "GitHub Secrets Configuration"
echo "============================================================================"

print_success "✅ ECR repository and OIDC role are ready!"
print_info ""
print_info "Add the following secrets to your GitHub repository:"
print_info "https://github.com/$GITHUB_REPO/settings/secrets/actions"
print_info ""

echo "┌─────────────────────────────────────────────────────────────────────────┐"
echo "│                          GITHUB SECRETS                                │"
echo "├─────────────────────────────────────────────────────────────────────────┤"
echo "│ Secret Name: AWS_ROLE_ARN                                              │"
echo "│ Value: $ROLE_ARN"
echo "│                                                                         │"
echo "│ Secret Name: AWS_ACCOUNT_ID                                             │"
echo "│ Value: $AWS_ACCOUNT_ID                                                  │"
echo "└─────────────────────────────────────────────────────────────────────────┘"

print_info ""
print_info "Optional secrets (for Supabase integration):"
echo "┌─────────────────────────────────────────────────────────────────────────┐"
echo "│ Secret Name: VITE_SUPABASE_URL                                          │"
echo "│ Value: https://your-project.supabase.co                                │"
echo "│                                                                         │"
echo "│ Secret Name: VITE_SUPABASE_ANON_KEY                                     │"
echo "│ Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...                          │"
echo "└─────────────────────────────────────────────────────────────────────────┘"

print_info ""
print_info "After adding the secrets:"
print_info "1. Push to master/main/develop branch to trigger ECR push"
print_info "2. Or manually run the workflow in GitHub Actions"
print_info "3. Check the workflow logs for the debug output"

echo ""
echo "============================================================================"
echo "Verification Commands"
echo "============================================================================"

print_info "To verify the setup:"
echo ""
echo "# Check ECR repository"
echo "aws ecr describe-repositories --repository-names phaserai --region $AWS_REGION"
echo ""
echo "# List images (after first push)"
echo "aws ecr list-images --repository-name phaserai --region $AWS_REGION"
echo ""
echo "# Check workflow status"
echo "https://github.com/$GITHUB_REPO/actions"

echo ""
print_success "Setup complete! Configure the GitHub secrets and push to trigger ECR push."