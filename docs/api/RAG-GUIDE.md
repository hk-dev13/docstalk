# DocsTalk RAG System - Quick Start Guide

## 🎯 What Changed

We've **pivoted from Vertex AI Agent Builder** to a **Simple RAG (Retrieval-Augmented Generation)** architecture due to domain verification issues with Google.

**New Architecture:**

```
User Query → Supabase Vector Search → Top 5 Chunks → Gemini 2.5 Flash → Answer + Code
```

**Benefits:**

- ✅ **No domain verification** needed
- ✅ **100% free tier** (Supabase + Gemini)
- ✅ **Full control** over data
- ✅ **Easier to debug**
- ✅ **Can add custom docs**

---

## 🚀 Setup Instructions

### 1. Setup Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Create new project: "docstalk"
3. Copy credentials:

   - Project URL
   - Service role key (Settings → API)

4. Run schema SQL:
   - Go to SQL Editor
   - Copy contents of `supabase-schema.sql`
   - Run the SQL
   - Verify: Check "doc_chunks" table exists with pgvector enabled

### 2. Get Gemini API Key (2 minutes)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create API key
3. Copy the key

**Free Tier**: 15 requests/minute (enough for MVP!)

### 3. Configure Environment Variables

Update `apps/api/.env`:

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Gemini
GEMINI_API_KEY=AIzaxxx...

# Frontend URL
FRONTEND_URL=http://localhost:3000
PORT=3001
```

---

## 📚 Scraping & Indexing Documentation

### Step 1: Scrape Documentation

Run scraper for each documentation source:

```bash
cd apps/api

# Scrape Next.js docs (~200 pages, ~5 minutes)
pnpm scrape nextjs

# Scrape React docs (~150 pages, ~4 minutes)
pnpm scrape react

# Scrape TypeScript docs (~100 pages, ~3 minutes)
pnpm scrape typescript
```

**Output**: Creates `data/[source]-chunks.json` files

### Step 2: Index to Supabase

Generate embeddings and store in Supabase:

```bash
# Index Next.js chunks (~2-3 minutes, ~500 chunks)
pnpm index nextjs

# Index React chunks (~2 minutes, ~300 chunks)
pnpm index react

# Index TypeScript chunks (~1-2 minutes, ~200 chunks)
pnpm index typescript
```

**What happens:**

- Generates embeddings with Gemini (free tier)
- Stores chunks in Supabase with pgvector
- Updates `doc_sources` metadata

**Estimated time**: ~15-20 minutes total for all 3 docs

---

## 🧪 Testing the RAG System

### 1. Start Backend

```bash
cd apps/api
pnpm dev
```

You should see:

```
🚀 Server running on http://localhost:3001
📚 RAG service initialized
```

### 2. Test Health Check

```bash
curl http://localhost:3001/health
```

### 3. Test Vector Search

```bash
curl -X POST http://localhost:3001/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to create a Next.js app?",
    "source": "nextjs"
  }'
```

**Expected response:**

```json
{
  "query": "How to create a Next.js app?",
  "results": [
    {
      "content": "...",
      "url": "https://nextjs.org/docs/...",
      "title": "Creating a Next.js App",
      "similarity": 0.87
    }
  ],
  "count": 5
}
```

### 4. Test Chat Endpoint

```bash
curl -X POST http://localhost:3001/api/v1/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I create a Next.js app?",
    "docSource": "nextjs"
  }'
```

**Expected response:**

````json
{
  "answer": "## Explanation\nTo create a Next.js app...\n\n## Code Example\n```bash\nnpx create-next-app@latest\n```",
  "code": "npx create-next-app@latest",
  "references": [
    {
      "title": "Getting Started",
      "url": "https://nextjs.org/docs/...",
      "snippet": "..."
    }
  ],
  "tokensUsed": 450
}
````

### 5. Test Streaming Endpoint

```bash
curl -X POST http://localhost:3001/api/v1/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to use React hooks?",
    "docSource": "react"
  }'
```

---

## 📊 Architecture Details

### Database Schema

**doc_chunks table:**

- `id`: UUID primary key
- `content`: Text content
- `url`: Source URL
- `title`: Page title
- `source`: 'nextjs' | 'react' | 'typescript'
- `embedding`: vector(768) - Gemini embedding
- `metadata`: JSONB - Additional data

**Vector Search Function:**

```sql
search_docs(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_source text
)
```

### RAG Service Flow

1. **User sends query** → Backend API
2. **Generate query embedding** → Gemini text-embedding-004
3. **Vector similarity search** → Supabase pgvector
4. **Retrieve top 5 chunks** → Most similar content
5. **Build context prompt** → Combine chunks
6. **Generate answer** → Gemini 2.5 Flash
7. **Return response** → Answer + code + references

---

## 💰 Cost Analysis

### Free Tier Limits

| Service              | Free Tier          | Usage (3 docs)        | Cost         |
| -------------------- | ------------------ | --------------------- | ------------ |
| **Supabase**         | 500MB database     | ~100MB (1,000 chunks) | $0           |
| **Gemini Embedding** | Free forever       | ~1,000 requests       | $0           |
| **Gemini 2.5 Flash** | 15 RPM             | Unlimited requests    | $0           |
| **Puppeteer**        | Free (self-hosted) | Local scraping        | $0           |
| **Total**            |                    |                       | **$0/month** |

### Scale Costs (1,000 users, 10K queries/month)

| Service          | Usage                            | Cost             |
| ---------------- | -------------------------------- | ---------------- |
| Supabase         | 500MB (still free tier)          | $0               |
| Gemini Embedding | 100 requests/month (re-indexing) | $0               |
| Gemini 2.5 Flash | 10K queries @ $0.075/1M tokens   | ~$5-10           |
| **Total**        |                                  | **~$5-10/month** |

**Compare to Vertex AI**: Would cost ~$200/month for same usage!

---

## 🔧 Troubleshooting

### "Cannot connect to Supabase"

- Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- Verify pgvector extension is enabled
- Run supabase-schema.sql

### "Gemini rate limit exceeded"

- Free tier: 15 RPM
- Add delays in indexing script (already implemented)
- Consider upgrading to paid tier ($20/month for 1500 RPM)

### "No search results"

- Verify chunks are indexed: Check doc_chunks table in Supabase
- Try different query phrasing
- Lower match_threshold in search function

### "Scraper timeout"

- Some docs are very large, increase timeout in script
- Run scraper multiple times for different sections
- Use smaller maxPages value

---

## 📁 Project Structure

```
apps/api/
├── scripts/
│   ├── scrape-docs.ts      # Documentation scraper
│   └── index-docs.ts       # Embedding & indexing
├── src/
│   ├── services/
│   │   └── rag.service.ts  # RAG query logic
│   └── index.ts            # Fastify server
└── data/                   # Scraped chunks (gitignored)
    ├── nextjs-chunks.json
    ├── react-chunks.json
    └── typescript-chunks.json
```

---

## 🎯 Next Steps

1. ✅ Setup Supabase + Gemini
2. ✅ Run schema SQL
3. ✅ Scrape 3 documentation sources
4. ✅ Index chunks to Supabase
5. ✅ Test API endpoints
6. [ ] Build frontend chat UI
7. [ ] Connect frontend to backend
8. [ ] Add authentication (Clerk)
9. [ ] Deploy to production

---

## 📚 API Reference

### POST /api/v1/search

Search documentation with vector similarity.

**Request:**

```json
{
  "query": "string",
  "source": "nextjs" | "react" | "typescript" (optional)
}
```

**Response:**

```json
{
  "query": "string",
  "results": [
    {
      "content": "string",
      "url": "string",
      "title": "string",
      "similarity": number
    }
  ],
  "count": number
}
```

### POST /api/v1/chat/query

Get AI-generated answer with code examples.

**Request:**

```json
{
  "query": "string",
  "docSource": "nextjs" | "react" | "typescript" (optional)
}
```

**Response:**

```json
{
  "answer": "string (markdown)",
  "code": "string (optional)",
  "references": [
    {
      "title": "string",
      "url": "string",
      "snippet": "string"
    }
  ],
  "tokensUsed": number
}
```

### POST /api/v1/chat/stream

Stream AI-generated answer (SSE).

**Request:** Same as /chat/query

**Response:** Server-Sent Events

```
data: {"chunk":"## Explanation\n"}
data: {"chunk":"Next.js is..."}
data: [DONE]
```

### GET /api/v1/docs/sources

Get available documentation sources.

**Response:**

```json
{
  "sources": [
    {
      "id": "nextjs",
      "name": "Next.js",
      "total_chunks": 500,
      "last_scraped": "2025-11-23T..."
    }
  ]
}
```

---

**Ready to test!** 🚀
