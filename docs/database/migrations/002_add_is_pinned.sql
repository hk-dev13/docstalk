-- Add is_pinned column to conversations table
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Index for faster sorting
CREATE INDEX IF NOT EXISTS idx_conversations_is_pinned ON public.conversations(is_pinned);
