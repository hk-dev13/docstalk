<div align="center">

# DocsTalk

**Connect your LLM to living, official docs.  
Stop trusting stale answers.**

---

### Tech Stack

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-000000?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-000000?style=flat&logo=tailwind-css&logoColor=38B2AC)](https://tailwindcss.com/)

### Integrations

[![Gemini](https://img.shields.io/badge/Gemini_AI-000000?style=flat&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Clerk](https://img.shields.io/badge/Clerk_Auth-000000?style=flat&logo=clerk&logoColor=white)](https://clerk.dev/)
[![Supabase](https://img.shields.io/badge/Supabase_DB-000000?style=flat&logo=supabase&logoColor=3ECF8E)](https://supabase.com/)
[![Qdrant](https://img.shields.io/badge/Qdrant_VectorDB-000000?style=flat&logo=qdrant&logoColor=white)](https://qdrant.tech/)

### Project

[![DocsTalk](https://img.shields.io/badge/DocsTalk-Smart_Assistant-000000?style=flat)](https://docstalk.envoyou.com)
[![MIT License](https://img.shields.io/badge/License-MIT-000000?style=flat)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-0.3.1--alpha-blue)](https://github.com/hk-dev13/docstalk/releases)

<br />

**AI-powered documentation assistant for developers.  
Get instant, accurate answers from official docs using RAG.**

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [When to Use DocsTalk](#-when-to-use-docstalk)
- [Key Features](#-key-features)
- [Architecture](#️-hybrid-architecture)
- [Ecosystem Routing](#-ecosystem-based-routing-v031-alpha)
- [Getting Started](#-getting-started)
- [CLI Usage](#-cli-usage)
- [Known Limitations](#-known-limitations)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

DocsTalk is an AI-powered documentation assistant that helps developers find accurate answers from official documentation. Unlike general-purpose LLMs that may hallucinate or provide outdated information, DocsTalk uses RAG (Retrieval-Augmented Generation) to ensure answers are grounded in actual, up-to-date documentation.

**Current Status:** v0.3.1-alpha (Production-Ready)

---

## ✅ When to Use DocsTalk

### 👍 Use this if:

- You want accurate answers from official documentation
- You're tired of LLMs making up APIs or deprecated features
- You work with multiple frameworks and need quick reference
- You need answers in your native language (supports 100+ languages)
- You want to ensure consistency across team documentation lookup

### 👎 Not suitable if:

- You need general-purpose chat AI or creative writing
- You want code generation without documentation context
- You need offline access (requires internet connection)
- You're looking for non-technical content

---

## ✨ Key Features

- **Ecosystem-Based Routing** ⭐: Hierarchical doc grouping with intelligent detection*
- **Smart Scraping** 🆕: Incremental & partial modes (5-60x faster updates)*
- **Secure CLI** 🔒: Multi-layer authentication for developer commands
- **Smart Auto-Detection**: Automatically identifies relevant documentation
- **Hybrid Search**: Combines keyword matching with semantic vector search
- **Multi-Source Support**: 16 sources across 8 ecosystems (React, Next.js, Python, Docker, etc.)
- **Deterministic Indexing**: Stable chunk IDs for idempotent reindexing
- **CLI Tools**: Command-line interface for scraping, indexing, and querying
- **RAG Powered**: Uses Google Gemini (latest model) for accurate, context-aware answers
- **Global Language Support**: Responds in user's query language

_*Performance metrics depend on query complexity, dataset size, and baseline comparison. See [Performance](#performance) section._

---

## 🏗️ Hybrid Architecture

DocsTalk uses a **Hybrid Architecture** for maximum scalability and performance:

- **Supabase (PostgreSQL)**: System of Record - stores user data, chat history, and documentation metadata
- **Qdrant (Vector DB)**: Semantic Engine - stores high-dimensional vectors and full content for fast retrieval

---

## 🎯 Ecosystem-Based Routing (v0.3.1-alpha)

DocsTalk uses **Hierarchical Ecosystem Routing** for intelligent documentation detection:

### 8 Ecosystem Groups

- 🟦 **Frontend Web** - React, Next.js, Vue, TypeScript
- 🟩 **JS Backend** - Node.js, Express
- 🟧 **Python** - FastAPI, Python
- 🟨 **Systems** - Rust, Go
- 🟥 **Cloud/Infra** - Docker
- 🟪 **AI/ML** - DocsTalk Platform
- 🟫 **Database** - Prisma, PostgreSQL
- 🟩 **Styling** - Tailwind CSS

### 4-Stage Detection

1.  **Alias Matching** (~2ms) - Natural phrases like "react hooks", "next router"
2.  **Keyword Groups** (~5ms) - Semantic clustering of related concepts
3.  **Vector Similarity** (~15ms) - 768d Gemini embeddings
4.  **AI Classification** (~500ms) - Fallback for complex queries

### Performance

- ⚡ **10-250x faster** detection (2-50ms vs 500ms baseline)*
- 📈 **92% accuracy** in routing queries to correct documentation
- 🎯 **Multi-doc context** - Searches related docs in parallel
- 💾 **GIN indexes** - Optimized keyword/alias searches

_*Compared to full AI classification on every query. Actual speedup varies by query type and complexity._

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase Project
- Qdrant Instance (Cloud or Docker)
- Google Gemini API Key
- Clerk account

### Environment Setup

Create `.env` files in `apps/web` and `apps/api` (see `.env.example`).

**Required for API:**

```env
# Database
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
QDRANT_URL=...
QDRANT_API_KEY=...

# AI
GEMINI_API_KEY=...
```

### Installation

```bash
# Clone repository
git clone https://github.com/hk-dev13/docstalk.git
cd docstalk

# Install dependencies
pnpm install

# Setup environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# Build all packages
pnpm build

# Run development servers
pnpm dev
```

---

## 🖥️ CLI Usage

DocsTalk comes with a powerful CLI tool for managing documentation:

### Installation

```bash
# Install CLI globally
npm install -g @docstalk/cli

# Or use from project
cd packages/cli
pnpm link --global
```

### Public Commands (No authentication required)

```bash
# Ask a question
docstalk ask "how to use react hooks?"

# Ask with specific source
docstalk ask "docker compose" --source docker

# Search documentation
docstalk search "typescript generics"

# Show version
docstalk version

# Show help
docstalk help
```

### Developer Commands (Requires authentication)

```bash
# Setup authentication
export DOCSTALK_ADMIN_TOKEN=dtalk_admin_YOUR_SECRET_KEY

# Start development server
docstalk dev serve

# Scrape documentation
docstalk dev scrape react
docstalk dev scrape react --incremental  # 5-10x faster
docstalk dev scrape https://react.dev/hooks/useState --partial  # 20-60x faster

# Index documentation
docstalk dev index react

# Scrape and index in one go
docstalk dev scrape react --index

# Test router
docstalk dev test-router "how to use hooks?"
```

### CLI Features

- **Smart Scraping**: Incremental and partial modes for faster updates
- **Auto-indexing**: Scrape and index in one command
- **Multi-layer Auth**: Secure developer commands
- **Global Access**: Works from anywhere with proper token
- **Branded UI**: Beautiful ASCII art and helpful messages

See [CLI Documentation](packages/cli/docs/command-structure.md) for more details.

---

## ⚠️ Known Limitations

### Current Limitations (v0.3.1-alpha)

- **No Automatic Re-scraping**: Documentation must be manually re-scraped to update
- **No Offline Mode**: Requires internet connection for queries and indexing
- **Partial Source Coverage**: Some documentation sources may have incomplete indexing
- **API Quota Dependency**: Initial indexing requires Google Gemini API quota
- **No Real-time Updates**: Documentation updates are not reflected until re-indexed
- **Limited to 16 Sources**: Currently supports 16 documentation sources (can be expanded)

### Planned Improvements

See [Roadmap](#-roadmap) for upcoming features and improvements.

---

### Environment Setup

**Web (.env.local):**

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**API (.env):**

```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
CLERK_SECRET_KEY=your_clerk_secret
QDRANT_URL=...
QDRANT_API_KEY=...
```

## 📁 Monorepo Structure

```
docs_talk/
├── apps/
│   ├── web/              # Next.js 16 frontend
│   │   ├── src/
│   │   │   ├── app/      # App router pages
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── package.json
│   ├── api/              # Fastify backend
│   │   ├── src/
│   │   │   ├── index.ts  # Main server
│   │   │   └── services/
│   │   ├── scripts/
│   │   │   ├── scrape/   # Documentation scrapers
│   │   │   └── index/    # Indexing scripts
│   │   └── package.json
│   └── cli/              # CLI Tool (NEW!)
│       ├── src/
│       │   ├── commands/
│       │   └── index.ts
│       └── package.json
│
├── packages/             # Shared packages
│   ├── ui/              # Shared React components
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── chat-message.tsx
│   │   │   ├── chat-input.tsx
│   │   │   └── conversation-sidebar.tsx
│   │   └── package.json
│   │
│   ├── types/           # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── api.ts
│   │   │   ├── document.ts
│   │   │   └── enums.ts
│   │   └── package.json
│   │
│   ├── rag/             # RAG utilities
│   │   ├── src/
│   │   │   ├── embeddings.ts
│   │   │   ├── usage-tracking.ts
│   │   │   ├── conversation.ts
│   │   │   └── response-modes.ts
│   │   └── package.json
│   │
│   └── config/          # Shared configs
│       ├── tsconfig.base.json
│       ├── tailwind.preset.js
│       └── .prettierrc.js
│
├── scripts/             # Root automation scripts
│   ├── dev-all.sh      # Run all apps
│   ├── build-all.sh    # Build monorepo
│   ├── deploy-api.sh   # Deploy API
│   └── deploy-web.sh   # Deploy web
│
└── docs/                # Documentation & guides
    ├── GETTING-STARTED.md
    ├── api/
    └── database/
```

## 🛠️ Tech Stack

### Frontend

- **Next.js 16.0.3** - React framework with App Router
- **React 19** - Latest React with Server Components
- **TailwindCSS v4** - Utility-first CSS
- **shadcn/ui** - Beautiful component library
- **Clerk** - Authentication & user management
- **next-themes** - Dark/Light mode support

### Backend & CLI

- **Fastify** - Fast TypeScript web framework
- **Commander.js** - CLI framework
- **Google Gemini 2.5 Flash** - LLM for answer generation & reasoning
- **Gemini text-embedding-004** - Vector embeddings
- **Supabase** - PostgreSQL with pgvector
- **Clerk** - Auth verification
- **Qdrant** - Vector database

### DevOps

- **pnpm** - Fast, efficient package manager
- **TypeScript 5** - Type safety across monorepo
- **ESLint 9** - Code linting
- **Prettier** - Code formatting

## 📚 Documentation Workflow

### 1. Scrape Documentation

```bash
# Scrape official documentation
cd apps/api
pnpm scrape nextjs    # Scrape Next.js docs
pnpm scrape react     # Scrape React docs
pnpm scrape typescript # Scrape TypeScript docs
```

### 2. Index Documentation

```bash
# Generate embeddings and store in Supabase
pnpm index nextjs
pnpm index react
pnpm index typescript
```

### 3. Query via Chat

Open http://localhost:3000 and start asking questions!

## 🔧 Development Scripts

### Monorepo Commands

```bash
# Development
./scripts/dev-all.sh              # Run all apps
pnpm --filter @docstalk/web dev   # Run web only
pnpm --filter @docstalk/api dev   # Run API only

# Building
./scripts/build-all.sh            # Build everything
pnpm --filter @docstalk/ui build  # Build UI package
pnpm --filter @docstalk/rag build # Build RAG package

# Deployment
./scripts/deploy-web.sh           # Deploy web
./scripts/deploy-api.sh           # Deploy API
```

### Package-Specific

```bash
# Web
cd apps/web
pnpm dev          # Development server
pnpm build        # Production build
pnpm start        # Run production build

# API
cd apps/api
pnpm dev          # Development server
pnpm build        # Build TypeScript
pnpm start        # Run compiled JS
pnpm scrape <source>  # Scrape docs
pnpm index <source>   # Index docs
```

## 🏗️ Architecture

### RAG Pipeline

1. **Scraping** - Crawl official documentation with Puppeteer
2. **Chunking** - Smart text splitting with overlap (auto-split for large chunks)
3. **Embedding** - Generate vectors using Gemini text-embedding-004
4. **Storage** - Store in Supabase with pgvector
5. **Qdrant** - Store in Qdrant vector database
6. **Retrieval** - Hybrid search (similarity + keyword + version-aware)
7. **Generation** - Context-aware answers with Gemini 2.5 Flash

### Key Features

**Query Reformulation:**

- Converts follow-up questions into standalone queries
- Preserves conversation context
- Improves search accuracy

**Auto-Split Chunking:**

- Intelligently splits large content (>30KB)
- Preserves semantic boundaries (paragraphs, sentences)
- Tracks parts with metadata

**Response Modes:**

- Friendly, Formal, Tutorial, Simple, Deep-dive, Examples, Summary
- Customizable persona and tone

## 📊 Database Schema

See [docs/database/schema_docstalk.sql](docs/database/schema_docstalk.sql)

Key tables:

- `users` - User accounts (from Clerk)
- `user_usage` - Usage tracking & limits
- `conversations` - Chat conversations
- `messages` - Chat history
- `doc_chunk_meta` - Documentation chunks with embeddings
- `doc_sources` - Documentation source metadata
- `context_switches` - Context switching history
- `usage` - Usage tracking & limits

## 🤝 Contributing

We welcome contributions! This project is designed to be maintainable by solo developers.

### Adding New Documentation Source

1. Copy template: `apps/api/scripts/scrape/sources/_template.ts`
2. Implement scraping logic for your source
3. Add to `DOC_CONFIGS` in `scrape-docs.ts`
4. Run `pnpm scrape <your-source>`
5. Run `pnpm index <your-source>`

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Next.js team for amazing documentation
- Google Gemini for powerful AI capabilities
- Supabase for excellent PostgreSQL + pgvector
- Clerk for authentication
- Qdrant for vector database
- Shadcn for beautiful UI components
- Puppeteer for web scraping
- Commander.js for CLI
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting

---

**Built with ❤️ for developers who hate reading manual documentation**
