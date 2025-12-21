# psycopg2 Lambda Layer

The psycopg2 layer provides PostgreSQL database connectivity for Python Lambda functions in the PhaserAI application.

## Overview

This layer contains the psycopg2-binary library compiled for AWS Lambda's ARM64 (Graviton2) runtime environment. It enables Lambda functions to connect to PostgreSQL databases with optimal performance and compatibility.

## Quick Start

### 1. Build the Layer
```bash
cd infra/lambda-layers/psycopg2
./build-layer.sh
```

### 2. Verify the Build
```bash
./verify-deployment.sh
```

### 3. Deploy with CDK
```bash
cd ../..
cdk deploy MigrationStack
cdk deploy ProductionApiStack
```

## Scripts Reference

### `build-layer.sh`
**Comprehensive build script for the psycopg2 Lambda layer**

**Features:**
- Uses Docker with Amazon Linux 2 for perfect Lambda compatibility
- Installs PostgreSQL development headers and GCC compiler
- Builds psycopg2-binary 2.9.9 with native ARM64 extensions
- Automatically cleans up unnecessary files to minimize layer size
- Provides detailed logging and error handling
- Falls back to local build if Docker is unavailable (not recommended)

**Requirements:**
- Docker installed and running
- Internet connection for package downloads
- ~50MB disk space for build process

**Output:**
- Creates `python/` directory with psycopg2 library
- Layer size: ~8.5MB compressed
- ARM64 (aarch64) binaries compatible with Lambda

### `verify-deployment.sh`
**Comprehensive verification script for deployment readiness**

**Verification Checks:**
- Directory structure compliance with Lambda layer requirements
- Presence of critical psycopg2 files and modules
- Binary compatibility with AWS Lambda ARM64 runtime
- Layer size optimization (5-20MB acceptable range)
- CDK deployment compatibility
- File permissions and package structure
- Architecture verification (ARM64 vs x86-64)

**Exit Codes:**
- `0`: All verifications passed, ready for deployment
- `1`: Critical verification failed, rebuild required

**Detailed Analysis:**
- File-by-file verification of critical components
- Size breakdown by component
- Binary architecture analysis
- Python package structure validation
- CDK compatibility confirmation

### `requirements.txt`
**Dependency specification with comprehensive documentation**

**Contains:**
- psycopg2-binary==2.9.9 (latest version compatible with Amazon Linux 2)
- Detailed compatibility notes and version rationale
- Feature overview and build process documentation

## Layer Details

### Technical Specifications
- **Runtime:** Python 3.11 (compatible with Python 3.7+ binaries)
- **Architecture:** ARM64 (aarch64) for AWS Graviton2 processors
- **Size:** ~8.5MB compressed, ~17MB uncompressed
- **Dependencies:** psycopg2-binary 2.9.9
- **Compatibility:** PostgreSQL 9.2+ server versions

### Included Features
- Core PostgreSQL connectivity and authentication
- Connection pooling and management
- SQL composition utilities (`psycopg2.sql`)
- JSON/JSONB data type support
- PostgreSQL array and range type support
- Advanced cursor and transaction management
- Comprehensive error handling and diagnostics
- Thread-safe operations for concurrent Lambda executions

### Usage in Lambda Functions

The layer is automatically included in:
- **Migration Lambda function** (`infra/lambda-functions/migration.py`)
- **API Lambda functions** (`users.py`, `languages.py`, `words.py`)

**Example usage in Lambda:**
```python
import psycopg2
from psycopg2 import sql

# Connection using AWS Secrets Manager
connection = psycopg2.connect(
    host=secret['host'],
    port=secret['port'],
    database=secret['dbname'],
    user=secret['username'],
    password=secret['password'],
    sslmode='require'
)

# SQL composition for security
query = sql.SQL("SELECT * FROM {} WHERE {} = %s").format(
    sql.Identifier('users'),
    sql.Identifier('id')
)
```

## Troubleshooting

### Build Issues

**"Docker not found" error:**
```bash
# Install Docker
# macOS: brew install --cask docker
# Ubuntu: sudo apt-get install docker.io
# CentOS: sudo yum install docker
```

**"Version not found" error:**
- The layer uses psycopg2-binary 2.9.9 for Amazon Linux 2 compatibility
- Newer versions require Python 3.8+ or different build environments
- This version provides all necessary features for PostgreSQL connectivity

**"Layer too large" warning:**
- Current size (~8.5MB) is optimized for Lambda deployment
- Size warnings are normal for binary dependencies with native extensions
- Layer is within AWS Lambda's 50MB unzipped limit

### Deployment Issues

**Import errors in local testing:**
- Layer is built for Linux ARM64, not for local macOS/Windows development
- Use `verify-deployment.sh` instead of local Python imports for testing
- Local testing requires a Linux environment or Docker

**Lambda runtime errors:**
- Ensure you're using Python 3.11 runtime in Lambda configuration
- Verify the layer is properly attached to Lambda functions in CDK
- Check CloudWatch logs for specific psycopg2 import errors

**Connection failures:**
- Verify database credentials in AWS Secrets Manager
- Ensure Lambda has VPC access to database if using private subnets
- Check security group rules for PostgreSQL port (5432)

### Performance Optimization

**Connection pooling:**
```python
from psycopg2 import pool

# Create connection pool (reuse across Lambda invocations)
connection_pool = psycopg2.pool.SimpleConnectionPool(
    minconn=1,
    maxconn=5,
    host=host,
    database=database,
    user=user,
    password=password
)
```

**Prepared statements:**
```python
# Use prepared statements for repeated queries
cursor.execute("PREPARE stmt AS SELECT * FROM users WHERE id = $1")
cursor.execute("EXECUTE stmt (%s)", (user_id,))
```

## File Structure

```
infra/lambda-layers/psycopg2/
├── build-layer.sh           # Comprehensive build script
├── verify-deployment.sh     # Deployment verification script
├── requirements.txt         # Dependency specification with docs
├── README.md               # This documentation
└── python/                 # Built layer contents (created by build)
    ├── psycopg2/           # Main psycopg2 package
    ├── psycopg2_binary-2.9.9.dist-info/  # Package metadata
    └── psycopg2_binary.libs/              # Binary dependencies
```

## Integration with CDK

The layer is automatically configured in CDK stacks:

```typescript
// Migration Stack
const psycopg2Layer = new lambda.LayerVersion(this, 'Psycopg2Layer', {
  code: lambda.Code.fromAsset('lambda-layers/psycopg2'),
  compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
  description: 'PostgreSQL driver (psycopg2) for Lambda',
});

// Lambda Function with Layer
const migrationFunction = new lambda.Function(this, 'MigrationFunction', {
  runtime: lambda.Runtime.PYTHON_3_11,
  layers: [psycopg2Layer],
  // ... other configuration
});
```

## Version History

- **2.9.9**: Current version, compatible with Amazon Linux 2 and Python 3.7+
- **Future**: Will upgrade to newer versions when Lambda runtime supports them

## Support

For issues with the psycopg2 layer:
1. Run `./verify-deployment.sh` to check layer integrity
2. Rebuild with `./build-layer.sh` if verification fails
3. Check AWS Lambda logs for runtime-specific errors
4. Verify database connectivity and credentials