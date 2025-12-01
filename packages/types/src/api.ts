import { ResponseMode } from "./enums";

/**
 * API Request/Response Types
 */

export interface ChatStreamRequest {
  query: string;
  source: string;
  userId: string;
  userEmail: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  responseMode?: ResponseMode;
}

export interface UsageStatsResponse {
  count: number;
  limit: number;
}

export interface ConversationResponse {
  conversationId: string;
}

export interface ConversationsListResponse {
  conversations: Conversation[];
}

export interface ConversationMessagesResponse {
  messages: Message[];
}

export interface Conversation {
  id: string;
  title: string;
  doc_source: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}
