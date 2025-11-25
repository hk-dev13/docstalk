/**
 * Document and Embedding Types
 */

export interface DocumentChunk {
  content: string;
  url: string;
  title: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingPayload {
  text: string;
  model: string;
}

export interface SearchResult {
  content: string;
  url: string;
  title: string;
  source: string;
  similarity: number;
}

export interface SourceReference {
  title: string;
  url: string;
  source: string;
}
