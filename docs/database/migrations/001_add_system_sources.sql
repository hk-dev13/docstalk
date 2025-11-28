-- Add 'meta' and 'general' as system sources to satisfy Foreign Key constraints

INSERT INTO public.doc_sources (id, name, description, base_url, is_active, tier_required, keywords)
VALUES 
  ('meta', 'DocsTalk Platform', 'System queries about the DocsTalk platform itself', 'https://docstalk.com', true, 'free', ARRAY['docstalk', 'platform', 'help', 'meta']),
  ('general', 'General Knowledge', 'General queries unrelated to documentation', 'https://google.com', true, 'free', ARRAY['general', 'other', 'random'])
ON CONFLICT (id) DO NOTHING;
