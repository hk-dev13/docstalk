// Ecosystem-based routing types for hierarchical doc classification

export interface DocEcosystem {
  id: string;
  name: string;
  description: string;
  color: string; // Hex color for UI
  icon: string; // Lucide icon name

  // Enhanced: Multi-level keyword matching
  keywords: string[]; // Primary keywords
  aliases?: string[]; // Natural language variations (e.g., "react hooks", "node fs")
  keyword_groups?: Record<string, string[]>; // Grouped keywords for semantic clustering

  // Enhanced: Semantic detection via embeddings
  description_embedding?: number[]; // Vector embedding of description (1536 dims for OpenAI)

  // Enhanced: Confidence & quality metrics
  detection_confidence_threshold?: number; // Min confidence to auto-select (default 0.6)
  avg_detection_confidence?: number; // Running average
  total_detections?: number; // Usage counter

  priority: number; // Higher = more important for routing
  is_active?: boolean; // Can be disabled without deleting
  created_at?: Date;
  updated_at?: Date;
}

export interface EcosystemDetectionResult {
  ecosystem: DocEcosystem;
  confidence: number; // 0-100
  reasoning: string;
  suggestedDocSources: string[]; // IDs of docs within this ecosystem
  alternativeEcosystems?: DocEcosystem[]; // If ambiguous
}

export interface EcosystemRoutingLog {
  id: string;
  conversation_id: string;
  ecosystem_id: string;
  query: string;
  confidence: number;
  doc_sources_used: string[];
  created_at: Date;
}

// Predefined ecosystem IDs
export enum EcosystemId {
  FRONTEND_WEB = "frontend_web",
  JS_BACKEND = "js_backend",
  PYTHON = "python",
  SYSTEMS = "systems",
  CLOUD_INFRA = "cloud_infra",
  AI_ML = "ai_ml",
  DATABASE = "database",
  STYLING = "styling",
  GENERAL = "general", // Fallback
  META = "meta", // DocsTalk platform queries
}

// Enhanced router decision with ecosystem context
export interface EcosystemRouterDecision {
  queryType: "meta" | "specific" | "ambiguous" | "general";
  ecosystem?: DocEcosystem;
  primarySource?: string;
  additionalSources?: string[];
  confidence: number;
  reasoning: string;
  needsClarification: boolean;
  suggestedEcosystems?: DocEcosystem[];
}
