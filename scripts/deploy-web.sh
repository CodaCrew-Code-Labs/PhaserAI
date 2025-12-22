#!/bin/bash

# ============================================================================
# EC2 Web Deployment Script
# ============================================================================
#
# This script deploys the EC2 web hosting infrastructure and application.
# It handles the complete setup process including dependency validation,
# infrastructure deployment, and application deployment.
#
# USAGE:
#   ./scripts/deploy-web.sh [environment]
#
# PARAMETERS:
#   environment - Target environment (default: dev)
#
# EXAMPLES:
#   ./scripts/deploy-web.sh          # Deploy to dev environment
#   ./scripts/deploy-web.sh prod     # Deploy to prod environment
#
# PREREQUISITES:
#   - ECR repository deployed (./scripts/deploy-ecr.sh)
#   - Database stack deployed
#   - Docker image pushed to ECR
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
WEB_STACK_NAME="${APP_NAME}-web-${ENVIRONMENT}"
ECR_STACK_NAME="${APP_NAME}-ecr-${ENVIRONMENT}"
DB_STACK_NAME="${APP_NAME}-prod-database-${ENVIRONMENT}"
MIGRATION_STACK_NAME="${APP_NAME}-migration-${ENVIRONMENT}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$PROJECT_ROOT/infra"

print_info "============================================================================"
print_info "PhaserAI EC2 Web Deployment Script"
print_info "============================================================================"
print_info "Environment: $ENVIRONMENT"
print_info "Web Stack: $WEB_STACK_NAME"
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

# Step 2: Check dependencies
print_step "Checking required stacks..."

# Check ECR stack
if ! aws cloudformation describe-stacks --stack-name "$ECR_STACK_NAME" --region "$AWS_REGION" &> /dev/null; then
    print_error "ECR stack not found: $ECR_STACK_NAME"
    print_info "Deploy it first: ./scripts/deploy-ecr.sh"
    exit 1
fi
print_success "✅ ECR stack exists"

# Check database stack
if ! aws cloudformation describe-stacks --stack-name "$DB_STACK_NAME" --region "$AWS_REGION" &> /dev/null; then
    print_error "Database stack not found: $DB_STACK_NAME"
    print_info "Deploy it first: cd infra && cdk deploy $DB_STACK_NAME"
    exit 1
fi
print_success "✅ Database stack exists"

# Check migration stack
if ! aws cloudformation describe-stacks --stack-name "$MIGRATION_STACK_NAME" --region "$AWS_REGION" &> /dev/null; then
    print_warning "Migration stack not found: $MIGRATION_STACK_NAME"
    print_info "Consider deploying it: cd infra && cdk deploy $MIGRATION_STACK_NAME"
else
    print_success "✅ Migration stack exists"
fi

# Check ECR image
ECR_REPO_URI="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}"
if aws ecr list-images --repository-name "$APP_NAME" --region "$AWS_REGION" --query 'imageIds[?imageTag==`phaserai-master`]' --output text | grep -q phaserai-master; then
    print_success "✅ Docker image exists in ECR (phaserai-master)"
elif aws ecr list-images --repository-name "$APP_NAME" --region "$AWS_REGION" --query 'imageIds[?imageTag==`latest`]' --output text | grep -q latest; then
    print_success "✅ Docker image exists in ECR (latest)"
else
    print_warning "⚠️ No 'phaserai-master' or 'latest' image found in ECR"
    print_info "Available images:"
    aws ecr list-images --repository-name "$APP_NAME" --region "$AWS_REGION" --query 'imageIds[*].imageTag' --output table
    print_info "Push an image first: git push origin master (triggers CI/CD)"
fi

# Step 3: Navigate to infrastructure directory
print_step "Setting up infrastructure environment..."

if [ ! -d "$INFRA_DIR" ]; then
    print_error "Infrastructure directory not found: $INFRA_DIR"
    exit 1
fi

cd "$INFRA_DIR"

# Step 4: Install dependencies and build
print_step "Installing CDK dependencies..."
npm ci
print_success "Dependencies installed"

print_step "Building TypeScript code..."
npm run build
print_success "TypeScript build completed"

# Step 5: Synthesize stack
print_step "Synthesizing web stack..."
cdk synth "$WEB_STACK_NAME" > /dev/null
print_success "Stack synthesis completed"

# Step 6: Deploy web stack
print_step "Deploying EC2 web stack..."
print_info "This may take 10-15 minutes..."

if cdk deploy "$WEB_STACK_NAME" --require-approval never; then
    print_success "EC2 web stack deployed successfully!"
else
    print_error "EC2 web stack deployment failed"
    exit 1
fi

# Step 7: Get deployment outputs
print_step "Retrieving deployment information..."

WEB_URL=$(aws cloudformation describe-stacks \
    --stack-name "$WEB_STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerUrl`].OutputValue' \
    --output text)

ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name "$WEB_STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDnsName`].OutputValue' \
    --output text)

ASG_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$WEB_STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`AutoScalingGroupName`].OutputValue' \
    --output text)

# Step 8: Display results
print_success "============================================================================"
print_success "EC2 Web Deployment Complete!"
print_success "============================================================================"

if [ -n "$WEB_URL" ]; then
    print_info "🌐 Web Application URL: $WEB_URL"
    print_info "🔗 Load Balancer DNS: $ALB_DNS"
    print_info "📊 Auto Scaling Group: $ASG_NAME"
    print_info ""
    print_info "🚀 Your application is now accessible from anywhere!"
    print_info ""
    print_info "📋 What was deployed:"
    print_info "  ✅ Auto Scaling Group (1-3 instances)"
    print_info "  ✅ Application Load Balancer"
    print_info "  ✅ EC2 instances with Docker"
    print_info "  ✅ Database connectivity"
    print_info "  ✅ ECR image deployment"
    print_info "  ✅ CloudWatch logging"
    print_info "  ✅ Auto scaling policies"
    print_info ""
    print_info "🔧 Management commands:"
    print_info "  # Check instance status"
    print_info "  aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names $ASG_NAME"
    print_info ""
    print_info "  # View application logs"
    print_info "  aws logs tail /aws/ec2/${APP_NAME}-${ENVIRONMENT} --follow"
    print_info ""
    print_info "  # Connect to instance (Session Manager)"
    print_info "  aws ssm start-session --target <instance-id>"
    print_info ""
    print_info "  # Update application (redeploy)"
    print_info "  ./scripts/update-web-app.sh"
    print_info ""
    print_info "⏱️ Note: It may take 5-10 minutes for the application to be fully ready"
    print_info "   The instances need to download and start the Docker container"
else
    print_error "Could not retrieve deployment information"
    print_info "Check the AWS CloudFormation console for more details"
fi

print_info ""
print_info "🔍 Troubleshooting:"
print_info "  - Check ALB target group health in AWS Console"
print_info "  - View EC2 instance logs in CloudWatch"
print_info "  - Verify Docker container is running on instances"
print_info ""
print_success "Deployment script completed successfully!"