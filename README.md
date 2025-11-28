# DocsTalk 🚀

> AI-powered documentation assistant for developers. Get instant, accurate answers from official docs using RAG (Retrieval-Augmented Generation).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16.0.3-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react&logoColor=white)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-8E75B2?style=flat&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

## ✨ Features

- 🤖 **Smart RAG System** - Vector similarity search with Gemini
- 🧠 **Real Reasoning** - View the AI's step-by-step thought process before the answer
- 📚 **Multi-Source** - Supports Next.js, React, TypeScript docs (extensible)
- 🔄 **Version-Aware** - Intelligently handles documentation from multiple versions
- ⚡ **Streaming Responses** - Real-time answer generation with "Thinking" UI
- 🗣️ **Text-to-Speech** - Listen to answers with stop/cancel control
- 💬 **Conversation History** - Context-aware follow-up questions
- 🎯 **Response Modes** - 7 different response styles (Friendly, Formal, Tutorial, etc.)
- 💻 **CLI Tool** - Manage scraping, indexing, and chat from the terminal
- 🌓 **Dark/Light Mode** - Beautiful UI with theme toggle
- 🔒 **Auth & Usage Limits** - Clerk authentication with rate limiting

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Supabase account
- Google Gemini API key
- Clerk account

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
./scripts/build-all.sh

# Run development servers
./scripts/dev-all.sh
```

### CLI Usage

DocsTalk comes with a powerful CLI tool for managing documentation:

```bash
# Link the CLI globally
cd apps/cli
pnpm link --global

# Usage
docstalk scrape <source>   # Scrape documentation
docstalk index <source>    # Index documentation
docstalk ask "question"    # Ask a question from terminal
docstalk serve             # Start the API server
```

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
5. **Retrieval** - Hybrid search (similarity + keyword + version-aware)
6. **Generation** - Context-aware answers with Gemini 2.5 Flash

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

See [docs/database/supabase-schema.sql](docs/database/supabase-schema.sql)

Key tables:

- `users` - User accounts (from Clerk)
- `user_usage` - Usage tracking & limits
- `conversations` - Chat conversations
- `messages` - Chat history
- `doc_chunks` - Documentation chunks with embeddings
- `doc_sources` - Documentation source metadata

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
- Shadcn for beautiful UI components

---

**Built with ❤️ for developers who hate reading manual documentation**
