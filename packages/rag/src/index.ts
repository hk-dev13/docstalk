/**
 * @docstalk/rag
 * RAG (Retrieval-Augmented Generation) package for DocsTalk
 */

// Core modules
export { generateEmbedding } from './embeddings';
export { getResponseModePersona } from './response-modes';
export type { ResponseModePersona } from './response-modes';
export { reformulateQuery } from './query-reformulation';

// Usage tracking
export {
  checkUsageLimit,
  incrementUsage,
  getUsageStats,
} from './usage-tracking';

// Conversation management
export {
  createConversation,
  saveMessage,
  getUserConversations,
  getConversationMessages,
  updateConversationTitle,
} from './conversation';

// Main RAG service (to be imported from original until fully extracted)
// For now, apps/api will continue using the original RAGService
// but can import individual functions from this package
