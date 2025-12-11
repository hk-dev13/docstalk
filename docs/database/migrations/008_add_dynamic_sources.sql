-- ============================================================================
-- MIGRATION: Dynamic Documentation Sources & Search Cache
-- ============================================================================
-- Date: 2025-12-06
-- Purpose: Support self-learning RAG with online search and auto-indexing
-- Tables: dynamic_doc_pages, search_cache
-- ============================================================================

SET search_path TO public;

-- ============================================================================
-- STEP 1: Dynamic Documentation Pages Table
-- ============================================================================
-- Tracks pages discovered via online search and auto-indexed

CREATE TABLE IF NOT EXISTS dynamic_doc_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL UNIQUE,
    source_id TEXT REFERENCES doc_sources(id) ON DELETE SET NULL,
    title TEXT,
    content_hash TEXT NOT NULL, -- SHA-256 for deduplication
    chunks_count INTEGER DEFAULT 0,
    is_indexed BOOLEAN DEFAULT false,
    indexed_at TIMESTAMPTZ,
    discovered_by TEXT, -- user_id who triggered discovery
    query_that_found TEXT, -- original query that found this page
    access_count INTEGER DEFAULT 1,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    -- TTL Policy (60 days default)
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE dynamic_doc_pages IS 'Tracks documentation pages discovered via online search and auto-indexed';
COMMENT ON COLUMN dynamic_doc_pages.content_hash IS 'SHA-256 hash for content deduplication';
COMMENT ON COLUMN dynamic_doc_pages.expires_at IS 'TTL - page expires if not accessed';

-- ============================================================================
-- STEP 2: Search Cache Table
-- ============================================================================
-- Caches online search results to avoid repeated API calls

CREATE TABLE IF NOT EXISTS search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT NOT NULL UNIQUE, -- SHA-256 of normalized query
    ecosystem_id TEXT REFERENCES doc_ecosystems(id) ON DELETE SET NULL,
    results JSONB NOT NULL, -- cached search results
    result_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE search_cache IS 'Caches online search results to reduce API costs';
COMMENT ON COLUMN search_cache.query_hash IS 'SHA-256 hash of normalized query for lookup';

-- ============================================================================
-- STEP 3: Performance Indexes
-- ============================================================================

-- Dynamic pages indexes
CREATE INDEX IF NOT EXISTS idx_dynamic_pages_url 
    ON dynamic_doc_pages(url);

CREATE INDEX IF NOT EXISTS idx_dynamic_pages_source 
    ON dynamic_doc_pages(source_id) 
    WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dynamic_pages_indexed 
    ON dynamic_doc_pages(is_indexed) 
    WHERE is_indexed = true;

CREATE INDEX IF NOT EXISTS idx_dynamic_pages_expires 
    ON dynamic_doc_pages(expires_at);

CREATE INDEX IF NOT EXISTS idx_dynamic_pages_access 
    ON dynamic_doc_pages(last_accessed_at DESC);

-- Search cache indexes
CREATE INDEX IF NOT EXISTS idx_search_cache_query 
    ON search_cache(query_hash);

CREATE INDEX IF NOT EXISTS idx_search_cache_expiry 
    ON search_cache(expires_at);

-- ============================================================================
-- STEP 4: Update Timestamp Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_dynamic_pages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Extend expiry on access
    IF NEW.access_count > OLD.access_count THEN
        NEW.expires_at = NOW() + INTERVAL '60 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dynamic_pages_updated_at ON dynamic_doc_pages;
CREATE TRIGGER dynamic_pages_updated_at
    BEFORE UPDATE ON dynamic_doc_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_dynamic_pages_timestamp();

-- ============================================================================
-- STEP 5: Cleanup Function (run via cron job daily)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_stale_pages()
RETURNS TABLE(deleted_pages INTEGER, deleted_cache INTEGER) AS $$
DECLARE
    pages_deleted INTEGER;
    cache_deleted INTEGER;
BEGIN
    -- Delete expired pages with no recent access
    DELETE FROM dynamic_doc_pages 
    WHERE expires_at < NOW() AND access_count <= 1;
    GET DIAGNOSTICS pages_deleted = ROW_COUNT;
    
    -- Delete expired cache entries
    DELETE FROM search_cache 
    WHERE expires_at < NOW();
    GET DIAGNOSTICS cache_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT pages_deleted, cache_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_stale_pages IS 'Cleanup expired dynamic pages and search cache';

-- ============================================================================
-- STEP 6: Increment Access Count Function
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_page_access(page_url TEXT)
RETURNS void AS $$
BEGIN
    UPDATE dynamic_doc_pages 
    SET 
        access_count = access_count + 1,
        last_accessed_at = NOW(),
        expires_at = NOW() + INTERVAL '60 days'
    WHERE url = page_url;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: Verification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 008 completed successfully!';
    RAISE NOTICE 'Created: dynamic_doc_pages table';
    RAISE NOTICE 'Created: search_cache table';
    RAISE NOTICE 'Created: 7 performance indexes';
    RAISE NOTICE 'Created: cleanup_stale_pages function';
    RAISE NOTICE 'Created: increment_page_access function';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ Next Steps:';
    RAISE NOTICE '  1. Set up daily cron job for cleanup_stale_pages()';
    RAISE NOTICE '  2. Configure GOOGLE_CSE_API_KEY and GOOGLE_CSE_ENGINE_ID';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================
-- To rollback this migration, run:
--
-- DROP FUNCTION IF EXISTS increment_page_access CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_stale_pages CASCADE;
-- DROP FUNCTION IF EXISTS update_dynamic_pages_timestamp CASCADE;
-- DROP TABLE IF EXISTS search_cache CASCADE;
-- DROP TABLE IF EXISTS dynamic_doc_pages CASCADE;
--
-- ============================================================================
