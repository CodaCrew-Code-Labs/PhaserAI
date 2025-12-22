#!/bin/bash

# ============================================================================
# Web Application Update Script
# ============================================================================
#
# This script updates the running web application with the latest Docker image
# from ECR. It performs a rolling update of the Auto Scaling Group instances.
#
# USAGE:
#   ./scripts/update-web-app.sh [environment] [image-tag]
#
# PARAMETERS:
#   environment - Target environment (default: dev)
#   image-tag   - Docker image tag to deploy (default: latest)
#
# EXAMPLES:
#   ./scripts/update-web-app.sh                    # Update dev with latest
#   ./scripts/update-web-app.sh prod               # Update prod with latest
#   ./scripts/update-web-app.sh dev main-abc1234   # Update dev with specific tag
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

# Configuration
ENVIRONMENT=${1:-dev}
IMAGE_TAG=${2:-phaserai-master}
APP_NAME="phaserai"
WEB_STACK_NAME="${APP_NAME}-web-${ENVIRONMENT}"

print_info "============================================================================"
print_info "PhaserAI Web Application Update"
print_info "============================================================================"
print_info "Environment: $ENVIRONMENT"
print_info "Image Tag: $IMAGE_TAG"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
ECR_REPO_URI="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}"

print_info "AWS Account: $AWS_ACCOUNT"
print_info "AWS Region: $AWS_REGION"
print_info "ECR Repository: $ECR_REPO_URI"

# Step 1: Verify image exists
print_step "Verifying Docker image exists..."

if aws ecr describe-images --repository-name "$APP_NAME" --image-ids imageTag="$IMAGE_TAG" --region "$AWS_REGION" &> /dev/null; then
    print_success "✅ Image $IMAGE_TAG exists in ECR"
else
    AVAILABLE_TAGS=$(aws ecr list-images --repository-name "$APP_NAME" --region "$AWS_REGION" --query 'imageIds[*].imageTag' --output text 2>/dev/null || echo "")
    
    if echo "$AVAILABLE_TAGS" | grep -q "$IMAGE_TAG"; then
        print_success "✅ Image $IMAGE_TAG found in ECR (via list-images)"
    else
        print_error "❌ Image $IMAGE_TAG not found in ECR"
        print_info "Available images:"
        aws ecr list-images --repository-name "$APP_NAME" --region "$AWS_REGION" --query 'imageIds[*].imageTag' --output table
        exit 1
    fi
fi

# Step 2: Get Auto Scaling Group name
print_step "Getting Auto Scaling Group information..."

ASG_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$WEB_STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`AutoScalingGroupName`].OutputValue' \
    --output text)

if [ -z "$ASG_NAME" ] || [ "$ASG_NAME" = "None" ]; then
    print_error "Could not find Auto Scaling Group for stack: $WEB_STACK_NAME"
    print_info "Ensure the web stack is deployed: ./scripts/deploy-web.sh"
    exit 1
fi

print_success "✅ Found Auto Scaling Group: $ASG_NAME"

# Step 3: Get current instances
print_step "Getting current instance information..."

INSTANCES=$(aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names "$ASG_NAME" \
    --region "$AWS_REGION" \
    --query 'AutoScalingGroups[0].Instances[?LifecycleState==`InService`].InstanceId' \
    --output text)

if [ -z "$INSTANCES" ]; then
    print_error "No running instances found in Auto Scaling Group"
    exit 1
fi

INSTANCE_COUNT=$(echo "$INSTANCES" | wc -w)
print_info "Found $INSTANCE_COUNT running instances: $INSTANCES"

# Step 4: Update instances one by one (rolling update)
print_step "Performing rolling update..."

for INSTANCE_ID in $INSTANCES; do
    print_info "Updating instance: $INSTANCE_ID"
    
    # Send update command via Systems Manager
    COMMAND_ID=$(aws ssm send-command \
        --region "$AWS_REGION" \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[
            'echo \"Updating application to $IMAGE_TAG...\"',
            'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO_URI',
            'docker pull $ECR_REPO_URI:$IMAGE_TAG',
            'docker stop phaserai-container || true',
            'docker rm phaserai-container || true',
            'docker run -d --name phaserai-container --restart unless-stopped -p 80:80 -e OPENAI_API_KEY=\"\$OPENAI_API_KEY\" -e DATABASE_HOST=\"\$DATABASE_HOST\" -e DATABASE_PASSWORD=\"\$DATABASE_PASSWORD\" $ECR_REPO_URI:$IMAGE_TAG',
            'echo \"Update completed for $IMAGE_TAG\"'
        ]" \
        --query 'Command.CommandId' \
        --output text)
    
    print_info "Command sent: $COMMAND_ID"
    
    # Wait for command to complete
    print_info "Waiting for update to complete..."
    
    while true; do
        STATUS=$(aws ssm get-command-invocation \
            --region "$AWS_REGION" \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --query 'Status' \
            --output text 2>/dev/null || echo "InProgress")
        
        if [ "$STATUS" = "Success" ]; then
            print_success "✅ Instance $INSTANCE_ID updated successfully"
            break
        elif [ "$STATUS" = "Failed" ]; then
            print_error "❌ Update failed for instance $INSTANCE_ID"
            
            # Show error details
            aws ssm get-command-invocation \
                --region "$AWS_REGION" \
                --command-id "$COMMAND_ID" \
                --instance-id "$INSTANCE_ID" \
                --query 'StandardErrorContent' \
                --output text
            
            exit 1
        else
            print_info "Status: $STATUS - waiting..."
            sleep 10
        fi
    done
    
    # Wait a bit before updating next instance
    if [ "$INSTANCE_COUNT" -gt 1 ]; then
        print_info "Waiting 30 seconds before updating next instance..."
        sleep 30
    fi
done

# Step 5: Verify health
print_step "Verifying application health..."

ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name "$WEB_STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDnsName`].OutputValue' \
    --output text)

print_info "Checking health at: http://$ALB_DNS"

# Wait for health check
for i in {1..12}; do
    if curl -f -s "http://$ALB_DNS" > /dev/null; then
        print_success "✅ Application is responding"
        break
    else
        print_info "Attempt $i/12 - waiting for application to respond..."
        sleep 10
    fi
done

# Step 6: Check target group health
print_step "Checking target group health..."

TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
    --region "$AWS_REGION" \
    --query 'TargetGroups[?contains(TargetGroupName, `phaser`)].TargetGroupArn' \
    --output text 2>/dev/null || echo "")

if [ -n "$TARGET_GROUP_ARN" ]; then
    HEALTHY_TARGETS=$(aws elbv2 describe-target-health \
        --region "$AWS_REGION" \
        --target-group-arn "$TARGET_GROUP_ARN" \
        --query 'TargetHealthDescriptions[?TargetHealth.State==`healthy`]' \
        --output json | jq length)
    
    print_info "Healthy targets: $HEALTHY_TARGETS/$INSTANCE_COUNT"
    
    if [ "$HEALTHY_TARGETS" -eq "$INSTANCE_COUNT" ]; then
        print_success "✅ All instances are healthy"
    else
        print_warning "⚠️ Not all instances are healthy yet"
        print_info "This is normal immediately after update. Check again in a few minutes."
    fi
fi

# Summary
print_success "============================================================================"
print_success "Application Update Complete!"
print_success "============================================================================"
print_info "🚀 Updated to image: $ECR_REPO_URI:$IMAGE_TAG"
print_info "🌐 Application URL: http://$ALB_DNS"
print_info "📊 Instances updated: $INSTANCE_COUNT"
print_info ""
print_info "🔍 Monitoring commands:"
print_info "  # Check Docker container status"
print_info "  docker ps | grep phaserai-container"
print_info ""
print_info "  # Check application logs"
print_info "  docker logs phaserai-container -f"
print_info ""
print_info "  # Check target group health"
print_info "  aws elbv2 describe-target-health --region $AWS_REGION --target-group-arn $TARGET_GROUP_ARN"

print_success "Update completed successfully!"