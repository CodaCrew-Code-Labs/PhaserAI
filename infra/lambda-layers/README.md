# Lambda Layers

This directory contains Lambda layers used by the PhaserAI application.

## psycopg2 Layer

The psycopg2 layer provides PostgreSQL database connectivity for Python Lambda functions.

### Quick Start

1. **Build the layer:**
   ```bash
   cd psycopg2
   ./build-layer.sh
   ```

2. **Verify the build:**
   ```bash
   ./verify-deployment.sh
   ```

3. **Deploy with CDK:**
   ```bash
   cd ../..
   cdk deploy MigrationStack
   cdk deploy ProductionApiStack
   ```

### Layer Details

- **Runtime:** Python 3.11
- **Architecture:** ARM64 (aarch64)
- **Size:** ~8.5MB
- **Dependencies:** psycopg2-binary==2.9.9

### Usage

The layer is automatically included in:
- Migration Lambda function (`infra/lambda-functions/migration.py`)
- API Lambda functions (`users.py`, `languages.py`, `words.py`)

### Troubleshooting

**Build fails with version error:**
- The layer uses psycopg2-binary 2.9.9 for compatibility with Amazon Linux 2
- If you need a different version, update `requirements.txt`

**Layer too large:**
- The current layer is optimized for Lambda
- Size warnings are normal for binary dependencies

**Import errors in local testing:**
- The layer is built for Linux ARM64, not for local macOS/Windows testing
- Use the verification script instead of local Python imports

### Files

- `build-layer.sh` - Builds the layer using Docker
- `verify-deployment.sh` - Verifies layer is ready for deployment
- `test-layer.py` - Local test script (may fail on non-Linux systems)
- `requirements.txt` - Python dependencies
- `python/` - Built layer contents (created by build script)