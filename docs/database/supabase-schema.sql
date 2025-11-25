-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documentation chunks with embeddings
CREATE TABLE doc_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  source TEXT NOT NULL, -- 'nextjs', 'react', 'typescript'
  embedding vector(768), -- Gemini text-embedding-004 dimension
  metadata JSONB, -- Additional metadata (section, subsection, etc)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON doc_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create index for source filtering
CREATE INDEX idx_doc_chunks_source ON doc_chunks(source);

-- Create index for URL lookup
CREATE INDEX idx_doc_chunks_url ON doc_chunks(url);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_docs(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_source text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  url text,
  title text,
  source text,
  similarity float
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    content,
    url,
    title,
    source,
    1 - (embedding <=> query_embedding) AS similarity
  FROM doc_chunks
  WHERE 
    (filter_source IS NULL OR source = filter_source)
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_doc_chunks_updated_at
  BEFORE UPDATE ON doc_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Documentation sources metadata
CREATE TABLE doc_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_url TEXT NOT NULL,
  logo_url TEXT,
  version TEXT,
  last_scraped TIMESTAMP,
  total_chunks INTEGER DEFAULT 0,
  tier_required TEXT DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial documentation sources
INSERT INTO doc_sources (id, name, description, base_url, tier_required) VALUES
('nextjs', 'Next.js', 'The React Framework for the Web', 'https://nextjs.org/docs', 'free'),
('react', 'React', 'The library for web and native user interfaces', 'https://react.dev', 'free'),
('typescript', 'TypeScript', 'JavaScript with syntax for types', 'https://www.typescriptlang.org/docs', 'free')
ON CONFLICT (id) DO NOTHING;

-- Users table (synced from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking for rate limiting
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query_count INTEGER DEFAULT 1,
  tokens_used INTEGER DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Conversations for chat history
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  doc_source TEXT REFERENCES doc_sources(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages in conversations
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  code_snippet TEXT,
  references JSONB, -- Array of reference URLs
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_logs(user_id, date);
