# New Documentation Sources - Scraping Guide

**Date:** December 1, 2025  
**Status:** Production Ready  
**Method:** Unified Crawler (scrape-docs.ts)  
**New Sources:** 4 (Docker, FastAPI, Vue.js, PostgreSQL)

---

## ✅ Production Approach

All documentation scraping uses **one unified crawler** (`scrape-docs.ts`) for:

- ✅ Consistent interface
- ✅ Auto-discovery of pages
- ✅ Easy maintenance (1 file for 15+ sources)
- ✅ Better coverage (finds all linked pages)

---

## 🆕 New Sources Added

| Source         | Ecosystem    | URL                  | Status   |
| -------------- | ------------ | -------------------- | -------- |
| **Docker**     | cloud_infra  | docs.docker.com      | ✅ Ready |
| **FastAPI**    | python       | fastapi.tiangolo.com | ✅ Ready |
| **Vue.js**     | frontend_web | vuejs.org            | ✅ Ready |
| **PostgreSQL** | database     | postgresql.org/docs  | ✅ Ready |

All integrated into `scrape-docs.ts` - no separate files needed!

---

## 🚀 How to Scrape (Production)

### Step 1: Run Unified Scraper

```bash
cd apps/api

# Scrape new documentation sources
pnpm scrape docker        # Auto-crawls ~120-150 pages
pnpm scrape fastapi       # Auto-crawls ~80-100 pages
pnpm scrape vue           # Auto-crawls ~90-120 pages
pnpm scrape postgresql    # Auto-crawls ~100-150 pages
```

**What happens:**

- Crawler starts from configured start URLs
- Auto-discovers pages via link following
- Respects URL patterns (only relevant pages)
- Generates chunks with smart filtering
- Saves to `data/<source>-chunks.json`

---

## 📊 After Scraping: Database Setup

### Step 2: Add to Database

```sql
-- Insert new sources into doc_sources table
INSERT INTO doc_sources (id, name, base_url, ecosystem_id, description) VALUES
('docker', 'Docker', 'https://docs.docker.com', 'cloud_infra',
 'Containerization platform documentation'),
('fastapi', 'FastAPI', 'https://fastapi.tiangolo.com', 'python',
 'Modern Python web framework for building APIs'),
('vue', 'Vue.js', 'https://vuejs.org', 'frontend_web',
 'Progressive JavaScript framework'),
('postgresql', 'PostgreSQL', 'https://www.postgresql.org/docs', 'database',
 'Advanced open source relational database');
```

### Step 3: Index to Qdrant

```bash
# After scraping succeeds, index each source
pnpm index docker
pnpm index fastapi
pnpm index vue
pnpm index postgresql
```

### Step 4: Verify & Test

```bash
# Test queries
docstalk ask "How to build Docker containers?"
# Should detect: cloud_infra ecosystem → docker

docstalk ask "FastAPI async endpoints?"
# Should detect: python ecosystem → fastapi

docstalk ask "Vue 3 composition API?"
# Should detect: frontend_web ecosystem → vue

docstalk ask "PostgreSQL indexes?"
# Should detect: database ecosystem → postgresql
```

---

## 📈 Expected Results

After scraping and indexing, you should have:

### Coverage Update:

**Before:**

- frontend_web: 3 sources
- js_backend: 2 sources
- systems: 2 sources
- python: 1 source → **2 sources** (+ fastapi)
- database: 1 source → **2 sources** (+ postgresql)
- styling: 1 source
- ai_ml: 1 source
- cloud_infra: 0 sources → **1 source** (+ docker)

**After:**

- **Total Sources:** 12 → **15** (+ 3 new)
- **Ecosystem Coverage:** 7/8 (87.5%) → **8/8 (100%)** ✅
- **Empty Ecosystems:** 1 → **0** 🎉

---

## 🎯 Ecosystem Impact

### 🟥 Cloud & Infrastructure (NEW!)

**Before:** Empty ❌  
**After:** docker ✅

**Queries now supported:**

- "How to build Docker images?"
- "Docker compose configuration"
- "Container networking"

### 🟧 Python (Enhanced)

**Before:** python only  
**After:** python + fastapi ✅

**Queries now supported:**

- "FastAPI async endpoints"
- "Python REST API with FastAPI"
- "Dependency injection in FastAPI"

### 🟦 Frontend Web (Enhanced)

**Before:** react, nextjs, typescript  
**After:** react, nextjs, typescript, vue ✅

**Queries now supported:**

- "Vue 3 composition API"
- "Comparing React vs Vue"
- "Vue routing and state management"

### 🟫 Database (Enhanced)

**Before:** prisma only  
**After:** prisma + postgresql ✅

**Queries now supported:**

- "PostgreSQL indexes and performance"
- "SQL joins in PostgreSQL"
- "Prisma with PostgreSQL"

---

## 🔄 Future Scrapers (Priority Queue)

### Priority 1 (High Impact):

- **LangChain** (ai_ml) - AI framework
- **Django** (python) - Python web framework
- **Kubernetes** (cloud_infra) - Container orchestration
- **MongoDB** (database) - NoSQL database

### Priority 2 (Medium Impact):

- **Svelte** (frontend_web) - Frontend framework
- **Fastify** (js_backend) - Fast Node.js framework
- **AWS** (cloud_infra) - Cloud platform
- **Redis** (database) - In-memory database

### Priority 3 (Nice to Have):

- **Chakra UI** (styling) - React component library
- **Shadcn UI** (styling) - Modern UI components
- **OpenAI API** (ai_ml) - LLM API docs
- **Supabase** (database) - Backend as a service

---

## 🛠️ Adding New Sources

To add new documentation sources, update `scrape-docs.ts`:

### 1. Add Configuration

```typescript
// In apps/api/scripts/scrape/sources/scrape-docs.ts

const DOC_CONFIGS = {
  // ... existing sources ...

  // Add new source:
  langchain: {
    name: "LangChain",
    baseUrl: "https://docs.langchain.com",
    startUrls: ["https://docs.langchain.com/docs/get-started/introduction"],
    urlPattern: /^https:\/\/docs\.langchain\.com\/docs/,
    maxPages: 150,
  },
};
```

### 2. Configuration Options

```typescript
{
  name: "Display Name",          // Shown in logs
  baseUrl: "https://...",        // Base URL for relative links
  startUrls: ["https://..."],    // Where to start crawling
  urlPattern: /regex/,           // Which URLs to crawl
  maxPages: 150,                 // Max pages to scrape
}
```

### 3. Run Scraper

```bash
pnpm scrape langchain
```

### 4. Add to Database

```sql
INSERT INTO doc_sources (id, name, base_url, ecosystem_id, description) VALUES
('langchain', 'LangChain', 'https://docs.langchain.com', 'ai_ml',
 'Framework for building LLM applications');
```

### 5. Index

```bash
pnpm index langchain
```

---

## ✅ Checklist for Adding New Source

- [ ] Add config to `scrape-docs.ts` DOC_CONFIGS
- [ ] Test scraper: `pnpm scrape <source>`
- [ ] Verify chunks in `data/<source>-chunks.json`
- [ ] Insert into `doc_sources` table with correct ecosystem_id
- [ ] Run indexer: `pnpm index <source>`
- [ ] Verify in Qdrant dashboard
- [ ] Test queries via chat or CLI

---

## 📝 Notes

**Scraping Best Practices:**

- ✅ Use rate limiting (1s delay between requests)
- ✅ Handle errors gracefully
- ✅ Extract only main content
- ✅ Remove navigation/footers
- ✅ Convert HTML to Markdown
- ✅ Include metadata (url, title, section)

**Legal Considerations:**

- ✅ Only scrape publicly available documentation
- ✅ Respect robots.txt
- ✅ Include source attribution
- ✅ Don't overload servers

---

**Ready to scrape?** Start with high-priority sources! 🚀
