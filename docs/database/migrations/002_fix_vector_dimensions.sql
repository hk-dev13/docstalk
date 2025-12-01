-- ============================================================================
-- FIX: Change vector dimensions from 1536 to 768 for Gemini compatibility
-- ============================================================================
-- Gemini text-embedding-004 default output is 768 dimensions
-- This is more efficient and matches what's actually returned by the API
-- ============================================================================

-- Drop the column and recreate with correct dimensions
ALTER TABLE doc_ecosystems 
DROP COLUMN IF EXISTS description_embedding;

ALTER TABLE doc_ecosystems
ADD COLUMN description_embedding vector(768);

-- Verify
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'doc_ecosystems' 
  AND column_name = 'description_embedding';

-- Expected output: vector, USER-DEFINED, vector
-- Now ready for 768-dimensional embeddings!
