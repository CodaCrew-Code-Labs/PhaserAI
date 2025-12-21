#!/bin/bash

# ============================================================================
# ECR Status Check Script
# ============================================================================
#
# This script checks the current status of ECR setup and GitHub Actions
# configuration to help troubleshoot why ECR push might be skipped.
#
# USAGE:
#   ./scripts/check-ecr-status.sh
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
print_step() { echo -e "${CYAN}[CHECK]${NC} $1"; }

echo "============================================================================"
echo "ECR Status Check"
echo "============================================================================"

# Check 1: Git branch
print_step "Checking current Git branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

SUPPORTED_BRANCHES=("main" "master" "develop")
if [[ " ${SUPPORTED_BRANCHES[@]} " =~ " ${CURRENT_BRANCH} " ]]; then
    print_success "✅ Current branch ($CURRENT_BRANCH) is supported for ECR push"
else
    print_warning "⚠️ Current branch ($CURRENT_BRANCH) may not trigger ECR push"
    print_info "Supported branches: main, master, develop"
    print_info "Switch with: git checkout main"
fi

# Check 2: Remote branches
print_step "Checking remote branches..."
git fetch --quiet
REMOTE_BRANCHES=$(git branch -r | grep -E "(main|master|develop)" | sed 's/origin\///' | tr -d ' ')
echo "Available remote branches: $REMOTE_BRANCHES"

# Check 3: AWS CLI
print_step "Checking AWS CLI configuration..."
if command -v aws &> /dev/null; then
    if aws sts get-caller-identity &> /dev/null; then
        AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
        AWS_REGION=$(aws configure get region || echo "us-east-1")
        print_success "✅ AWS CLI configured"
        echo "Account: $AWS_ACCOUNT"
        echo "Region: $AWS_REGION"
    else
        print_error "❌ AWS credentials not configured"
        print_info "Run: aws configure"
    fi
else
    print_error "❌ AWS CLI not installed"
fi

# Check 4: ECR Repository
print_step "Checking ECR repository..."
if command -v aws &> /dev/null && aws sts get-caller-identity &> /dev/null; then
    if aws ecr describe-repositories --repository-names phaserai &> /dev/null; then
        REPO_URI=$(aws ecr describe-repositories --repository-names phaserai --query 'repositories[0].repositoryUri' --output text)
        print_success "✅ ECR repository exists"
        echo "Repository URI: $REPO_URI"
        
        # Check images
        IMAGE_COUNT=$(aws ecr list-images --repository-name phaserai --query 'length(imageIds)' --output text)
        echo "Images in repository: $IMAGE_COUNT"
    else
        print_warning "⚠️ ECR repository 'phaserai' not found"
        print_info "Deploy with: ./scripts/deploy-ecr.sh"
    fi
fi

# Check 5: CDK Stack
print_step "Checking CDK ECR stack..."
if command -v aws &> /dev/null && aws sts get-caller-identity &> /dev/null; then
    STACK_NAME="phaserai-ecr-dev"
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" &> /dev/null; then
        STACK_STATUS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].StackStatus' --output text)
        print_success "✅ CDK ECR stack exists"
        echo "Stack status: $STACK_STATUS"
        
        if [ "$STACK_STATUS" = "CREATE_COMPLETE" ] || [ "$STACK_STATUS" = "UPDATE_COMPLETE" ]; then
            print_success "✅ Stack is in good state"
        else
            print_warning "⚠️ Stack may need attention: $STACK_STATUS"
        fi
    else
        print_warning "⚠️ CDK ECR stack not found"
        print_info "Deploy with: ./scripts/deploy-ecr.sh"
    fi
fi

# Check 6: GitHub Actions workflow files
print_step "Checking GitHub Actions workflows..."
if [ -f ".github/workflows/pipeline.yml" ]; then
    print_success "✅ Main pipeline workflow exists"
    
    # Check ECR push job condition
    if grep -q "push-to-ecr:" ".github/workflows/pipeline.yml"; then
        print_success "✅ ECR push job found in pipeline"
        
        # Extract condition
        CONDITION=$(grep -A 1 "push-to-ecr:" ".github/workflows/pipeline.yml" | grep "if:" | head -1)
        echo "ECR push condition: $CONDITION"
    else
        print_error "❌ ECR push job not found in pipeline"
    fi
else
    print_error "❌ Pipeline workflow not found"
fi

if [ -f ".github/workflows/docker.yml" ]; then
    print_success "✅ Docker workflow exists"
else
    print_warning "⚠️ Docker workflow not found"
fi

# Check 7: Required secrets (can't check values, just remind)
print_step "Required GitHub Secrets..."
print_info "Ensure these secrets are configured in your GitHub repository:"
print_info "  - AWS_ACCESS_KEY_ID"
print_info "  - AWS_SECRET_ACCESS_KEY"
print_info "  - AWS_ACCOUNT_ID"
print_info ""
print_info "Or for OIDC:"
print_info "  - AWS_ROLE_ARN"
print_info "  - AWS_ACCOUNT_ID"

# Summary and recommendations
echo ""
echo "============================================================================"
echo "Summary and Recommendations"
echo "============================================================================"

if [[ " ${SUPPORTED_BRANCHES[@]} " =~ " ${CURRENT_BRANCH} " ]]; then
    print_success "✅ Ready to trigger ECR push"
    print_info "Push to current branch: git push origin $CURRENT_BRANCH"
else
    print_warning "⚠️ Switch to supported branch first"
    print_info "git checkout main && git push origin main"
fi

print_info ""
print_info "To trigger ECR push:"
print_info "1. Ensure you're on main/master/develop branch"
print_info "2. Push changes: git push origin <branch>"
print_info "3. Or manually trigger workflow in GitHub Actions"
print_info ""
print_info "To check workflow status:"
print_info "https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]//; s/.git$//')/actions"

echo ""
print_info "For detailed troubleshooting, see: docs/GITHUB_ACTIONS_TROUBLESHOOTING.md"