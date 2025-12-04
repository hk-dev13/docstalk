-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.context_switches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  from_source text,
  to_source text NOT NULL,
  query text NOT NULL,
  is_explicit boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT context_switches_pkey PRIMARY KEY (id),
  CONSTRAINT context_switches_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT context_switches_from_source_fkey FOREIGN KEY (from_source) REFERENCES public.doc_sources(id),
  CONSTRAINT context_switches_to_source_fkey FOREIGN KEY (to_source) REFERENCES public.doc_sources(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  title text,
  doc_source text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  is_pinned boolean DEFAULT false,
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT conversations_doc_source_fkey FOREIGN KEY (doc_source) REFERENCES public.doc_sources(id)
);
CREATE TABLE public.doc_chunk_meta (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  url text NOT NULL,
  title text,
  source text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  parent_id uuid,
  chunk_index integer DEFAULT 0,
  qdrant_id uuid,
  CONSTRAINT doc_chunk_meta_pkey PRIMARY KEY (id)
);
CREATE TABLE public.doc_ecosystems (
  id text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  color text NOT NULL,
  icon text NOT NULL,
  keywords ARRAY NOT NULL DEFAULT '{}'::text[],
  aliases ARRAY DEFAULT '{}'::text[],
  keyword_groups jsonb DEFAULT '{}'::jsonb,
  detection_confidence_threshold double precision DEFAULT 0.6 CHECK (detection_confidence_threshold >= 0::double precision AND detection_confidence_threshold <= 1::double precision),
  avg_detection_confidence double precision DEFAULT 0.0 CHECK (avg_detection_confidence >= 0::double precision AND avg_detection_confidence <= 1::double precision),
  total_detections integer DEFAULT 0 CHECK (total_detections >= 0),
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description_embedding USER-DEFINED,
  CONSTRAINT doc_ecosystems_pkey PRIMARY KEY (id)
);
CREATE TABLE public.doc_sources (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  base_url text NOT NULL,
  logo_url text,
  version text,
  last_scraped timestamp without time zone,
  total_chunks integer DEFAULT 0,
  tier_required text DEFAULT 'free'::text,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  keywords ARRAY DEFAULT '{}'::text[],
  official_url text,
  icon_url text,
  ecosystem_id text,
  CONSTRAINT doc_sources_pkey PRIMARY KEY (id),
  CONSTRAINT doc_sources_ecosystem_id_fkey FOREIGN KEY (ecosystem_id) REFERENCES public.doc_ecosystems(id)
);
CREATE TABLE public.ecosystem_routing_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid,
  ecosystem_id text,
  query text NOT NULL,
  confidence double precision CHECK (confidence >= 0::double precision AND confidence <= 100::double precision),
  doc_sources_used ARRAY DEFAULT '{}'::text[],
  detection_stage text,
  latency_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ecosystem_routing_logs_pkey PRIMARY KEY (id),
  CONSTRAINT ecosystem_routing_logs_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT ecosystem_routing_logs_ecosystem_id_fkey FOREIGN KEY (ecosystem_id) REFERENCES public.doc_ecosystems(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid,
  role text NOT NULL,
  content text NOT NULL,
  code_snippet text,
  references jsonb,
  tokens_used integer,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.usage_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  query_count integer DEFAULT 1,
  tokens_used integer DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT usage_logs_pkey PRIMARY KEY (id),
  CONSTRAINT usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_usage (
  user_id uuid NOT NULL,
  query_count integer DEFAULT 0,
  last_reset_date timestamp without time zone DEFAULT now(),
  CONSTRAINT user_usage_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_id text NOT NULL UNIQUE,
  email text NOT NULL,
  plan text DEFAULT 'free'::text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.chat_feedback (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id uuid,
  user_id text,
  feedback_type text NOT NULL CHECK (feedback_type IN ('up', 'down')),
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT chat_feedback_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE
);