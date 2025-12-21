# PhaserAI CI/CD Documentation

This directory contains the complete CI/CD setup for the PhaserAI conlang application using GitHub Actions.

## Overview

The CI/CD pipeline provides comprehensive automation for:
- **Code Quality**: Linting, formatting, type checking
- **Security**: Dependency scanning, code analysis, infrastructure security
- **Build & Test**: Frontend build, Lambda layers, CDK synthesis
- **Deployment**: Infrastructure deployment (future)
- **Monitoring**: Automated dependency updates

## Workflows

### 1. Main Pipeline (`pipeline.yml`)
**Comprehensive CI/CD pipeline for main development workflow**

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual dispatch with deployment options

**Jobs:**
1. **Code Quality & Security** - Linting, formatting, security audits
2. **Build & Test** - Frontend, Docker images, Lambda layers, infrastructure (matrix strategy)
3. **Infrastructure Validation** - CDK security checks, cost estimation
4. **Integration Tests** - API and database tests (future)
5. **Deployment Preparation** - Package artifacts for deployment
6. **Deploy** - Infrastructure deployment (future)
7. **Post-Deployment** - Health checks and smoke tests (future)
8. **Notification & Cleanup** - Pipeline summary and artifact cleanup

**Features:**
- Matrix builds for different components including Docker
- Multi-platform Docker builds (AMD64, ARM64)
- Container security scanning with Trivy
- Comprehensive artifact management
- Environment-specific deployments
- Cost estimation and security validation
- Detailed logging and error reporting

### 2. Docker Workflow (`docker.yml`)
**Dedicated Docker build, test, and push pipeline**

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests affecting Docker files
- Manual dispatch with registry options
- Release tags for production builds

**Features:**
- **Multi-platform builds** (AMD64, ARM64) using Docker Buildx
- **Development and production** image variants
- **Container security scanning** with Trivy and SBOM generation
- **Registry support** for GitHub Container Registry, Docker Hub, and ECR
- **Image optimization** with build caching and layer optimization
- **Automated testing** of built containers
- **Image verification** after push to registry

**Jobs:**
1. **Docker Build** - Build and test both dev and prod images
2. **Push to Registry** - Push to configured registries (matrix strategy)
3. **Verify Images** - Pull and verify pushed images
4. **Summary** - Pipeline results and image information

### 2. PR Checks (`pr-checks.yml`)
**Lightweight checks for quick PR feedback**

**Features:**
- Fast formatting and lint checks
- PR size analysis
- Secret detection
- Automated PR comments with results

### 3. Security Scan (`security-scan.yml`)
**Comprehensive security scanning**

**Triggers:**
- Weekly schedule (Monday 2 AM UTC)
- Push to main branch
- Manual dispatch

**Scans:**
- Dependency vulnerabilities (frontend & infrastructure)
- Code security analysis with CodeQL
- Infrastructure security checks
- License compliance verification

## Configuration Files

### Dependabot (`dependabot.yml`)
**Automated dependency updates**

**Features:**
- Weekly updates for frontend, infrastructure, and GitHub Actions
- Grouped updates for related packages
- Conservative approach for major version updates
- Proper labeling and assignment

### Issue Templates
- **Bug Report** - Structured bug reporting with environment details
- **Feature Request** - Comprehensive feature planning template

### PR Template
**Comprehensive pull request template covering:**
- Change description and type
- Testing checklist
- Security considerations
- Infrastructure and database changes
- Deployment notes

## Scripts and Commands

### Frontend Scripts
```bash
# Development
pnpm dev                    # Start development server
pnpm build                  # Production build
pnpm preview               # Preview production build

# Code Quality
pnpm lint                  # Run ESLint
pnpm lint:fix              # Fix ESLint issues
pnpm format                # Format code with Prettier
pnpm format:check          # Check code formatting
pnpm type-check            # TypeScript type checking

# Docker Operations
pnpm docker:build          # Build production Docker image
pnpm docker:build-dev      # Build development Docker image
pnpm docker:run            # Run production container
pnpm docker:run-dev        # Run development container
pnpm docker:stop           # Stop running containers
pnpm docker:clean          # Remove Docker images
pnpm docker:logs           # View container logs
pnpm docker:shell          # Access container shell

# CI/CD
pnpm ci:build              # Full CI build process
pnpm ci:format-check       # CI formatting check
pnpm ci:security-audit     # Security audit
```

### Docker Development Scripts
```bash
# Docker Compose Operations
./scripts/docker-dev.sh start      # Start development environment
./scripts/docker-dev.sh stop       # Stop all services
./scripts/docker-dev.sh restart    # Restart all services
./scripts/docker-dev.sh build      # Build all images
./scripts/docker-dev.sh logs       # Show logs for all services
./scripts/docker-dev.sh status     # Show service status

# Container Access
./scripts/docker-dev.sh shell      # Open shell in app container
./scripts/docker-dev.sh db-shell   # Open PostgreSQL shell

# Database Operations
./scripts/docker-dev.sh migrate    # Run database migrations

# Cleanup
./scripts/docker-dev.sh clean      # Clean up containers and images
```

### Infrastructure Scripts
```bash
# CDK Operations
npm run build              # Compile TypeScript
npm run synth              # Synthesize CloudFormation
npm run deploy             # Deploy all stacks
npm run diff               # Show deployment diff

# Code Quality
npm run lint               # Run ESLint
npm run type-check         # TypeScript type checking

# Database Migrations
npm run migrate:up         # Apply migrations
npm run migrate:status     # Check migration status
npm run migrate:prod       # Production migrations

# Lambda Layers
npm run layer:build        # Build psycopg2 layer
npm run layer:verify       # Verify layer deployment

# CI/CD
npm run ci:build           # Full CI build process
npm run ci:synth           # CI synthesis
```

## Environment Setup

### Required Secrets
For deployment workflows (when enabled):

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID          # AWS access key
AWS_SECRET_ACCESS_KEY      # AWS secret key
AWS_REGION                 # AWS region (default: us-east-1)

# Docker Registry Credentials
DOCKERHUB_USERNAME         # Docker Hub username
DOCKERHUB_TOKEN           # Docker Hub access token
GITHUB_TOKEN              # GitHub token (automatically provided)

# Application Secrets
VITE_SUPABASE_URL         # Supabase project URL
VITE_SUPABASE_ANON_KEY    # Supabase anonymous key

# Database (if needed for integration tests)
DB_HOST                    # Database host
DB_PASSWORD                # Database password
```

### Environment Variables
```bash
# Build Configuration
NODE_VERSION=18            # Node.js version
PYTHON_VERSION=3.11        # Python version
PNPM_VERSION=8            # pnpm version
AWS_REGION=us-east-1      # AWS region
```

## Workflow Features

### Concurrency Control
- Cancels in-progress runs for the same branch
- Prevents resource conflicts and reduces costs

### Matrix Builds
- Parallel builds for frontend, Lambda layers, and infrastructure
- Faster feedback and efficient resource usage

### Artifact Management
- Build artifacts stored for 7 days
- Deployment packages stored for 30 days
- Automatic cleanup for PR artifacts

### Security Features
- Dependency vulnerability scanning
- Code security analysis with CodeQL
- Infrastructure security validation
- Secret detection in code changes

### Cost Optimization
- Efficient caching strategies
- Conditional job execution
- Resource usage monitoring
- Build time optimization

## Deployment Strategy

### Environments
1. **Development** - Auto-deploy on main branch push
2. **Staging** - Manual approval required
3. **Production** - Manual approval + additional security checks

### Deployment Process (Future)
1. Build and validate all components
2. Create deployment package
3. Deploy infrastructure with CDK
4. Run database migrations
5. Deploy frontend to S3/CloudFront
6. Run post-deployment health checks

## Monitoring and Alerts

### Pipeline Monitoring
- Job success/failure tracking
- Build time monitoring
- Artifact size tracking
- Security scan results

### Automated Updates
- Weekly dependency updates
- Security patch notifications
- License compliance monitoring

## Troubleshooting

### Common Issues

**Build Failures:**
- Check Node.js/Python version compatibility
- Verify dependency installation
- Review TypeScript compilation errors

**Security Scan Failures:**
- Update vulnerable dependencies
- Review CodeQL findings
- Check for hardcoded secrets

**Infrastructure Issues:**
- Validate CDK synthesis
- Check AWS permissions
- Review CloudFormation templates

**Lambda Layer Issues:**
- Ensure Docker is available for builds
- Verify layer architecture compatibility
- Check layer size limits

### Debug Commands
```bash
# Local testing
pnpm ci:build              # Test full build locally
npm run ci:synth           # Test CDK synthesis
./infra/lambda-layers/psycopg2/verify-deployment.sh  # Test layer

# Verbose logging
DEBUG=* pnpm build         # Verbose frontend build
CDK_DEBUG=true npm run synth  # Verbose CDK synthesis
```

## Best Practices

### Code Quality
- Run linting and formatting before commits
- Use conventional commit messages
- Keep PRs focused and reasonably sized
- Include comprehensive tests

### Security
- Never commit secrets or credentials
- Regularly update dependencies
- Review security scan results
- Follow principle of least privilege

### Infrastructure
- Use CDK best practices
- Implement proper resource tagging
- Monitor costs and usage
- Plan for disaster recovery

### CI/CD
- Keep workflows fast and efficient
- Use appropriate caching strategies
- Monitor pipeline performance
- Document any manual steps

## Future Enhancements

### Planned Features
- [ ] Integration test suite
- [ ] Performance testing
- [ ] Automated rollback capabilities
- [ ] Multi-region deployment
- [ ] Blue-green deployment strategy
- [ ] Canary releases
- [ ] Advanced monitoring and alerting
- [ ] Cost optimization automation

### Integration Opportunities
- [ ] Slack/Discord notifications
- [ ] JIRA integration
- [ ] SonarQube code quality
- [ ] Datadog monitoring
- [ ] AWS Cost Explorer integration