# DocsTalk CLI - Authentication & Security

**Version:** 0.3.1-alpha  
**Updated:** December 2, 2025  
**Security Level:** Multi-Layer Protection

---

## 🔒 Overview

Developer commands (`docstalk dev *`) are **protected** dengan multi-layer authentication untuk prevent unauthorized access ke database dan infrastructure.

---

## 🛡️ Security Layers

### Layer 1: Admin Token

**Required:** `DOCSTALK_ADMIN_TOKEN`

**Format:** Must start with `dtalk_admin_`

**Purpose:** Primary authentication mechanism

---

### Layer 2: Project Context OR Remote Token

**Option A:** Run inside DocsTalk project  
**Option B:** Provide `DOCSTALK_REMOTE_TOKEN`

**Purpose:** Prevent arbitrary remote access

---

### Layer 3: Token Format Validation

**Check:** Token must match expected pattern

**Purpose:** Prevent accidental or malicious token injection

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

### For Remote Access (Production)

```bash
# 1. Set admin token
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_SECRET_KEY_HERE

# 2. Set remote token (same as admin token)
export DOCSTALK_REMOTE_TOKEN=dtalk_admin_YOUR_SECRET_KEY_HERE

# 3. Run commands from anywhere
docstalk dev scrape react --incremental
docstalk dev index react
```

---

## 🔐 Generating Secure Tokens

### Recommended Method

```bash
# Generate random secure token
node -e "console.log('dtalk_admin_' + require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# dtalk_admin_a1b2c3d4e5f6789...
```

---

### Manual Method

```bash
# Create your own (minimum 32 characters after prefix)
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_my_super_secret_key_12345678901234567890
```

---

## ⚠️ What Happens Without Authentication

### Attempt to Use Dev Commands

```bash
# Without token
docstalk dev serve
```

**Output:**

```
🔒 Permission Denied: dev serve

Developer commands require authentication.

Reason: DOCSTALK_ADMIN_TOKEN environment variable not set

To use developer commands:
1. Set DOCSTALK_ADMIN_TOKEN environment variable
   export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_SECRET_KEY

2. Either:
   - Run inside DocsTalk project directory, OR
   - Set DOCSTALK_REMOTE_TOKEN for remote access

📖 See docs: packages/cli/docs/authentication.md
```

**Exit Code:** 1

---

## ✅ Valid Use Cases

### Case 1: Local Development (Recommended)

```bash
# Setup
cd ~/projects/docstalk
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_dev_local_123...

# Use
docstalk dev serve
docstalk dev scrape react
docstalk dev index react

✅ Allowed: Inside project + valid token
```

---

### Case 2: Remote Access (CI/CD)

```bash
# Setup (not in project directory)
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_ci_prod_456...
export DOCSTALK_REMOTE_TOKEN=dtalk_admin_ci_prod_456...

# Use
docstalk dev scrape react --incremental
docstalk dev index react

✅ Allowed: Valid remote token
```

---

### Case 3: Production Deployment

```bash
# On production server
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_prod_789...
export DOCSTALK_REMOTE_TOKEN=dtalk_admin_prod_789...

# Automated sync
docstalk dev scrape react --incremental --index
docstalk dev scrape nextjs --incremental --index

✅ Allowed: Valid tokens for automation
```

---

## ❌ Invalid Use Cases

### Case 1: No Token

```bash
# Missing DOCSTALK_ADMIN_TOKEN
docstalk dev serve

❌ Denied: No admin token
```

---

### Case 2: Invalid Token Format

```bash
# Wrong prefix
export DOCSTALK_ADMIN_TOKEN=my_random_token_123

docstalk dev serve

❌ Denied: Token must start with 'dtalk_admin_'
```

---

### Case 3: Not in Project + No Remote Token

```bash
# Outside project
cd /tmp
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_valid_token

# No DOCSTALK_REMOTE_TOKEN
docstalk dev serve

❌ Denied: Must be in project OR provide remote token
```

---

### Case 4: Mismatched Tokens

```bash
# Different tokens
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_token_A
export DOCSTALK_REMOTE_TOKEN=dtalk_admin_token_B

docstalk dev serve

❌ Denied: Remote token must match admin token
```

---

## 🏢 Enterprise Setup

### Multi-Environment Tokens

```bash
# Development
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_dev_abc123...

# Staging
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_staging_def456...

# Production
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_prod_ghi789...
```

---

### Team Access

```bash
# Share token securely via:
# - 1Password
# - HashiCorp Vault
# - AWS Secrets Manager
# - Environment variable management system

# Each team member sets:
export DOCSTALK_ADMIN_TOKEN=$(vault read secret/docstalk/admin_token)
```

---

### CI/CD Integration

**GitHub Actions:**

```yaml
# .github/workflows/sync-docs.yml
name: Sync Documentation

env:
  DOCSTALK_ADMIN_TOKEN: ${{ secrets.DOCSTALK_ADMIN_TOKEN }}
  DOCSTALK_REMOTE_TOKEN: ${{ secrets.DOCSTALK_ADMIN_TOKEN }}

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
    DOCSTALK_ADMIN_TOKEN: $DOCSTALK_ADMIN_TOKEN
    DOCSTALK_REMOTE_TOKEN: $DOCSTALK_ADMIN_TOKEN
  script:
    - npm install -g @docstalk/cli
    - docstalk dev scrape react --incremental --index
```

---

## 🔄 Token Rotation

### When to Rotate

- ✅ Every 90 days (best practice)
- ✅ After team member leaves
- ✅ Suspected compromise
- ✅ Regular security audit

### How to Rotate

```bash
# 1. Generate new token
NEW_TOKEN=$(node -e "console.log('dtalk_admin_' + require('crypto').randomBytes(32).toString('hex'))")

# 2. Update environment
export DOCSTALK_ADMIN_TOKEN=$NEW_TOKEN

# 3. Update secrets manager
vault write secret/docstalk/admin_token value=$NEW_TOKEN

# 4. Update CI/CD secrets
# (via GitHub/GitLab UI)

# 5. Notify team
echo "Token rotated on $(date)" | mail -s "DocsTalk Token Rotation" team@company.com
```

---

## 🚨 Security Best Practices

### ✅ DO

- ✅ Use strong, random tokens
- ✅ Store tokens in secrets manager
- ✅ Rotate tokens regularly
- ✅ Use different tokens per environment
- ✅ Audit token usage
- ✅ Revoke immediately on compromise

### ❌ DON'T

- ❌ Commit tokens to git
- ❌ Share tokens via email/slack
- ❌ Use weak/predictable tokens
- ❌ Reuse tokens across environments
- ❌ Share one token across team
- ❌ Log tokens in plain text

---

## 📊 Token Requirements

| Requirement    | Value          | Reason                           |
| -------------- | -------------- | -------------------------------- |
| **Prefix**     | `dtalk_admin_` | Identifies DocsTalk admin tokens |
| **Min Length** | 44+ chars      | Sufficient entropy               |
| **Randomness** | High           | Prevents brute force             |
| **Rotation**   | Every 90 days  | Limits exposure window           |
| **Storage**    | Encrypted      | Protects at rest                 |

---

## 🔍 Troubleshooting

### Error: "DOCSTALK_ADMIN_TOKEN environment variable not set"

**Solution:**

```bash
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_KEY
```

---

### Error: "Invalid admin token format"

**Solution:**

```bash
# Token must start with 'dtalk_admin_'
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_KEY
#                           ^^^^^^^^^^^^^^ Must have this prefix
```

---

### Error: "Must be inside DocsTalk project or provide DOCSTALK_REMOTE_TOKEN"

**Solution A:** CD into project

```bash
cd /path/to/docstalk
docstalk dev serve
```

**Solution B:** Set remote token

```bash
export DOCSTALK_REMOTE_TOKEN=$DOCSTALK_ADMIN_TOKEN
docstalk dev serve
```

---

### Error: "Invalid remote token"

**Solution:**

```bash
# Remote token must match admin token
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_abc123
export DOCSTALK_REMOTE_TOKEN=dtalk_admin_abc123
#                             ^^^^^^^^^^^^^^^^^^^ Must be same
```

---

## 🎯 Quick Reference

### Setup Commands

```bash
# Generate token
node -e "console.log('dtalk_admin_' + require('crypto').randomBytes(32).toString('hex'))"

# Set for local dev
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_KEY

# Set for remote access
export DOCSTALK_REMOTE_TOKEN=$DOCSTALK_ADMIN_TOKEN

# Verify
echo $DOCSTALK_ADMIN_TOKEN
```

---

### Protected Commands

All `docstalk dev *` commands require authentication:

```bash
docstalk dev serve        # 🔒 Protected
docstalk dev scrape       # 🔒 Protected
docstalk dev index        # 🔒 Protected
docstalk dev test-router  # 🔒 Protected
```

---

### Public Commands (No Auth)

These commands work without authentication:

```bash
docstalk ask <query>      # ✅ Public
docstalk search <query>   # ✅ Public
docstalk version          # ✅ Public
docstalk help             # ✅ Public
```

---

## ✅ Summary

**Security Model:**

- 🔒 Multi-layer authentication
- 🔑 Admin token required
- 🏗️ Project context OR remote token
- ✅ Format validation

**Benefits:**

- 🛡️ Prevents unauthorized access
- 🔐 Protects database integrity
- 📊 Audit trail possible
- 🚀 Production-ready

**Developer Experience:**

- ✅ Simple setup (one env var)
- ✅ Clear error messages
- ✅ Flexible deployment options
- ✅ No impact on public commands

---

**Developer commands are now secure by default!** 🔒🚀
