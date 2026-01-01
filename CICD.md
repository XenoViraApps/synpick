# CI/CD

This document describes the CI/CD pipeline for Synpick.

## Overview

The CI/CD pipeline focuses on **security first** with quality checks and testing. It is configured to be pragmatic rather than overly strict on formatting/style.

## Workflows

### 1. Main CI (`ci.yml`)

Triggers on: push to main/develop, PRs to main/develop, manual dispatch

**Jobs:**

| Job | Purpose | Notes |
|-----|---------|-------|
| `security-scan` | npm audit, Snyk scan | uploads SARIF for security tab |
| `quality` | Type checking, ESLint | allows up to 10 warnings |
| `test` | Run Jest tests | uploads coverage to Codecov |
| `build` | Build verification | tests on 3 OS × 3 Node versions |

**Key features:**
- Cross-platform builds (Linux/macOS/Windows)
- Multi-version Node.js support (18, 20, 22)
- Security results uploaded to GitHub Security tab

### 2. Security (`security.yml`)

Triggers on: push, PR, schedule (daily), manual dispatch

**Jobs:**

| Job | Purpose |
|-----|---------|
| `codeql` | Static analysis via CodeQL |
| `vulnerability-scan` | npm audit with severity filtering |
| `license-check` | Detect copyleft licenses |
| `secrets-scan` | TruffleHog secrets scan |

**Severity thresholds:**
- High vulnerabilities: **blocked**
- Moderate vulnerabilities: **warning only**

### 3. Dependabot (`dependabot.yml`)

Updates dependencies weekly on Mondays.

**Configuration:**
- Production deps: grouped together
- Dev deps: grouped separately
- GitHub Actions: separate group
- Major version breaks ignored for `ink` and `react`

**Labels:** `area: dependencies`, `chore`

### 4. Greptile (`greptile.json`)

Automated PR code review using Claude.

**Focus areas:**
- Documentation (JSDoc for exports)
- Type safety (avoid `any`)
- Security (input validation, error handling)
- ESM compatibility (no `require()`)

**Strictness:** 2 (medium) - balances quality with pragmatism

## GitHub Secrets

Configure these in your repository settings:

| Secret | Purpose | Required |
|--------|---------|----------|
| `SNYK_TOKEN` | Snyk security scanning | Optional |
| `CODECOV_TOKEN` | Coverage reporting | Optional |

## Local Development

To run CI checks locally:

```bash
# Security audit
npm audit

# Type check
npx tsc --noEmit

# Lint (with warnings allowed)
npm run lint

# Tests
npm test

# Build
npm run build
```

## Security Best Practices Observed

1. **Input validation** - Zod schemas for all external data
2. **Error handling** - Proper error wrapping and user feedback
3. **API key protection** - Uses psst for secret management
4. **Dependency management** - Regular updates via Dependabot
5. **Vulnerability scanning** - npm audit, Snyk, CodeQL

## Getting PRs Merged

PRs must pass:

1. ✅ All CI jobs green
2. ✅ No high-severity vulnerabilities
3. ✅ Build completes on all platforms
4. ✅ Tests pass (227 tests, 12 suites)

**Not required:**
- ❌ No strict Prettier enforcement
- ❌ No overly strict linting
- ❌ No coverage thresholds
- ❌ No formatting nitpicks

Focus is on **security, functionality, and type safety**.
