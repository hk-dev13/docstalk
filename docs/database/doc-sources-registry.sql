-- DocsTalk AI Router System - Database Migration
-- Adds router functionality to existing schema

-- =============================================
-- 1. ENHANCE EXISTING DOC_SOURCES TABLE
-- =============================================
-- Add columns needed for AI router

-- Add keywords array for context detection
ALTER TABLE public.doc_sources 
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- Add official URL (different from base_url used for scraping)
ALTER TABLE public.doc_sources 
ADD COLUMN IF NOT EXISTS official_url TEXT;

-- Add icon URL alias (may already exist as logo_url)
-- Skip if column already exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='doc_sources' AND column_name='icon_url') THEN
        ALTER TABLE public.doc_sources ADD COLUMN icon_url TEXT;
    END IF;
END $$;

-- Update existing records with keywords for AI detection
UPDATE public.doc_sources SET keywords = ARRAY[
  'nextjs', 'next.js', 'next', 'app router', 'server components', 
  'ssr', 'ssg', 'server actions', 'route handlers', 'middleware'
] WHERE id = 'nextjs';

UPDATE public.doc_sources SET keywords = ARRAY[
  'react', 'reactjs', 'hooks', 'usestate', 'useeffect', 
  'usecontext', 'usememo', 'usecallback', 'components', 
  'jsx', 'props', 'state', 'lifecycle'
] WHERE id = 'react';

UPDATE public.doc_sources SET keywords = ARRAY[
  'typescript', 'ts', 'types', 'type', 'interfaces', 
  'interface', 'generics', 'tsconfig', 'enum', 'namespace',
  'utility types', 'mapped types'
] WHERE id = 'typescript';

-- Update official URLs
UPDATE public.doc_sources SET official_url = 'https://nextjs.org' WHERE id = 'nextjs';
UPDATE public.doc_sources SET official_url = 'https://react.dev' WHERE id = 'react';
UPDATE public.doc_sources SET official_url = 'https://www.typescriptlang.org' WHERE id = 'typescript';

-- =============================================
-- 2. SESSION MEMORY - CONTEXT SWITCHES
-- =============================================
-- Track user context switches dalam conversation

CREATE TABLE IF NOT EXISTS public.context_switches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  from_source TEXT REFERENCES public.doc_sources(id),
  to_source TEXT NOT NULL REFERENCES public.doc_sources(id),
  query TEXT NOT NULL,
  is_explicit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_context_switches_conversation 
  ON public.context_switches(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_switches_sources 
  ON public.context_switches(to_source, created_at DESC);

-- Index for active doc sources
CREATE INDEX IF NOT EXISTS idx_doc_sources_active 
  ON public.doc_sources(is_active) WHERE is_active = true;

-- =============================================
-- 3. HELPER FUNCTIONS
-- =============================================

-- Get available doc sources (active only)
CREATE OR REPLACE FUNCTION public.get_available_doc_sources()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  keywords TEXT[],
  icon_url TEXT,
  official_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id, 
    ds.name, 
    ds.description, 
    ds.keywords, 
    COALESCE(ds.icon_url, ds.logo_url) as icon_url,
    ds.official_url
  FROM public.doc_sources ds
  WHERE ds.is_active = true
  ORDER BY ds.name;
END;
$$;

-- Get session context for a conversation
CREATE OR REPLACE FUNCTION public.get_session_context(p_conversation_id UUID)
RETURNS TABLE (
  current_source TEXT,
  previous_source TEXT,
  switch_count INT,
  context_history JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_source TEXT;
  v_previous_source TEXT;
  v_switch_count INT;
  v_history JSONB;
BEGIN
  -- Get most recent context switch
  SELECT cs.to_source INTO v_current_source
  FROM public.context_switches cs
  WHERE cs.conversation_id = p_conversation_id
  ORDER BY cs.created_at DESC
  LIMIT 1;
  
  -- Get second most recent for previous source
  SELECT cs.to_source INTO v_previous_source
  FROM public.context_switches cs
  WHERE cs.conversation_id = p_conversation_id
  ORDER BY cs.created_at DESC
  OFFSET 1 LIMIT 1;
  
  -- Count switches
  SELECT COUNT(*)::INT INTO v_switch_count
  FROM public.context_switches cs
  WHERE cs.conversation_id = p_conversation_id;
  
  -- Get full history as JSON
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', cs.id,
      'fromSource', cs.from_source,
      'toSource', cs.to_source,
      'query', cs.query,
      'isExplicit', cs.is_explicit,
      'timestamp', cs.created_at
    ) ORDER BY cs.created_at ASC
  ), '[]'::jsonb) INTO v_history
  FROM public.context_switches cs
  WHERE cs.conversation_id = p_conversation_id;
  
  RETURN QUERY SELECT v_current_source, v_previous_source, v_switch_count, v_history;
END;
$$;

-- Track context switch
CREATE OR REPLACE FUNCTION public.track_context_switch(
  p_conversation_id UUID,
  p_from_source TEXT,
  p_to_source TEXT,
  p_query TEXT,
  p_is_explicit BOOLEAN DEFAULT false
)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_switch_id UUID;
BEGIN
  INSERT INTO public.context_switches (conversation_id, from_source, to_source, query, is_explicit)
  VALUES (p_conversation_id, p_from_source, p_to_source, p_query, p_is_explicit)
  RETURNING id INTO v_switch_id;
  
  RETURN v_switch_id;
END;
$$;

-- =============================================
-- 4. COMMENTS & DOCUMENTATION
-- =============================================

COMMENT ON TABLE public.context_switches IS 'Session memory tracking for user context switches across doc sources in a conversation.';
COMMENT ON COLUMN public.doc_sources.keywords IS 'Keywords array used by AI router for context detection.';
COMMENT ON COLUMN public.doc_sources.official_url IS 'Official documentation URL (may differ from base_url used for scraping).';

COMMENT ON FUNCTION public.get_available_doc_sources() IS 'Returns list of active doc sources for router detection.';
COMMENT ON FUNCTION public.get_session_context(UUID) IS 'Returns session context including current/previous source and full switch history.';
COMMENT ON FUNCTION public.track_context_switch(UUID, TEXT, TEXT, TEXT, BOOLEAN) IS 'Records a context switch event in the conversation.';

-- =============================================
-- 5. VERIFICATION
-- =============================================

-- Show updated doc_sources
SELECT id, name, array_length(keywords, 1) as keyword_count, official_url 
FROM public.doc_sources 
ORDER BY name;

-- Verify context_switches table created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'context_switches';
