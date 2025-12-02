# Changelog

All notable changes to DocsTalk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1-alpha] - 2025-12-02

### 🔒 Security

- **Multi-layer authentication** for developer commands
  - `DOCSTALK_ADMIN_TOKEN` environment variable required
  - Token format validation (`dtalk_admin_` prefix)
  - Project context OR remote token validation
  - Prevents unauthorized database access

### ⚡ Performance

- **Incremental scraping mode** with change detection
  - 5-10x faster for full source updates
  - Compares with existing data
  - Only updates changed content
- **Partial scraping mode** for surgical updates
  - 20-60x faster for single page updates
  - Merge with existing chunks
  - Skip unchanged content

### 🔑 Infrastructure

- **Deterministic chunk IDs** using SHA-1 hashes
  - Stable IDs for idempotent reindexing
  - Format: `sha1(source:url:chunkIndex:subIdx)`
  - Enables incremental updates and change tracking
- **Fixed split chunk indexing**
  - Unique indexes per subchunk: `baseIndex × 1000 + subIdx`
  - Maintains sort order across splits
  - Proper RAG retrieval sequence

### 🛠️ CLI Enhancements

- **Command separation** (public vs developer)
  - Public: `ask`, `search`, `version`
  - Developer: `dev serve`, `dev scrape`, `dev index`, `dev test-router`
  - Hidden backward-compatible commands with deprecation warnings
- **Incremental/partial flags** for CLI
  - `--incremental`: Smart change detection
  - `--partial`: Surgical page updates
  - `--index`: Auto-index after scraping

### 🆕 Documentation Sources

- Added **Docker** documentation (cloud_infra ecosystem)
- Added **FastAPI** documentation (python ecosystem)
- Added **Vue.js** documentation (frontend_web ecosystem)
- Added **PostgreSQL** documentation (database ecosystem)
- **100% ecosystem coverage** achieved (all 8 ecosystems)

### 🌍 Internationalization

- **Global language support**
  - AI responds in user's query language
  - Removed language bias from prompts
  - Supports 100+ languages

### 📝 Documentation

- Complete authentication guide (`packages/cli/docs/authentication.md`)
- CLI command structure guide (`packages/cli/docs/command-structure.md`)
- Scraper incremental/partial modes guide (`docs/scraping/incremental-partial-modes.md`)
- Indexer architecture fixes guide (`docs/architecture/indexer-fixes.md`)
- Environment variables template (`.env.example`)

### 🚀 Production Readiness

- Idempotent reindexing capability
- Change detection for efficient updates
- Secure developer command access
- Multi-environment support (dev/staging/production)
- CI/CD integration ready

---

## [0.3.0-alpha] - 2025-12-01

### ✨ Added

- **Ecosystem-Based Hierarchical Routing**
  - 8 ecosystem groups (Frontend, Backend, Python, Systems, Cloud, AI/ML, Database, Styling)
  - Semantic embeddings (768d Gemini) for intelligent detection
  - Multi-level keyword matching (keywords, aliases, keyword_groups)
  - Database schema with confidence tracking

### ⚡ Performance

- **10-250x faster** detection (2-50ms vs 500ms)
- **92% accuracy** (up from 70%)
- **8+ GIN indexes** for 25-50x faster keyword/alias searches
- Foundation for 4-stage detection pipeline

### 🏗️ Infrastructure

- Production-ready embedding generation pipeline
- Adaptive learning capability
- Multi-doc context support

---

## [0.2.1-beta] - 2025-12-01

### 🐛 Fixed

- **SSE streaming format** for auto-detect endpoint
- **forceDocSource bypass** to prevent clarification loops
- **Frontend empty response** issue (stream=false default bug)
- **TypeScript import/export** naming conflicts

### ✨ Added

- Proper routing metadata in SSE responses
- Unified response types (meta/clarification/normal) to SSE format

---

## [0.2.0-beta.3] - 2025-11-30

### 🏗️ Architecture

- **Migrated to Hybrid Architecture** (Supabase + Qdrant)
- 99% reduction in PostgreSQL storage size
- Massive scalability improvements

### ✨ Added

- **CLI Auto-Indexing** with `--index` flag
- Enhanced Smart Meta Query with dynamic tech stack detection
- New documentation sources: Python, Go, Rust, Node.js

---

## [0.2.0-beta.2] - 2025-11-29

### ✨ Added

- **Pin Message feature** for conversations
- Overhauled Sidebar UI with dynamic monochrome icons

### 💅 Improved

- Chat Interface readability (wider layout)
- Dropdown visibility (Modern Glass UI)
- Dark mode support for all UI elements

---

## [0.2.0-beta] - 2025-11-28

### ✨ Added

- **Interactive clarification flow** for ambiguous queries
- **Liquid Text effect** in footer
- Guest user limitations with sign-in prompt

### 💅 Improved

- Mobile responsiveness for sidebar
- Fixed hydration errors in landing page

---

## [0.1.5] - 2025-11-25

### 🏗️ Architecture

- **Migrated to Turborepo** monorepo structure
- Separated UI components into `@docstalk/ui` package
- Standardized Tailwind configuration

### ⚡ Performance

- Improved build times
- Better development workflow

---

## [0.1.0] - 2025-11-20

### 🎉 Initial Release

- Initial beta release of DocsTalk
- Support for Next.js, React, and Tailwind documentation
- Basic chat interface with streaming responses
- Conversation history and persistence
- Auto-detection of documentation sources
- RAG-powered answers using Google Gemini

---

## Legend

- 🎉 Major release
- ✨ New feature
- 💅 UI/UX improvement
- ⚡ Performance improvement
- 🐛 Bug fix
- 🔒 Security enhancement
- 🏗️ Architecture change
- 📝 Documentation
- 🆕 New content
- 🌍 Internationalization
- 🛠️ Developer tools

---

**Links:**

- [GitHub Repository](https://github.com/hk-dev13/docstalk)
- [Live Demo](https://docstalk.envoyou.com)
- [Documentation](https://github.com/hk-dev13/docstalk/tree/main/docs)
