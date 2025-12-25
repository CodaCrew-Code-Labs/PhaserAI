#!/bin/bash

# Package Lambda Functions Script
# This script builds and packages the Lambda functions for deployment

set -e

echo "🔧 Building and packaging Lambda functions..."

# Navigate to lambda functions directory
cd infra/lambda-functions-nodejs

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building TypeScript..."
npm run build

echo "📁 Creating lambda package..."
# Remove existing package if it exists
rm -f lambda-package.zip

# Create a temporary directory for packaging
mkdir -p temp-package

# Copy compiled JavaScript files to root level
cp dist/*.js temp-package/

# Copy node_modules (production dependencies only)
cp -r node_modules temp-package/

# Copy package.json
cp package.json temp-package/

# Create zip file from temp directory
cd temp-package
zip -r ../lambda-package.zip . -x "*.cache/*" "*.log"
cd ..

# Clean up temp directory
rm -rf temp-package

echo "✅ Lambda package created: lambda-package.zip"
echo "📊 Package size: $(du -h lambda-package.zip | cut -f1)"

# List contents to verify structure
echo "📋 Package contents:"
unzip -l lambda-package.zip | head -20

# Go back to infra directory
cd ..

echo "🚀 Ready for deployment! Run: cdk deploy ProductionApiStack"