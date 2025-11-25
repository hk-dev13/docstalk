# Migration Guide - Parent Document Support

## 📋 Overview

This guide walks through applying the parent document migration to your existing DocsTalk database.

**What's changing:**

- ✅ New columns: `parent_id`, `chunk_index`, `full_content`
- ✅ New RPC functions: `search_docs_with_context()`, `get_surrounding_chunks()`
- ✅ Updated code to use new schema

---

## 🔧 Step-by-Step Migration

### 1. **Backup Your Data (Recommended)**

```sql
-- In Supabase SQL Editor
-- Create a backup table
CREATE TABLE doc_chunks_backup AS SELECT * FROM doc_chunks;
```

### 2. **Apply Migration SQL**

In Supabase SQL Editor, run the entire contents of:
`supabase-migration-parent-doc.sql`

**What it does:**

```sql
-- Add new columns
ALTER TABLE doc_chunks ADD COLUMN parent_id UUID;
ALTER TABLE doc_chunks ADD COLUMN chunk_index INTEGER DEFAULT 0;
ALTER TABLE doc_chunks ADD COLUMN full_content TEXT;

-- Create indexes
CREATE INDEX idx_doc_chunks_parent ON doc_chunks(parent_id);
CREATE INDEX idx_doc_chunks_url_index ON doc_chunks(url, chunk_index);

-- Create new RPC functions
CREATE OR REPLACE FUNCTION search_docs_with_context(...);
CREATE OR REPLACE FUNCTION get_surrounding_chunks(...);
```

### 3. **Verify Migration**

```sql
-- Check columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'doc_chunks'
AND column_name IN ('parent_id', 'chunk_index', 'full_content');

-- Should return 3 rows

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('search_docs_with_context', 'get_surrounding_chunks');

-- Should return 2 rows
```

### 4. **Code Already Updated**

✅ TypeScript interfaces updated with new fields  
✅ Indexing script populates `chunk_index` and `full_content`  
✅ RAG service uses `search_docs_with_context()` with fallback  
✅ `getExpandedContext()` queries `chunk_index` column

**No code changes needed!** Everything is backward compatible.

### 5. **Re-scrape & Re-index**

Now that code is updated, re-scrape to get improved chunks:

```bash
cd apps/api

# Re-scrape with new chunking (20% overlap)
pnpm scrape nextjs
pnpm scrape react
pnpm scrape typescript

# Re-index with new fields
pnpm index nextjs
pnpm index react
pnpm index typescript
```

**What happens:**

- Scraper creates chunks with 20% overlap
- Chunks have `metadata.chunkIndex` and `metadata.fullContent`
- Indexer populates `chunk_index` and `full_content` columns
- RAG service can now retrieve surrounding chunks

### 6. **Test Improved Answers**

```bash
# Test the problematic query
curl -X POST http://localhost:3001/api/v1/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I create a Next.js app?",
    "docSource": "nextjs"
  }'
```

**Expected improvement:**

````json
{
  "answer": "## Explanation\nTo create a Next.js app, run:\n\n## Code Example\n```bash\nnpx create-next-app@latest\n```\n...",
  "code": "npx create-next-app@latest",
  ...
}
````

**Before**: ❌ "The specific command is not provided..."  
**After**: ✅ "Run `npx create-next-app@latest`"

---

## 🔍 What Changed in Code

### TypeScript Interface

**File**: `apps/api/src/services/rag.service.ts`

```typescript
interface SearchResult {
  id: string;
  content: string;
  url: string;
  title: string;
  source: string;
  similarity: number;
  chunk_index?: number; // NEW
  full_content?: string; // NEW
  parent_id?: string; // NEW
  metadata?: Record<string, any>; // NEW
}
```

### Indexing Script

**File**: `apps/api/scripts/index-docs.ts`

```typescript
// Extract metadata fields
const chunkIndex = chunk.metadata?.chunkIndex || 0;
const fullContent = chunk.metadata?.fullContent || null;

// Insert with new fields
const { error } = await supabase.from("doc_chunks").insert({
  // ... existing fields
  chunk_index: chunkIndex, // NEW
  full_content: fullContent, // NEW
});
```

### RAG Service - Search

**File**: `apps/api/src/services/rag.service.ts`

```typescript
// Use new RPC function with fallback
const { data, error } = await this.supabase.rpc('search_docs_with_context', {
  query_embedding: queryEmbedding,
  match_threshold: 0.7,
  match_count: limit,
  filter_source: source || null,
  include_context: true,  // NEW
});

if (error) {
  // Fallback to old function if migration not applied
  const { data: fallbackData } = await this.supabase.rpc('search_docs', ...);
  return fallbackData || [];
}
```

### RAG Service - Expanded Context

```typescript
// Query using chunk_index column (not JSONB metadata)
const { data: surroundingChunks } = await this.supabase
  .from("doc_chunks")
  .select(
    "id, content, url, title, source, chunk_index, full_content, metadata"
  )
  .eq("url", chunk.url)
  .gte("chunk_index", Math.max(0, chunkIndex - 1)) // NEW
  .lte("chunk_index", chunkIndex + 1) // NEW
  .order("chunk_index", { ascending: true }); // NEW
```

---

## 🧪 Testing Checklist

- [ ] Migration SQL executed successfully
- [ ] New columns visible in Supabase table editor
- [ ] New RPC functions callable
- [ ] Re-scraped all 3 documentation sources
- [ ] Re-indexed all chunks to Supabase
- [ ] `chunk_index` populated correctly (check with SQL)
- [ ] `full_content` stored for first chunk of each page
- [ ] Test query returns complete answer with command
- [ ] No errors in server logs
- [ ] Backward compatibility: old chunks still searchable

---

## 📊 Validation Queries

### Check chunk_index distribution

```sql
SELECT
  source,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT url) as unique_pages,
  AVG(chunk_index) as avg_chunk_index,
  MAX(chunk_index) as max_chunks_per_page
FROM doc_chunks
GROUP BY source;
```

### Check full_content storage

```sql
SELECT
  source,
  COUNT(*) as total_with_full_content
FROM doc_chunks
WHERE full_content IS NOT NULL
GROUP BY source;

-- Should roughly equal number of unique pages
```

### Test surrounding chunks retrieval

```sql
-- Find a chunk
SELECT id, url, chunk_index, content
FROM doc_chunks
WHERE source = 'nextjs'
LIMIT 1;

-- Get surrounding chunks
SELECT * FROM get_surrounding_chunks(
  '<chunk_id_from_above>'::uuid,
  1  -- context window
);
```

---

## 🚨 Troubleshooting

### "Function search_docs_with_context does not exist"

**Cause**: Migration SQL not applied  
**Fix**: Run `supabase-migration-parent-doc.sql`

### "Column chunk_index not found"

**Cause**: Migration SQL not applied  
**Fix**: Check if ALTER TABLE commands ran successfully

### "Still getting incomplete answers"

**Cause**: Old chunks without overlap still in database  
**Fix**: Clear old data and re-index:

```sql
-- Delete old chunks
DELETE FROM doc_chunks WHERE source = 'nextjs';

-- Re-index
pnpm scrape nextjs
pnpm index nextjs
```

### "Error: metadata->chunkIndex not found"

**Cause**: Code not updated, still using old JSONB query  
**Fix**: Pull latest code changes (already done!)

---

## ✅ Success Criteria

Migration is successful when:

1. ✅ All 3 SQL statements run without errors
2. ✅ `doc_chunks` table has 3 new columns
3. ✅ 2 new RPC functions exist
4. ✅ Re-scrape produces chunks with overlap
5. ✅ Re-index populates new fields
6. ✅ Test query "How do I create Next.js app?" returns command
7. ✅ No errors in API logs
8. ✅ Answer quality improved vs before

---

**Estimated Time**: 10-15 minutes

**Rollback**: Restore from backup table if needed:

```sql
INSERT INTO doc_chunks SELECT * FROM doc_chunks_backup;
```
