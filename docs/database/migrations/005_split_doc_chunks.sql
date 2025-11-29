-- Rename table to reflect its new purpose (metadata only)
ALTER TABLE doc_chunks RENAME TO doc_chunk_meta;

-- Drop heavy columns (moved to Qdrant)
ALTER TABLE doc_chunk_meta
DROP COLUMN IF EXISTS embedding,
DROP COLUMN IF EXISTS content,
DROP COLUMN IF EXISTS full_content,
DROP COLUMN IF EXISTS metadata;

-- Add Qdrant ID for mapping/debugging
ALTER TABLE doc_chunk_meta
ADD COLUMN IF NOT EXISTS qdrant_id uuid;

-- Update index (if not exists)
CREATE INDEX IF NOT EXISTS idx_doc_chunk_meta_qdrant_id ON doc_chunk_meta(qdrant_id);
