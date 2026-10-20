---
name: security-scan
description: Run security checks — Composer and npm dependency vulnerability audits, code scans for SQL injection, XSS, CSRF gaps, hardcoded secrets, auth bypasses, and Next.js Server Actions or Route Handlers that skip server-side authorization, plus an OWASP Top 10 checklist — and report findings by severity with fixes. --dependencies is the kit's one read-only dependency audit (advisories plus outdated and unused packages) that /progress --health, /changelog --release and /upgrade-deps --audit-only rely on. Use when preparing a release, after adding dependencies or auth-related code, or for a periodic security review. Upgrading packages is /upgrade-deps.
argument-hint: "--full | --quick | --dependencies | --code | --owasp"
allowed-tools: Bash, Read, Grep, Glob
metadata:
  version: 2.2
  subagents: "security-auditor"
---

# /security-scan

Run security scans: dependency vulnerability audits, code analysis, and OWASP compliance. `--dependencies` also lists outdated and unused packages; they are not security findings on their own, so they go in their own table, not in the severity counts. Everything here is read-only: nothing is installed, updated, or removed.

In a polyrepo project, run the backend checks in the Laravel repo and the frontend checks in the Next.js repo, and report per repo.

## Usage

```bash
# Full security scan (dependencies + code + OWASP)
/security-scan --full

# Quick dependency scan
/security-scan --quick

# Dependency vulnerabilities only
/security-scan --dependencies

# Code analysis only
/security-scan --code

# OWASP compliance check
/security-scan --owasp
```

## Dependency Analysis

### Audit (Vulnerabilities)

#### PHP Dependencies
```bash
composer audit
composer audit --format=json
```

#### JavaScript Dependencies

Use the package manager the lockfile names (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun, otherwise npm):

```bash
npm audit --json          # or: pnpm audit --json / yarn npm audit --json / bun audit
```

### Outdated and unused packages (`--dependencies`)

```bash
composer outdated --direct --format=json        # backend
npm outdated --json                             # frontend: or pnpm outdated / yarn outdated / bun outdated
composer unused                                 # when installed (icanhazstring/composer-unused)
<pmx> knip --dependencies                       # when installed; <pmx> per the verification-gates rule
```

Report one table: package, current → latest, type (patch / minor / major), advisory (Y/N), and a separate list of unused direct dependencies with the tool's evidence. A tool that is not installed is reported as not run, never as "none found". Acting on the table is `/upgrade-deps` (`--patch`, `--minor`, `--major=<package>`).

### Code Analysis

#### SQL Injection
```bash
# Find raw queries
grep -rn "DB::raw\|->whereRaw\|->selectRaw" app/

# Check for proper bindings
grep -rn "DB::\|->where" app/ | grep -v "?"
```

#### XSS Prevention
```bash
# Find unescaped output (Blade, when the API renders any views)
grep -rn "{!!\|@php echo" resources/views/

# Find dangerouslySetInnerHTML (Next.js)
grep -rn "dangerouslySetInnerHTML" app/ components/ src/ 2>/dev/null
```

#### CSRF Protection
```bash
# Check routes without CSRF
grep -rn "Route::" routes/ | grep -v "middleware"
```

#### Authentication Issues
```bash
# Check for hardcoded credentials
grep -rn "password\|secret\|api_key" .env.example

# Find auth bypasses
grep -rn "->withoutMiddleware\|->skipMiddleware" app/
```

#### Next.js Server Actions and Route Handlers

Every Server Action (`'use server'`) and Route Handler (`app/**/route.ts`) is a public POST (or GET) endpoint, reachable without the UI. Hiding a button is not authorization. Each one must re-verify the session and the caller's role or ownership on the server before it reads or changes data, and must validate its input.

```bash
# List Server Actions and Route Handlers
grep -rln "'use server'\|\"use server\"" app/ src/ 2>/dev/null
find app src -name 'route.ts' -o -name 'route.js' 2>/dev/null

# For each file, confirm a session/role check runs before the data access
grep -n "auth()\|getServerSession\|cookies()\|verifySession\|redirect('/login')" <file>
```

Report every action or handler that changes data without a server-side session and role check as HIGH; one that relies on `middleware.ts` alone as MEDIUM (middleware matchers miss Server Actions posted to other routes). The rule that prevents this at write time lives in the project's `.claude/rules/frontend-pages.md` (installed from the kit's rule templates).

### OWASP Top 10 Checks

#### A01: Broken Access Control
- [ ] Authorization policies on all endpoints
- [ ] Role-based access control implemented
- [ ] Resource ownership verification

#### A02: Cryptographic Failures
- [ ] Strong password hashing (bcrypt/argon2)
- [ ] Encrypted sensitive data at rest
- [ ] TLS for data in transit

#### A03: Injection
- [ ] Parameterized queries used
- [ ] Input validation via DTOs
- [ ] No raw SQL execution

#### A04: Insecure Design
- [ ] Rate limiting implemented
- [ ] Input length limits
- [ ] Secure session management

#### A05: Security Misconfiguration
- [ ] Debug mode disabled in production
- [ ] Error messages don't leak info
- [ ] Security headers configured

#### A06: Vulnerable Components
- [ ] Dependencies up to date
- [ ] No known vulnerabilities
- [ ] Regular security patches

#### A07: Authentication Failures
- [ ] Multi-factor authentication option
- [ ] Account lockout after failures
- [ ] Secure password requirements

#### A08: Data Integrity Failures
- [ ] Signed JWTs/tokens
- [ ] Integrity checks on data
- [ ] Audit logging enabled

#### A09: Logging & Monitoring
- [ ] Security events logged
- [ ] Log injection prevented
- [ ] Monitoring alerts configured

#### A10: SSRF
- [ ] URL validation on external requests
- [ ] Allowlist for external services
- [ ] Network segmentation

## Security Report

### Severity Levels
```
🔴 CRITICAL - Immediate action required
🟠 HIGH - Fix within 24 hours
🟡 MEDIUM - Fix within 1 week
🟢 LOW - Fix in next release
```

## Output Format

```
Security Scan Report

Dependency Vulnerabilities:
  PHP: 0 critical, 1 high, 2 medium, 3 low
  NPM: 0 critical, 0 high, 1 medium, 4 low

Code Analysis:
  SQL Injection:    PASS
  XSS Prevention:   2 warnings (files listed)
  CSRF Protection:  PASS
  Authentication:   PASS
  Server Actions / Route Handlers: 1 HIGH (app/jobs/actions.ts:12 deletes without a role check)

OWASP Compliance: 8/10 (A05 Misconfiguration, A06 Components need review)

Priority Actions:
  1. [severity] Description + fix command
  2. ...
```

With `--dependencies`, add the outdated and unused tables after the severity summary. To act on them, the user runs `/upgrade-deps`.

**Source Verification**: Follow the `source-verification` skill.

