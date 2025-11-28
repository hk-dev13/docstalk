/**
 * Router Types - AI Router System
 * @docstalk/types/router
 */

/**
 * Query type classification
 */
export type QueryType = "meta" | "specific" | "ambiguous" | "general";

/**
 * Doc source metadata from database
 */
export interface DocSourceMetadata {
  id: string; // e.g., 'nextjs', 'react', 'typescript'
  name: string; // e.g., 'Next.js', 'React', 'TypeScript'
  description: string;
  keywords: string[]; // untuk context detection
  isActive: boolean;
  iconUrl?: string;
  officialUrl?: string;
}

/**
 * Routing decision from context detection
 */
export interface RoutingDecision {
  queryType: QueryType;
  primarySource?: string; // doc source ID (untuk specific queries)
  additionalSources?: string[]; // untuk multi-context
  confidence: number; // 0-100
  reasoning?: string;
  needsClarification: boolean;
  suggestedSources?: string[]; // untuk ambiguous queries
}

/**
 * Clarification response when routing is ambiguous
 */
export interface ClarificationResponse {
  message: string;
  options: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}

/**
 * Router configuration
 */
export interface RouterConfig {
  confidenceThreshold: number; // default: 70
  enableMultiSource: boolean;
  cacheContextDecisions: boolean;
}

/**
 * Session context - track context switches in conversation
 */
export interface SessionContext {
  conversationId: string;
  contextHistory: ContextSwitch[];
  currentSource: string | null;
  previousSource: string | null;
  switchCount: number;
}

/**
 * Single context switch event
 */
export interface ContextSwitch {
  id: string;
  conversationId: string;
  fromSource: string | null; // null for first query
  toSource: string;
  query: string;
  timestamp: Date;
  isExplicit: boolean; // user explicitly changed, or auto-detected
}

/**
 * Enhanced routing response with session context
 */
export interface RoutingResponse {
  routing: RoutingDecision;
  sessionContext?: SessionContext;
  clarification?: ClarificationResponse;
}
