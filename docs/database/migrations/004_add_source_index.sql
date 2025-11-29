-- Add index on source column to speed up deletions and lookups
CREATE INDEX IF NOT EXISTS idx_doc_chunks_source ON doc_chunks(source);
