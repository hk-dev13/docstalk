-- Migration: Add parent document support to existing schema

-- Add parent_id column to doc_chunks for hierarchical retrieval
ALTER TABLE doc_chunks ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE doc_chunks ADD COLUMN IF NOT EXISTS chunk_index INTEGER DEFAULT 0;
ALTER TABLE doc_chunks ADD COLUMN IF NOT EXISTS full_content TEXT;

-- Create index for parent lookup
CREATE INDEX IF NOT EXISTS idx_doc_chunks_parent ON doc_chunks(parent_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_url_index ON doc_chunks(url, chunk_index);

-- Update search function to include parent document retrieval
CREATE OR REPLACE FUNCTION search_docs_with_context(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_source text DEFAULT NULL,
  include_context boolean DEFAULT true
)
RETURNS TABLE (
  id uuid,
  content text,
  full_content text,
  url text,
  title text,
  source text,
  chunk_index integer,
  similarity float
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    content,
    COALESCE(full_content, content) as full_content,
    url,
    title,
    source,
    chunk_index,
    1 - (embedding <=> query_embedding) AS similarity
  FROM doc_chunks
  WHERE 
    (filter_source IS NULL OR source = filter_source)
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to get surrounding chunks for context
CREATE OR REPLACE FUNCTION get_surrounding_chunks(
  chunk_id uuid,
  context_window int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  content text,
  url text,
  chunk_index integer
)
LANGUAGE SQL STABLE
AS $$
  WITH target AS (
    SELECT url, chunk_index FROM doc_chunks WHERE id = chunk_id
  )
  SELECT 
    dc.id,
    dc.content,
    dc.url,
    dc.chunk_index
  FROM doc_chunks dc, target
  WHERE dc.url = target.url
    AND dc.chunk_index BETWEEN (target.chunk_index - context_window) 
                            AND (target.chunk_index + context_window)
  ORDER BY dc.chunk_index;
$$;

COMMENT ON COLUMN doc_chunks.parent_id IS 'Reference to parent document for hierarchical retrieval';
COMMENT ON COLUMN doc_chunks.chunk_index IS 'Sequential index of chunk within the same URL/document';
COMMENT ON COLUMN doc_chunks.full_content IS 'Full page content for parent document retrieval (only stored for first chunk of each page)';
COMMENT ON FUNCTION search_docs_with_context IS 'Enhanced search with optional full document context';
COMMENT ON FUNCTION get_surrounding_chunks IS 'Retrieve chunks before and after target chunk for context expansion';
