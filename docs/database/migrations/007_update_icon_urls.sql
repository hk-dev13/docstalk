-- ============================================================================
-- MIGRATION: Update Icon URLs to SVG Paths
-- ============================================================================
-- Date: 2025-12-06
-- Purpose: Replace Lucide icon names/emoji with SVG file paths
-- Tables affected: doc_ecosystems, doc_sources
-- ============================================================================

-- ============================================================================
-- STEP 1: Update doc_ecosystems icon column
-- ============================================================================

-- Frontend Web
UPDATE doc_ecosystems 
SET icon = '/assets/support_docs/frontend.svg'
WHERE id = 'frontend_web';

-- JS Backend
UPDATE doc_ecosystems 
SET icon = '/assets/support_docs/backend.svg'
WHERE id = 'js_backend';

-- Python
UPDATE doc_ecosystems 
SET icon = '/assets/support_docs/icons8-python.svg'
WHERE id = 'python';

-- Systems Programming
UPDATE doc_ecosystems 
SET icon = '/assets/support_docs/systems.svg'
WHERE id = 'systems';

-- Cloud & Infrastructure
UPDATE doc_ecosystems 
SET icon = '/assets/support_docs/cloud_infra.svg'
WHERE id = 'cloud_infra';

-- AI & ML
UPDATE doc_ecosystems 
SET icon = '/assets/support_docs/ai_ml.svg'
WHERE id = 'ai_ml';

-- Database & ORM
UPDATE doc_ecosystems 
SET icon = '/assets/support_docs/database.svg'
WHERE id = 'database';

-- Styling & UI
UPDATE doc_ecosystems 
SET icon = '/assets/support_docs/styling.svg'
WHERE id = 'styling';

-- ============================================================================
-- STEP 2: Update doc_sources icon_url column
-- ============================================================================

-- Frontend sources
UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-react.svg'
WHERE id = 'react';

UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-nextjs.svg'
WHERE id = 'nextjs';

UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-typescript.svg'
WHERE id = 'typescript';

UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-vue-js.svg'
WHERE id = 'vue';

-- JS Backend sources
UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-nodejs.svg'
WHERE id = 'nodejs';

UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-express-js.svg'
WHERE id = 'express';

-- Python sources
UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-python.svg'
WHERE id = 'python';

UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-fastapi.svg'
WHERE id = 'fastapi';

-- Systems sources
UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-rust-programming-language.svg'
WHERE id = 'rust';

UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-go.svg'
WHERE id = 'go';

-- Database sources
UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-prisma-orm.svg'
WHERE id = 'prisma';

UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-postgresql.svg'
WHERE id = 'postgresql';

-- Styling sources
UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-tailwind-css.svg'
WHERE id = 'tailwind';

-- Cloud sources
UPDATE doc_sources 
SET icon_url = '/assets/support_docs/icons8-docker.svg'
WHERE id = 'docker';

-- Special sources
UPDATE doc_sources 
SET icon_url = '/assets/logo/logo_docstalk.svg'
WHERE id = 'meta';

UPDATE doc_sources 
SET icon_url = '/assets/support_docs/general.svg'
WHERE id = 'general';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Icon URL migration completed!';
    RAISE NOTICE 'Updated ecosystems: %', (SELECT COUNT(*) FROM doc_ecosystems WHERE icon LIKE '/assets/%');
    RAISE NOTICE 'Updated sources: %', (SELECT COUNT(*) FROM doc_sources WHERE icon_url LIKE '/assets/%');
END $$;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To rollback, run these updates with original Lucide icon names:
--
-- UPDATE doc_ecosystems SET icon = 'Layout' WHERE id = 'frontend_web';
-- UPDATE doc_ecosystems SET icon = 'Server' WHERE id = 'js_backend';
-- UPDATE doc_ecosystems SET icon = 'Code' WHERE id = 'python';
-- UPDATE doc_ecosystems SET icon = 'Cpu' WHERE id = 'systems';
-- UPDATE doc_ecosystems SET icon = 'Cloud' WHERE id = 'cloud_infra';
-- UPDATE doc_ecosystems SET icon = 'Sparkles' WHERE id = 'ai_ml';
-- UPDATE doc_ecosystems SET icon = 'Database' WHERE id = 'database';
-- UPDATE doc_ecosystems SET icon = 'Palette' WHERE id = 'styling';
-- ============================================================================
