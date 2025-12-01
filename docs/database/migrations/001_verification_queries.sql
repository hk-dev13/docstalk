-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify everything works correctly
-- Expected execution time: < 100ms for all queries
-- ============================================================================

-- 1. Check ecosystem table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'doc_ecosystems'
ORDER BY ordinal_position;

-- Expected: 16 columns including new enhanced fields

-- ============================================================================
-- 2. Verify all 8 ecosystems inserted
SELECT 
    id,
    name,
    priority,
    array_length(keywords, 1) as keyword_count,
    array_length(aliases, 1) as alias_count,
    jsonb_object_keys(keyword_groups) as group_keys,
    detection_confidence_threshold,
    is_active
FROM doc_ecosystems
ORDER BY priority DESC;

-- Expected: 8 rows with populated data

-- ============================================================================
-- 3. Test GIN index performance (keywords)
EXPLAIN ANALYZE
SELECT * FROM doc_ecosystems
WHERE 'react' = ANY(keywords);

-- Expected: "Index Scan using idx_ecosystems_keywords_gin"
-- Execution time: < 5ms

-- ============================================================================
-- 4. Test GIN index performance (aliases)
EXPLAIN ANALYZE
SELECT * FROM doc_ecosystems
WHERE 'react hooks' = ANY(aliases);

-- Expected: "Index Scan using idx_ecosystems_aliases_gin"
-- Execution time: < 5ms

-- ============================================================================
-- 5. Test JSONB GIN index (keyword_groups)
EXPLAIN ANALYZE
SELECT * FROM doc_ecosystems
WHERE keyword_groups @> '{"hooks": ["useEffect"]}'::jsonb;

-- Expected: "Index Scan using idx_ecosystems_keyword_groups_gin"
-- Execution time: < 10ms

-- ============================================================================
-- 6. Check doc_sources ecosystem mapping
SELECT 
    ecosystem_id,
    COUNT(*) as doc_count,
    array_agg(id) as doc_ids
FROM doc_sources
WHERE ecosystem_id IS NOT NULL
GROUP BY ecosystem_id
ORDER BY doc_count DESC;

-- Expected: frontend_web=2+, js_backend=2, python=1, etc.

-- ============================================================================
-- 7. Verify indexes created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('doc_ecosystems', 'ecosystem_routing_logs', 'doc_sources')
    AND indexname LIKE '%ecosystem%'
ORDER BY tablename, indexname;

-- Expected: 8+ indexes

-- ============================================================================
-- 8. Test ecosystem lookup by natural language (simulated)
-- This simulates what EcosystemService will do
WITH query_tokens AS (
    SELECT unnest(ARRAY['react', 'hooks', 'useEffect']) as token
)
SELECT 
    e.id,
    e.name,
    e.priority,
    COUNT(DISTINCT qt.token) as matched_keywords,
    CASE 
        WHEN e.aliases && ARRAY['react hooks'] THEN 'ALIAS_MATCH'
        ELSE 'KEYWORD_MATCH'
    END as match_type
FROM doc_ecosystems e, query_tokens qt
WHERE qt.token = ANY(e.keywords)
   OR qt.token = ANY(e.aliases)
GROUP BY e.id, e.name, e.priority, e.aliases
ORDER BY matched_keywords DESC, e.priority DESC
LIMIT 3;

-- Expected: frontend_web as top result

-- ============================================================================
-- 9. Verify triggers work (timestamp update)
SELECT id, name, updated_at FROM doc_ecosystems LIMIT 1;
-- Note the timestamp, then:
UPDATE doc_ecosystems SET description = description || ' ' WHERE id = 'frontend_web';
SELECT id, name, updated_at FROM doc_ecosystems WHERE id = 'frontend_web';
-- Expected: updated_at changed

-- Rollback test update:
UPDATE doc_ecosystems 
SET description = 'React, Next.js, Vue, Svelte, Remix - Modern frontend frameworks and libraries for building user interfaces'
WHERE id = 'frontend_web';

-- ============================================================================
-- 10. Test routing logs table (insert & query)
INSERT INTO ecosystem_routing_logs (
    ecosystem_id,
    query,
    confidence,
    doc_sources_used,
    detection_stage,
    latency_ms
) VALUES (
    'frontend_web',
    'How do React hooks work?',
    95.5,
    ARRAY['react'],
    'alias',
    12
);

SELECT 
    id,
    ecosystem_id,
    query,
    confidence,
    detection_stage,
    latency_ms,
    created_at
FROM ecosystem_routing_logs
ORDER BY created_at DESC
LIMIT 5;

-- Expected: 1 row inserted successfully

-- ============================================================================
-- 11. Performance benchmark: Find ecosystem by multiple aliases
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM doc_ecosystems
WHERE aliases && ARRAY[
    'react hooks',
    'server components',
    'next router'
];

-- Expected: Index Scan, < 10ms

-- ============================================================================
-- 12. Check for missing indexes (should be empty)
SELECT 
    tablename,
    attname as column_name,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename IN ('doc_ecosystems', 'doc_sources')
    AND schemaname = 'public'
    AND n_distinct > 100  -- Columns that might need indexes
ORDER BY tablename, attname;

-- Expected: Only high-cardinality columns shown

-- ============================================================================
-- SUMMARY STATS
-- ============================================================================
SELECT 
    'doc_ecosystems' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('doc_ecosystems')) as total_size,
    pg_size_pretty(pg_indexes_size('doc_ecosystems')) as indexes_size
FROM doc_ecosystems
UNION ALL
SELECT 
    'ecosystem_routing_logs',
    COUNT(*),
    pg_size_pretty(pg_total_relation_size('ecosystem_routing_logs')),
    pg_size_pretty(pg_indexes_size('ecosystem_routing_logs'))
FROM ecosystem_routing_logs;

-- Expected: 
-- doc_ecosystems: 8 rows, ~50KB total, ~30KB indexes
-- ecosystem_routing_logs: 1 row, ~16KB total, ~8KB indexes

-- ============================================================================
-- ✅ All tests passed? You're ready to proceed!
-- ============================================================================
-- Next steps:
-- 1. Generate embeddings for doc_ecosystems.description_embedding
-- 2. Build vector index: CREATE INDEX ... USING ivfflat
-- 3. Implement EcosystemService with detection algorithm
-- 4. Test end-to-end with sample queries
-- ============================================================================
