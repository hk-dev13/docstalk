# Getting Started with DocsTalk

## Prerequisites

- Node.js 20.9+
- pnpm (install via `npm install -g pnpm`)
- Supabase account ([supabase.com](https://supabase.com))
- Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/app/apikey))

## Quick Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

#### Root `.env`

```bash
cp .env.example .env
```

#### Frontend `.env.local`

```bash
cd apps/web
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
- `CLERK_SECRET_KEY` - From Clerk dashboard
- `NEXT_PUBLIC_SUPABASE_URL` - From Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase API settings

#### Backend `.env`

```bash
cd apps/api
cp .env.example .env
```

Fill in:

- `SUPABASE_URL` - Same as frontend
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase API settings (service role)
- `GEMINI_API_KEY` - From Google AI Studio

### 3. Setup Database

1. Create Supabase project
2. Go to SQL Editor
3. Run the SQL from `docs/database/supabase-schema.sql`
4. (Optional) Run `docs/database/supabase-migration-parent-doc.sql` for enhanced features

### 4. Scrape & Index Documentation

```bash
cd apps/api

# Scrape documentation (takes ~10-15 mins for all 3)
pnpm scrape nextjs
pnpm scrape react
pnpm scrape typescript

# Generate embeddings and store in Supabase (takes ~10-15 mins)
pnpm index nextjs
pnpm index react
pnpm index typescript
```

### 5. Run Development Servers

```bash
# From project root - runs both frontend and backend
pnpm dev
```

Or run separately:

```bash
# Terminal 1 - Backend
cd apps/api
pnpm dev

# Terminal 2 - Frontend
cd apps/web
pnpm dev
```

**Access**:

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Testing the RAG System

Test backend directly:

```bash
# Search test
curl -X POST http://localhost:3001/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to create a Next.js app?",
    "source": "nextjs"
  }'

# Chat test (non-streaming)
curl -X POST http://localhost:3001/api/v1/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I create a Next.js app?",
    "docSource": "nextjs"
  }'

# Chat test (streaming)
curl -X POST http://localhost:3001/api/v1/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to use React hooks?",
    "docSource": "react"
  }'
```

## Documentation

- **RAG System**: [docs/api/RAG-GUIDE.md](docs/api/RAG-GUIDE.md)
- **Chunking Improvements**: [docs/api/RAG-CHUNKING-FIX.md](docs/api/RAG-CHUNKING-FIX.md)
- **Quality Filtering**: [docs/api/CONTENT-QUALITY-FIX.md](docs/api/CONTENT-QUALITY-FIX.md)
- **Version Awareness**: [docs/api/HYBRID-VERSION-AWARE.md](docs/api/HYBRID-VERSION-AWARE.md)
- **Database Schema**: [docs/database/supabase-schema.sql](docs/database/supabase-schema.sql)
- **Migration Guide**: [docs/MIGRATION-GUIDE.md](docs/MIGRATION-GUIDE.md)

## Project Structure

```
docs_talk/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Fastify backend with RAG
├── docs/             # Documentation
│   ├── api/          # RAG system guides
│   └── database/     # SQL schemas
└── packages/         # Shared code (future)
```

## Troubleshooting

### "Failed to connect to Supabase"

- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env`
- Verify database schema is created

### "Gemini API error"

- Check `GEMINI_API_KEY` in `apps/api/.env`
- Verify API key is active at [Google AI Studio](https://aistudio.google.com/app/apikey)

### "Empty search results"

- Make sure you've run `pnpm scrape` and `pnpm index` for the source
- Check Supabase table `doc_chunks` has data

### "Port already in use"

- Change port in `apps/api/.env` (`PORT=3002`)
- Or kill existing process: `lsof -ti:3001 | xargs kill`

## Next Steps

1. ✅ Backend RAG system is ready
2. 🔨 Build frontend chat interface
3. 🔐 Add Clerk authentication
4. 📊 Implement usage tracking
5. 💳 Integrate Paddle billing
6. 🚀 Deploy to Vercel + Cloud Run

See [docs/api/RAG-GUIDE.md](docs/api/RAG-GUIDE.md) for detailed RAG architecture.
