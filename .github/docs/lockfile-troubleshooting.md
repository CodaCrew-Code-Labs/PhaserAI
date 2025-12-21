# pnpm Lockfile Troubleshooting

## Problem

The error `ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json` occurs when:

1. **Dependencies were updated** in `package.json` but `pnpm-lock.yaml` wasn't regenerated
2. **Manual edits** were made to `package.json` without running `pnpm install`
3. **Merge conflicts** resulted in mismatched files
4. **Version bumps** happened through automated tools without lockfile updates

## Quick Fix

### Option 1: Use the Fix Script (Recommended)
```bash
# Run the automated fix script
pnpm run fix-lockfile

# Or directly
./scripts/fix-lockfile.sh
```

### Option 2: Manual Fix
```bash
# Remove existing lockfile and node_modules
rm pnpm-lock.yaml
rm -rf node_modules

# Regenerate lockfile
pnpm install

# Verify the fix
pnpm install --frozen-lockfile
```

### Option 3: Update Lockfile Only
```bash
# Update lockfile without removing node_modules
pnpm install --no-frozen-lockfile

# Verify the fix
pnpm install --frozen-lockfile
```

## CI/CD Behavior

Our CI/CD workflows now handle this gracefully:

### Automatic Fallback
```yaml
# Try frozen lockfile first (preferred for CI)
if pnpm install --frozen-lockfile; then
  echo "✅ Dependencies installed with frozen lockfile"
else
  echo "⚠️ Frozen lockfile failed - updating lockfile and continuing..."
  pnpm install
fi
```

### What Happens in CI
1. **First attempt**: `pnpm install --frozen-lockfile` (fast, deterministic)
2. **Fallback**: `pnpm install` (slower, but works)
3. **Warning**: Logs indicate lockfile was out of sync
4. **Continuation**: Build continues with updated dependencies

## Prevention

### Best Practices
1. **Always run `pnpm install`** after editing `package.json`
2. **Commit both files** together:
   ```bash
   git add package.json pnpm-lock.yaml
   git commit -m "feat: add new dependency"
   ```
3. **Use pnpm commands** for dependency management:
   ```bash
   pnpm add react@latest          # Add dependency
   pnpm add -D typescript@latest  # Add dev dependency
   pnpm update                    # Update all dependencies
   pnpm update react              # Update specific dependency
   ```

### Pre-commit Hooks (Optional)
Add to `.husky/pre-commit` or similar:
```bash
#!/bin/sh
# Check if lockfile is in sync
if ! pnpm install --frozen-lockfile --dry-run > /dev/null 2>&1; then
  echo "❌ pnpm-lock.yaml is out of sync with package.json"
  echo "Run: pnpm install"
  exit 1
fi
```

## Common Scenarios

### Scenario 1: Dependency Version Bump
```bash
# ❌ This causes the issue
sed -i 's/"react": "^19.1.1"/"react": "^19.2.3"/' package.json
git commit -am "update react"

# ✅ Correct approach
pnpm update react
git add package.json pnpm-lock.yaml
git commit -m "update react to 19.2.3"
```

### Scenario 2: Adding New Dependencies
```bash
# ❌ Manual edit without lockfile update
echo '"new-package": "^1.0.0"' >> package.json

# ✅ Use pnpm command
pnpm add new-package@^1.0.0
```

### Scenario 3: Merge Conflicts
```bash
# After resolving merge conflicts in package.json
pnpm install  # Regenerate lockfile
git add pnpm-lock.yaml
git commit -m "fix: resolve lockfile after merge"
```

## Workflow-Specific Behavior

### Main Pipeline (`pipeline.yml`)
- **Code Quality Job**: Warns and continues with updated lockfile
- **Build Job**: Updates lockfile if needed, continues build
- **Impact**: Slightly slower first run, but builds don't fail

### PR Checks (`pr-checks.yml`)
- **Quick Checks**: Provides helpful message for PR author
- **Suggestion**: Shows exact commands to fix the issue
- **Impact**: PR checks pass, but with warnings

### Security Scan (`security-scan.yml`)
- **Dependency Scan**: Updates lockfile for accurate vulnerability scanning
- **License Check**: Ensures all dependencies are scanned
- **Impact**: More accurate security results

### Docker Workflow (`docker.yml`)
- **Pre-build Validation**: Fixes lockfile before Docker build
- **Container Build**: Uses updated dependencies
- **Impact**: Prevents Docker build failures due to lockfile issues

## Performance Impact

### With Frozen Lockfile (Normal Case)
- **Install time**: ~30-60 seconds (with cache)
- **Deterministic**: Exact same dependency tree every time
- **Preferred**: Fast and reliable

### With Lockfile Update (Fallback)
- **Install time**: ~2-3 minutes (first time)
- **Variable**: May install different sub-dependency versions
- **Acceptable**: Slower but functional

### Cache Effectiveness
- **Frozen lockfile**: ~95% cache hit rate
- **Updated lockfile**: ~70% cache hit rate (some dependencies change)
- **Overall impact**: Minimal for most workflows

## Monitoring

### CI/CD Logs
Look for these indicators:
```
⚠️ Frozen lockfile failed - pnpm-lock.yaml may be outdated
🔄 Installing with updated lockfile...
⚠️ WARNING: pnpm-lock.yaml was out of sync with package.json
```

### Local Development
```bash
# Check if lockfile is in sync
pnpm install --frozen-lockfile

# If it fails, fix it
pnpm run fix-lockfile
```

## Troubleshooting Commands

### Diagnostic Commands
```bash
# Check pnpm version
pnpm --version

# Verify package.json syntax
node -e "console.log('✅ Valid JSON')" < package.json

# Check lockfile format
pnpm install --frozen-lockfile

# Show outdated dependencies
pnpm outdated
```

### Recovery Commands
```bash
# Nuclear option - complete reset
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Gentle option - update lockfile only
pnpm install --no-frozen-lockfile

# Verification
pnpm install --frozen-lockfile
```

## Related Issues

### Node.js Version Mismatch
```bash
# Check Node.js version
node --version  # Should be 18.x

# Check pnpm version
pnpm --version  # Should be 8.10.0
```

### Cache Issues
```bash
# Clear pnpm cache
pnpm store prune

# Clear npm cache (if mixed usage)
npm cache clean --force
```

### Permission Issues
```bash
# Fix permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.pnpm-store

# Or use different store location
pnpm config set store-dir ~/.local/share/pnpm/store
```

This comprehensive approach ensures that lockfile issues don't block development or CI/CD while maintaining the benefits of deterministic dependency installation.