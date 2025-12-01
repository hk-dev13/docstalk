# New Documentation Sources - Scraping Guide

**Date:** December 1, 2025  
**Status:** Ready to Scrape  
**Created Scrapers:** 4

---

## 📋 Available New Scrapers

### ✅ Created (Ready to Use)

| Source         | File            | Ecosystem    | Priority    | Status   |
| -------------- | --------------- | ------------ | ----------- | -------- |
| **Docker**     | `docker.ts`     | cloud_infra  | ⭐⭐⭐ High | ✅ Ready |
| **FastAPI**    | `fastapi.ts`    | python       | ⭐⭐⭐ High | ✅ Ready |
| **Vue.js**     | `vue.ts`        | frontend_web | ⭐⭐ Medium | ✅ Ready |
| **PostgreSQL** | `postgresql.ts` | database     | ⭐⭐ Medium | ✅ Ready |

---

## 🚀 How to Use Scrapers

### Option 1: Individual Scraper (Development)

```bash
# Navigate to API directory
cd apps/api

# Run single scraper
pnpm tsx scripts/scrape/sources/docker.ts
pnpm tsx scripts/scrape/sources/fastapi.ts
pnpm tsx scripts/scrape/sources/vue.ts
pnpm tsx scripts/scrape/sources/postgresql.ts
```

### Option 2: Through Main Scraper (Production)

Update `scripts/scrape/sources/scrape-docs.ts` dengan source baru:

```typescript
// Add to DOC_CONFIGS
const DOC_CONFIGS = {
  // ... existing configs ...

  docker: {
    name: "Docker",
    scraper: () => import("./docker.js").then((m) => m.scrapeDocker()),
  },
  fastapi: {
    name: "FastAPI",
    scraper: () => import("./fastapi.js").then((m) => m.scrapeFastAPI()),
  },
  vue: {
    name: "Vue.js",
    scraper: () => import("./vue.js").then((m) => m.scrapeVue()),
  },
  postgresql: {
    name: "PostgreSQL",
    scraper: () => import("./postgresql.js").then((m) => m.scrapePostgreSQL()),
  },
};
```

Then run:

```bash
pnpm scrape docker
pnpm scrape fastapi
pnpm scrape vue
pnpm scrape postgresql
```

---

## 📊 After Scraping: Database Setup

### Step 1: Add to `doc_sources` Table

```sql
-- Insert new sources
INSERT INTO doc_sources (id, name, base_url, ecosystem_id, description) VALUES
('docker', 'Docker', 'https://docs.docker.com', 'cloud_infra', 'Containerization platform documentation'),
('fastapi', 'FastAPI', 'https://fastapi.tiangolo.com', 'python', 'Modern Python web framework for building APIs'),
('vue', 'Vue.js', 'https://vuejs.org', 'frontend_web', 'Progressive JavaScript framework'),
('postgresql', 'PostgreSQL', 'https://www.postgresql.org/docs', 'database', 'Advanced open source database');
```

### Step 2: Index to Qdrant

```bash
# Run indexer for each source
pnpm index docker
pnpm index fastapi
pnpm index vue
pnpm index postgresql
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

## 🛠️ Scraper Template

To create new scrapers, copy `_template.ts` and follow this structure:

```typescript
import { DocumentChunk } from "@docstalk/types";
import puppeteer from "puppeteer";
import TurndownService from "turndown";

const BASE_URL = "https://docs.example.com";
const SECTIONS_TO_SCRAPE = ["/guide/", "/api/"];

export async function scrapeSource(): Promise<DocumentChunk[]> {
  const browser = await puppeteer.launch({ headless: true });
  const chunks: DocumentChunk[] = [];

  // Scraping logic here

  await browser.close();
  return chunks;
}
```

---

## ✅ Checklist for Adding New Source

- [ ] Create scraper file in `scripts/scrape/sources/`
- [ ] Test scraper: `pnpm tsx scripts/scrape/sources/your-source.ts`
- [ ] Add to `scrape-docs.ts` DOC_CONFIGS
- [ ] Insert into `doc_sources` table with correct ecosystem_id
- [ ] Run scraper: `pnpm scrape your-source`
- [ ] Run indexer: `pnpm index your-source`
- [ ] Verify in Qdrant
- [ ] Test queries via chat

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
