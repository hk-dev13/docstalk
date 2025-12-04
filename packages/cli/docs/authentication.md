# DocsTalk CLI - Authentication & Security

**Version:** 0.3.1-alpha  
**Updated:** December 4, 2025  
**Security Model:** Token-Based Access Control

---

## 🔒 Overview

Developer commands (`docstalk dev *`) are **protected** with token-based authentication to prevent unauthorized access to database and infrastructure operations.

---

## 🛡️ Security Design

### Layer 1: Admin Token (Developer Commands)

**Required:** `DOCSTALK_ADMIN_TOKEN`

**Format:** Must start with `dtalk_admin_`

**Purpose:** Protects developer commands (scrape, index)

---

### Layer 1.5: API Token (User Commands)

**Required:** `DOCSTALK_API_TOKEN`

**Purpose:** Authenticates `ask` command against the secured backend.
**Source:** Get this from your Clerk session (or sign in via Web UI).

---

### Layer 2: Environment Context

**Requirement:** Valid deployment credential or environment context

**Purpose:** Ensures commands run in authorized environments

---

### Layer 3: Token Format Validation

**Check:** Token must match expected pattern

**Purpose:** Prevents accidental or malicious credential usage

---

## 🔑 Setup Authentication

### For Local Development

```bash
# 1. Set admin token
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_SECRET_KEY_HERE

# 2. CD into project
cd /path/to/docstalk

# 3. Run dev commands
docstalk dev serve
docstalk dev scrape react
docstalk dev index react
```

---

### For Remote Access (Production/CI)

```bash
# 1. Set admin token
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_SECRET_KEY_HERE

# 2. Set deployment credential
export DOCSTALK_REMOTE_TOKEN=dtalk_admin_DEPLOYMENT_SCOPED_KEY

# 3. Run commands from automation
docstalk dev scrape react --incremental
docstalk dev index react
```

**Note:** `DOCSTALK_REMOTE_TOKEN` should be a deployment-scoped credential linked to admin permissions. Do not use the same value in production environments.

---

## 🔐 Generating Secure Tokens

### Recommended Method

```bash
# Generate cryptographically secure token
node -e "console.log('dtalk_admin_' + require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# dtalk_admin_a1b2c3d4e5f6789...
```

---

### Token Requirements

| Requirement    | Value          | Reason                     |
| -------------- | -------------- | -------------------------- |
| **Prefix**     | `dtalk_admin_` | Identifies admin tokens    |
| **Min Length** | 44+ chars      | Sufficient entropy         |
| **Randomness** | High           | Prevents guessing          |
| **Storage**    | Encrypted      | Protects at rest           |

---

## ⚠️ Authentication Errors

### Common Error Messages

```bash
# Insufficient credentials
🔒 Permission Denied: dev serve

Developer commands require authentication.
```

**Exit Code:** 1

**Resolution:** Set required environment variables and ensure proper context.

---

## ✅ Valid Use Cases

### Case 1: Local Development

```bash
# Inside project directory
cd ~/projects/docstalk
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_dev_local_KEY

# Commands work with admin token only
docstalk dev serve
docstalk dev scrape react

✅ Allowed: Authorized environment
```

---

### Case 2: CI/CD Automation

```bash
# Automated environment
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_ci_KEY
export DOCSTALK_REMOTE_TOKEN=dtalk_admin_deploy_KEY

# Run automation commands
docstalk dev scrape react --incremental
docstalk dev index react

✅ Allowed: Valid deployment credentials
```

---

### Case 3: Production Deployment

```bash
# Production server with proper credentials
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_prod_KEY
export DOCSTALK_REMOTE_TOKEN=dtalk_admin_prod_deploy_KEY

# Automated documentation sync
docstalk dev scrape react --incremental --index

✅ Allowed: Authorized automation
```

---

## ❌ Invalid Use Cases

### Case 1: Missing Credentials

```bash
# No token set
docstalk dev serve

❌ Denied: Insufficient authorization
```

---

### Case 2: Invalid Token Format

```bash
# Incorrect prefix
export DOCSTALK_ADMIN_TOKEN=my_random_token

docstalk dev serve

❌ Denied: Invalid credential format
```

---

### Case 3: Unauthorized Context

```bash
# Missing required context
docstalk dev serve

❌ Denied: Unauthorized environment
```

---

## 🏢 Enterprise Setup

### Multi-Environment Tokens

```bash
# Development
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_dev_KEY

# Staging
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_staging_KEY

# Production  
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_prod_KEY
```

**Best Practice:** Use different tokens per environment.

---

### Secure Token Storage

**Recommended Solutions:**

- 1Password Teams
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Environment variable management

```bash
# Example: Vault integration
export DOCSTALK_ADMIN_TOKEN=$(vault read -field=value secret/docstalk/admin)
```

---

### CI/CD Integration

**GitHub Actions:**

```yaml
# .github/workflows/sync-docs.yml
name: Sync Documentation

env:
  DOCSTALK_ADMIN_TOKEN: ${{ secrets.ADMIN_TOKEN }}
  DOCSTALK_REMOTE_TOKEN: ${{ secrets.DEPLOY_TOKEN }}

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install -g @docstalk/cli
      - run: docstalk dev scrape react --incremental --index
```

**GitLab CI:**

```yaml
# .gitlab-ci.yml
sync_docs:
  variables:
    DOCSTALK_ADMIN_TOKEN: $ADMIN_TOKEN
    DOCSTALK_REMOTE_TOKEN: $DEPLOY_TOKEN
  script:
    - npm install -g @docstalk/cli
    - docstalk dev scrape react --incremental --index
```

---

## 🔄 Token Management

### When to Rotate

- ✅ Every 90 days (recommended)
- ✅ After access changes
- ✅ Suspected security issue
- ✅ Regular security audits

### How to Rotate

```bash
# 1. Generate new token
NEW_TOKEN=$(node -e "console.log('dtalk_admin_' + require('crypto').randomBytes(32).toString('hex'))")

# 2. Update environment
export DOCSTALK_ADMIN_TOKEN=$NEW_TOKEN

# 3. Update secrets manager
vault write secret/docstalk/admin value=$NEW_TOKEN

# 4. Update CI/CD secrets (via UI)

# 5. Verify
docstalk dev serve
```

---

## 🚨 Security Best Practices

### ✅ DO

- ✅ Use cryptographically secure tokens
- ✅ Store tokens in secrets manager
- ✅ Rotate tokens regularly
- ✅ Use separate tokens per environment
- ✅ Audit access patterns
- ✅ Revoke on security events

### ❌ DON'T

- ❌ Commit tokens to version control
- ❌ Share tokens via public channels
- ❌ Use predictable tokens
- ❌ Reuse tokens across environments
- ❌ Log tokens in plain text
- ❌ Expose tokens in error messages

---

## 🔍 Troubleshooting

### Debug Mode

For detailed error information, set:

```bash
export DOCSTALK_DEBUG=1
```

This provides verbose logging for troubleshooting authorization issues.

---

### Common Solutions

**Missing credentials:**
```bash
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_KEY
```

**Invalid format:**
```bash
# Ensure correct prefix
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_KEY
#                           ^^^^^^^^^^^^^^ Required prefix
```

**For automation:**
```bash
# Set both credentials
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_KEY
export DOCSTALK_REMOTE_TOKEN=dtalk_admin_DEPLOY_KEY
```

---

## 🎯 Quick Reference

### Protected Commands

All `docstalk dev *` commands require authentication:

```bash
docstalk dev serve        # 🔒 Auth required
docstalk dev scrape       # 🔒 Auth required
docstalk dev index        # 🔒 Auth required
docstalk dev test-router  # 🔒 Auth required
```

---

### Public Commands (No Auth)

These commands work without authentication:

```bash
docstalk ask <query>      # 🔒 Requires DOCSTALK_API_TOKEN
docstalk search <query>   # ✅ Public
docstalk version          # ✅ Public
docstalk help             # ✅ Public
```

---

## ✅ Summary

**Security Model:**

- � Token-based access control
- 🏗️ Multi-step authentication flow
- ✅ Format validation
- 🔒 Environment context verification

**Benefits:**

- 🛡️ Prevents unauthorized operations
- 🔐 Protects data integrity
- 📊 Enables access auditing
- 🚀 Production-ready design

**Developer Experience:**

- ✅ Simple credential setup
- ✅ Clear feedback on issues
- ✅ Flexible deployment options
- ✅ Zero impact on public commands

---

**For detailed security questions, contact your security team or review our security policy.**

