// Use relative path for proxy to work
const API_URL = "";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  code?: string;
  references?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  isStreaming?: boolean;
  reasoning?: string; // For AI reasoning display
}

// Auto-detect types
export interface RoutingMetadata {
  queryType: "meta" | "specific" | "ambiguous";
  detectedSource?: string;
  confidence: number;
  wasAutoDetected: boolean;
  reasoning?: string;
}

export interface ClarificationResponse {
  message: string;
  options: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}

export interface SessionContext {
  conversationId: string;
  contextHistory: Array<{
    id: string;
    fromSource: string | null;
    toSource: string;
    query: string;
    timestamp: string;
  }>;
  currentSource: string | null;
  previousSource: string | null;
  switchCount: number;
}

export type AutoDetectEvent =
  | { event: "routing"; data: RoutingMetadata }
  | { event: "content"; data: { chunk: string } }
  | { event: "clarification"; data: ClarificationResponse }
  | { event: "done"; data: {} };

/**
 * Stream chat with auto-detect using SSE events
 */
export async function* streamChatAuto(
  query: string,
  userId: string,
  userEmail: string,
  conversationId?: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  responseMode?: string,
  forceDocSource?: string
): AsyncGenerator<AutoDetectEvent> {
  try {
    const response = await fetch(`${API_URL}/api/backend/chat/auto/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        userId,
        userEmail,
        conversationId,
        conversationHistory,
        responseMode,
        forceDocSource,
      }),
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("LIMIT_REACHED");
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const chunk of lines) {
        if (!chunk.trim()) continue;

        const eventMatch = chunk.match(/^event:\s*(.+)$/m);
        const dataMatch = chunk.match(/^data:\s*(.+)$/m);

        if (eventMatch && dataMatch) {
          const eventType = eventMatch[1].trim();
          const data = JSON.parse(dataMatch[1].trim());

          yield {
            event: eventType as any,
            data,
          };
        }
      }
    }
  } catch (error) {
    console.error("Stream auto-detect error:", error);
    throw error;
  }
}

/**
 * Get session context for a conversation
 */
export async function getSessionContext(
  conversationId: string
): Promise<SessionContext | null> {
  try {
    const response = await fetch(
      `${API_URL}/api/backend/conversations/${conversationId}/session`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Get session context error:", error);
    return null;
  }
}

/**
 * Stream chat responses using Server-Sent Events (SSE)
 */
export async function* streamChat(
  query: string,
  docSource: string,
  userId?: string,
  userEmail?: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  responseMode?: string
): AsyncGenerator<string> {
  try {
    // Use /api/backend prefix which is rewritten in next.config.ts
    const response = await fetch(`${API_URL}/api/backend/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        docSource,
        userId,
        userEmail,
        conversationHistory,
        responseMode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", response.status, errorText);

      // Handle 403 specifically
      if (response.status === 403) {
        throw new Error("LIMIT_REACHED");
      }

      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();

          if (data === "[DONE]") {
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.chunk) {
              yield parsed.chunk;
            }
          } catch (e) {
            console.error("Failed to parse SSE data:", data);
          }
        }
      }
    }
  } catch (error) {
    console.error("Stream chat error:", error);
    throw error;
  }
}

/**
 * Get non-streaming chat response (fallback)
 */
export async function getChatResponse(
  query: string,
  docSource: string,
  userId?: string,
  userEmail?: string
) {
  const response = await fetch(`${API_URL}/api/backend/chat/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, docSource, userId, userEmail }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("LIMIT_REACHED");
    }
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get available documentation sources
 */
export async function getDocSources() {
  const response = await fetch(`${API_URL}/api/backend/docs/sources`);

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user usage stats
 */
export async function getUsageStats(userId: string, userEmail: string) {
  const response = await fetch(
    `${API_URL}/api/backend/user/usage?userId=${userId}&userEmail=${userEmail}`
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

// ===== CONVERSATION HISTORY =====

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  docSource: string,
  title?: string,
  userEmail?: string
) {
  const response = await fetch(`${API_URL}/api/backend/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, docSource, title, userEmail }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user's conversations
 */
export async function getUserConversations(userId: string, limit: number = 20) {
  const response = await fetch(
    `${API_URL}/api/backend/conversations?userId=${userId}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get conversation messages
 */
export async function getConversationMessages(conversationId: string) {
  const response = await fetch(
    `${API_URL}/api/backend/conversations/${conversationId}/messages`
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update conversation (title, pin)
 */
export async function updateConversation(
  conversationId: string,
  updates: { title?: string; is_pinned?: boolean }
) {
  const response = await fetch(
    `${API_URL}/api/backend/conversations/${conversationId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Save message to conversation
 */
export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  references?: Array<{ title: string; url: string; snippet: string }>,
  tokensUsed?: number
) {
  const response = await fetch(
    `${API_URL}/api/backend/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, references, tokensUsed }),
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
