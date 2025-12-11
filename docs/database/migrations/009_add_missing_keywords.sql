-- ============================================================================
-- MIGRATION 009: Add Missing Technology Keywords to Ecosystems
-- ============================================================================
-- Adds Redis, MongoDB keywords and other commonly queried technologies
-- to the main keywords array so router can properly detect them

-- Add Redis and other NoSQL to database ecosystem keywords
UPDATE doc_ecosystems 
SET keywords = array_append(keywords, 'redis')
WHERE id = 'database' AND NOT ('redis' = ANY(keywords));

UPDATE doc_ecosystems 
SET keywords = array_append(keywords, 'cache')
WHERE id = 'database' AND NOT ('cache' = ANY(keywords));

UPDATE doc_ecosystems 
SET keywords = array_append(keywords, 'nosql')
WHERE id = 'database' AND NOT ('nosql' = ANY(keywords));

-- Add cloud-related keywords to cloud_infra ecosystem
UPDATE doc_ecosystems 
SET keywords = array_append(keywords, 'aws')
WHERE id = 'cloud_infra' AND NOT ('aws' = ANY(keywords));

UPDATE doc_ecosystems 
SET keywords = array_append(keywords, 'gcp')
WHERE id = 'cloud_infra' AND NOT ('gcp' = ANY(keywords));

UPDATE doc_ecosystems 
SET keywords = array_append(keywords, 'azure')
WHERE id = 'cloud_infra' AND NOT ('azure' = ANY(keywords));

UPDATE doc_ecosystems 
SET keywords = array_append(keywords, 'bigquery')
WHERE id = 'cloud_infra' AND NOT ('bigquery' = ANY(keywords));

UPDATE doc_ecosystems 
SET keywords = array_append(keywords, 'firebase')
WHERE id = 'cloud_infra' AND NOT ('firebase' = ANY(keywords));

-- Verify changes
DO $$
DECLARE
    db_keywords TEXT[];
    cloud_keywords TEXT[];
BEGIN
    SELECT keywords INTO db_keywords FROM doc_ecosystems WHERE id = 'database';
    SELECT keywords INTO cloud_keywords FROM doc_ecosystems WHERE id = 'cloud_infra';
    
    RAISE NOTICE '✅ Migration 009 completed!';
    RAISE NOTICE 'Database keywords: %', db_keywords;
    RAISE NOTICE 'Cloud Infra keywords: %', cloud_keywords;
END $$;
