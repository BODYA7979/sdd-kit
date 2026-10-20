---
name: lint
description: Run the code quality suite — Laravel Pint, PHPStan, and Rector for PHP; ESLint, TypeScript type-check, and Prettier for JS/TS — in check or auto-fix mode, scoped to PHP or JS if needed. Use when you want to validate style and static analysis before committing or opening a PR, or to auto-fix formatting issues.
argument-hint: "--fix | --check | --php | --js"
allowed-tools: Bash, Read, Grep
metadata:
  version: 1.1
---

# /lint

Run comprehensive code quality checks including formatting, static analysis, and type checking.

## Usage

```bash
# Run all quality checks
/lint

# Check only (no fixes)
/lint --check

# Auto-fix issues
/lint --fix

# PHP only
/lint --php

# JavaScript only
/lint --js
```

## Quality Checks

### PHP Quality

#### Laravel Pint (Code Style)
```bash
# Check style
./vendor/bin/pint --test

# Fix style issues
./vendor/bin/pint

# Check specific path
./vendor/bin/pint app/Services/

# Show diff
./vendor/bin/pint --test -v
```

#### PHPStan (Static Analysis)
```bash
# Run analysis
./vendor/bin/phpstan analyse

# With specific level
./vendor/bin/phpstan analyse --level=8

# Generate baseline
./vendor/bin/phpstan analyse --generate-baseline

# Analyze specific paths
./vendor/bin/phpstan analyse app/Services/
```

#### Rector (Automated Refactoring)
```bash
# Check for improvements
./vendor/bin/rector process --dry-run

# Apply improvements
./vendor/bin/rector process

# Specific paths
./vendor/bin/rector process app/Services/
```

### JavaScript/TypeScript Quality

#### ESLint
```bash
# Check
npx eslint .

# Fix
npx eslint . --fix

# Specific extensions
npx eslint . --ext .ts,.tsx
```

#### TypeScript
```bash
# Type checking
npx tsc --noEmit

# With project config
npx tsc --project tsconfig.json --noEmit
```

#### Prettier
```bash
# Check formatting
npx prettier --check .

# Fix formatting
npx prettier --write .
```

## Complete Validation Suite

## Full Check
```bash
# PHP checks
echo "🔍 Running PHP quality checks..."
./vendor/bin/pint --test
./vendor/bin/phpstan analyse

# JavaScript checks
echo "🔍 Running JavaScript quality checks..."
npx eslint .
npx tsc --noEmit
npx prettier --check .

# Tests
echo "🧪 Running tests..."
php artisan test
```

### Full Fix
```bash
# Fix PHP issues
echo "🔧 Fixing PHP issues..."
./vendor/bin/pint
./vendor/bin/rector process

# Fix JavaScript issues
echo "🔧 Fixing JavaScript issues..."
npx eslint . --fix
npx prettier --write .
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: PHP Quality
  run: |
    ./vendor/bin/pint --test
    ./vendor/bin/phpstan analyse

- name: JavaScript Quality
  run: |
    npm run lint
    npm run type-check

- name: Tests
  run: php artisan test
```

## Common Issues & Fixes

### PHP Issues
```
Issue: Undefined variable
Fix: Add null check or type declaration

Issue: Method undefined
Fix: Update return type or add @method annotation

Issue: Type mismatch
Fix: Cast or validate input types
```

### JavaScript Issues
```
Issue: any type usage
Fix: Define proper TypeScript interface

Issue: Unused import
Fix: Remove or use the import

Issue: Missing key prop
Fix: Add unique key to list items
```

## Output Format

```
🔍 Code Quality Report

═══════════════════════════════════════════════════════════

📋 PHP Quality

Laravel Pint:
  ✅ 245 files checked
  ✅ 0 style violations

PHPStan (Level 8):
  ✅ No errors found
  📊 Analyzed 312 files

Rector:
  ✅ No improvements needed

═══════════════════════════════════════════════════════════

📋 JavaScript Quality

ESLint:
  ✅ 89 files checked
  ⚠️ 3 warnings (no errors)

TypeScript:
  ✅ No type errors

Prettier:
  ✅ All files formatted

═══════════════════════════════════════════════════════════

📊 Summary:
  PHP: ✅ All checks passed
  JS: ⚠️ 3 warnings
  Status: ✅ Ready to commit

💡 Recommendations:
  - Review ESLint warnings in components/
```

**Source Verification**: Follow the `source-verification` skill.

