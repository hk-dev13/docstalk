# DocsTalk CLI - Command Structure

**Version:** 0.3.0-alpha  
**Updated:** December 2, 2025  
**Architecture:** Public/Developer Separation

---

## 🎯 Overview

DocsTalk CLI memisahkan commands menjadi dua kategori:

1. **Public Commands** - Untuk end users
2. **Developer Commands** - Untuk DocsTalk developers

---

## 👥 PUBLIC COMMANDS

Commands yang visible dan accessible untuk semua users.

### `docstalk ask`

**Description:** Ask a question to the AI

**Syntax:**

```bash
docstalk ask <query> [--source <source>]
```

**Examples:**

```bash
# Simple question
docstalk ask "How to use React hooks?"

# Force specific source
docstalk ask "Next.js routing" --source nextjs
```

---

### `docstalk search`

**Description:** Search documentation (Coming soon)

**Syntax:**

```bash
docstalk search <query> [--source <source>] [--limit <number>]
```

**Status:** ⚠️ Not yet implemented

---

### `docstalk version`

**Description:** Show version information

**Syntax:**

```bash
docstalk version
```

**Output:**

```
DocsTalk CLI
Version: 0.3.0-alpha
Mode: Development
```

---

### `docstalk help`

**Description:** Show help

**Syntax:**

```bash
docstalk help
docstalk --help
```

**Output:**

```
Usage: docstalk [options] [command]

AI-powered documentation assistant

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  ask <query>     Ask a question to the AI
  search <query>  Search documentation
  version         Show version information
  dev             Developer commands (scrape, index, serve, etc.)
  help [command]  display help for command
```

**Note:** Developer commands (`scrape`, `index`, etc.) are hidden dari main help.

---

## 🛠️ DEVELOPER COMMANDS

Commands untuk DocsTalk developers, grouped under `dev` subcommand.

### `docstalk dev`

**Description:** Show developer commands

**Syntax:**

```bash
docstalk dev
```

**Output:**

```
📦 DocsTalk Developer Commands

Available commands:
  docstalk dev serve          Start development server
  docstalk dev scrape         Scrape documentation
  docstalk dev index          Index documentation
  docstalk dev test-router    Test routing logic

Use 'docstalk dev <command> --help' for more info
```

---

### `docstalk dev serve`

**Description:** Start development server

**Syntax:**

```bash
docstalk dev serve
```

**Requirements:**

- Must be inside DocsTalk project
- `pnpm-workspace.yaml` must exist

---

### `docstalk dev scrape`

**Description:** Scrape documentation

**Syntax:**

```bash
docstalk dev scrape <source_or_url> [options]
```

**Options:**

- `--index` - Auto-index after scraping
- `--incremental` - Only scrape changed pages
- `--partial` - Scrape specific URLs only

**Examples:**

```bash
# Full scrape
docstalk dev scrape react

# Incremental with auto-index
docstalk dev scrape react --incremental --index

# Partial page update
docstalk dev scrape https://react.dev/hooks/useState --partial
```

---

### `docstalk dev index`

**Description:** Index documentation for RAG

**Syntax:**

```bash
docstalk dev index <source>
```

**Examples:**

```bash
docstalk dev index react
docstalk dev index nextjs
```

---

### `docstalk dev test-router`

**Description:** Test routing logic

**Syntax:**

```bash
docstalk dev test-router <query> [--source <source>]
```

**Examples:**

```bash
# Test routing
docstalk dev test-router "React hooks"

# Force source
docstalk dev test-router "React hooks" --source react
```

**Output:**

```
🧪 Testing router: React hooks

📊 Routing Result:

Query Type: technical
Detected Source: react
Confidence: 0.95
Reasoning: Query mentions "React hooks" which is specific to React

Full Response:
{
  "queryType": "technical",
  "detectedSource": "react",
  "confidence": 0.95,
  ...
}
```

---

## 🔄 BACKWARD COMPATIBILITY

Old commands still work but show deprecation warnings.

### Hidden Commands

These commands are hidden dari help but masih berfungsi:

```bash
# Old way (deprecated, shows warning)
docstalk serve
docstalk scrape react
docstalk index react
docstalk test-router "query"

# New way (recommended)
docstalk dev serve
docstalk dev scrape react
docstalk dev index react
docstalk dev test-router "query"
```

**Deprecation Message:**

```
⚠️  'docstalk serve' is deprecated.
   Use 'docstalk dev serve' instead.
```

---

## 🌍 ENVIRONMENT VARIABLES

### `DOCSTALK_API_URL`

**Description:** API server URL

**Default:** `http://localhost:3001`

**Example:**

```bash
export DOCSTALK_API_URL=https://api.docstalk.ai
docstalk ask "React hooks"
```

---

### `DOCSTALK_DEV`

**Description:** Enable development mode

**Default:** Auto-detected (checks for `pnpm-workspace.yaml`)

**Example:**

```bash
export DOCSTALK_DEV=1
docstalk dev scrape react
```

---

## 📊 COMMAND COMPARISON

### User Perspective

```bash
# ✅ What users see
docstalk --help

Usage: docstalk [options] [command]

Commands:
  ask <query>     Ask a question to the AI
  search <query>  Search documentation
  version         Show version information
  dev             Developer commands
  help [command]  display help for command
```

**Clean!** Developer commands tersembunyi.

---

### Developer Perspective

```bash
# 🛠️ What developers see
docstalk dev --help

📦 DocsTalk Developer Commands

Available commands:
  docstalk dev serve          Start development server
  docstalk dev scrape         Scrape documentation
  docstalk dev index          Index documentation
  docstalk dev test-router    Test routing logic
```

**Clear!** Semua dev tools accessible.

---

## 🎯 USE CASES

### Use Case 1: End User

```bash
# User installs DocsTalk CLI globally
npm install -g @docstalk/cli

# Simple usage
docstalk ask "How to optimize React components?"

# Output: Clean answer, no dev clutter
```

---

### Use Case 2: Developer

```bash
# Clone repo
git clone https://github.com/docstalk/docstalk.git
cd docstalk

# Install deps
pnpm install

# Start development
docstalk dev serve

# Scrape new docs
docstalk dev scrape react --incremental

# Test changes
docstalk dev test-router "React hooks"
```

---

### Use Case 3: Contributor

```bash
# Someone wants to contribute docs

# Can still use dev commands
docstalk dev scrape vue --incremental
docstalk dev index vue

# But public commands work too
docstalk ask "Vue composition API"
```

---

## 🏗️ ARCHITECTURE

### Command Structure

```
docstalk
├── PUBLIC (Always visible)
│   ├── ask                   ← End user command
│   ├── search               ← End user command
│   ├── version              ← Info command
│   └── help                 ← Help command
│
├── DEVELOPER (Grouped under 'dev')
│   └── dev
│       ├── serve            ← Dev server
│       ├── scrape           ← Scraping tool
│       ├── index            ← Indexing tool
│       └── test-router      ← Testing tool
│
└── HIDDEN (Backward compat)
    ├── serve (→ dev serve)
    ├── scrape (→ dev scrape)
    ├── index (→ dev index)
    └── test-router (→ dev test-router)
```

---

### Code Organization

```typescript
// PUBLIC COMMANDS
program.command("ask")...
program.command("search")...
program.command("version")...

// DEVELOPER COMMANDS
const devCommand = program.command("dev")...
devCommand.command("serve")...
devCommand.command("scrape")...
devCommand.command("index")...
devCommand.command("test-router")...

// BACKWARD COMPATIBILITY
program.command("serve", { hidden: true })...
program.command("scrape", { hidden: true })...
// etc.
```

---

## ✅ BENEFITS

### 1. Cleaner UX for End Users

**Before:**

```bash
docstalk --help

Commands:
  ask
  search
  serve        ← Confusing for users!
  scrape       ← Not relevant for users!
  index        ← Technical, scary!
  test-router  ← What's this?!
```

**After:**

```bash
docstalk --help

Commands:
  ask          ← Clear!
  search       ← Simple!
  version      ← Helpful!
  dev          ← Optional, for devs
```

---

### 2. Better Developer Experience

**Organized:**

- All dev tools under `dev` namespace
- Easy to discover: `docstalk dev`
- Consistent naming

**Backward Compatible:**

- Old commands still work
- Deprecation warnings guide users
- No breaking changes

---

### 3. Future-Proof

Easy to add new commands:

```typescript
// Public command
program.command("chat")...

// Developer command
devCommand.command("migrate")...
devCommand.command("backup")...
```

---

## 🔮 FUTURE ENHANCEMENTS

### Planned Public Commands

```bash
docstalk chat               # Interactive chat mode
docstalk docs <topic>       # Quick docs lookup
docstalk config             # Configure CLI
docstalk update             # Update CLI
```

### Planned Developer Commands

```bash
docstalk dev migrate        # Run migrations
docstalk dev backup         # Backup data
docstalk dev deploy         # Deploy to production
docstalk dev logs           # View logs
docstalk dev status         # System status
```

---

## 📝 MIGRATION GUIDE

### For Users

No changes needed! Public commands work same as before.

```bash
# Same as always
docstalk ask "question"
```

---

### For Developers

Update your scripts:

```bash
# Old (still works, but deprecated)
docstalk serve
docstalk scrape react
docstalk index react

# New (recommended)
docstalk dev serve
docstalk dev scrape react
docstalk dev index react
```

---

### For CI/CD

Update automation:

```bash
# Before
docstalk scrape react --incremental --index
docstalk scrape nextjs --incremental --index

# After
docstalk dev scrape react --incremental --index
docstalk dev scrape nextjs --incremental --index
```

---

## 🆘 TROUBLESHOOTING

### Issue: "Must be inside DocsTalk project"

**Command:**

```bash
docstalk dev scrape react
```

**Error:**

```
❌ Error: Must be inside DocsTalk project to use dev commands
```

**Solution:**

- Developer commands require project context
- `cd` into DocsTalk project root
- Or use public commands instead

---

### Issue: Hidden commands not working

**Command:**

```bash
docstalk scrape --help
```

**Problem:** Command doesn't show in help but should still work

**Solution:**

- Hidden commands work, just not in help
- Use `docstalk dev scrape --help` instead

---

## ✅ SUMMARY

**Structure:**

- ✅ Public commands: Clean, user-friendly
- ✅ Developer commands: Organized under `dev`
- ✅ Backward compat: Hidden commands work
- ✅ Deprecation warnings: Guide to new way

**Benefits:**

- ✅ Better UX for end users
- ✅ Clear dev tool organization
- ✅ No breaking changes
- ✅ Future-proof architecture

**Key Commands:**

```bash
# Public
docstalk ask "question"
docstalk search "query"
docstalk version

# Developer
docstalk dev serve
docstalk dev scrape <source>
docstalk dev index <source>
docstalk dev test-router <query>
```

---

**CLI now production-ready with clean public/developer separation!** 🚀
