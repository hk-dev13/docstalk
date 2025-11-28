import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { RAGService } from "./services/rag.service.js";
import { RouterService } from "./services/router.service.js";
import { registerAutoDetectRoutes } from "./services/auto-detect.routes.js";

const fastify = Fastify({
  logger: true,
});

// Initialize RAG service
const ragService = new RAGService();

// Initialize Router service
const routerService = new RouterService(ragService.supabase);

// Register plugins
await fastify.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
});

// Rate limiting - protect against abuse and control costs
await fastify.register(rateLimit as any, {
  max: async (req: any) => {
    // Check if user is authenticated (has userId in body or query)
    const userId = (req.body as any)?.userId || (req.query as any)?.userId;

    // Authenticated users: 60 requests per minute
    // Guest users: 30 requests per minute
    return userId ? 60 : 30;
  },
  timeWindow: "1 minute",
  keyGenerator: (req: any) => {
    // Use userId for authenticated, IP for guests
    const userId = (req.body as any)?.userId || (req.query as any)?.userId;
    if (userId) return `user:${userId}`;

    // Get real IP behind proxy (Vercel/Cloud Run)
    const forwardedFor = req.headers["x-forwarded-for"];
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ip || req.headers["x-real-ip"] || req.ip;
  },
  errorResponseBuilder: (req: any, context: any) => {
    return {
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${Math.ceil(
        context.ttl / 1000
      )} seconds.`,
    };
  },
});

// Register auto-detect routes
await registerAutoDetectRoutes(fastify, ragService, routerService);

// Debug endpoint to check table schema
fastify.get("/api/debug/schema", async (request, reply) => {
  const { data, error } = await ragService.supabase.rpc("get_table_info", {
    table_name: "users",
  });

  // Check vector search
  const { data: chunks, error: chunksError } = await ragService.supabase.rpc(
    "search_docs",
    {
      query_embedding: Array(768).fill(0), // Dummy embedding
      match_threshold: 0.0,
      match_count: 1,
    }
  );

  return { chunks, chunksError };
});

// Health check
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Test RAG search
fastify.post<{
  Body: { query: string; source?: string };
}>("/api/v1/search", async (request, reply) => {
  try {
    const { query, source } = request.body;

    if (!query) {
      return reply.code(400).send({ error: "Query is required" });
    }

    const results = await ragService.searchDocumentation(query, source, 5);

    return {
      query,
      results,
      count: results.length,
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: "Search failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Chat endpoint (non-streaming)
fastify.post<{
  Body: {
    query: string;
    docSource?: string;
    userId?: string;
    userEmail?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    responseMode?: string;
  };
}>("/api/v1/chat/query", async (request, reply) => {
  try {
    const {
      query,
      docSource,
      userId,
      userEmail,
      conversationHistory,
      responseMode,
    } = request.body;

    if (!query) {
      return reply.code(400).send({ error: "Query is required" });
    }

    // Check usage limit if userId provided
    if (userId && userEmail) {
      const { allowed, count, limit } = await ragService.checkUsageLimit(
        userId,
        userEmail
      );
      if (!allowed) {
        return reply.code(403).send({
          error: "Monthly limit reached",
          message: `You have used ${count}/${limit} free queries this month.`,
        });
      }
    }

    fastify.log.info(
      { query, docSource, userId, responseMode },
      "Processing chat query"
    );

    const response = await ragService.generateAnswer(
      query,
      docSource,
      conversationHistory,
      responseMode
    );

    // Increment usage
    if (userId) {
      await ragService.incrementUsage(userId);
    }

    return response;
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: "Query processing failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Chat endpoint (streaming)
fastify.post<{
  Body: {
    query: string;
    docSource?: string;
    userId?: string;
    userEmail?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    responseMode?: string;
  };
}>("/api/v1/chat/stream", async (request, reply) => {
  try {
    const {
      query,
      docSource,
      userId,
      userEmail,
      conversationHistory,
      responseMode,
    } = request.body;

    if (!query) {
      return reply.code(400).send({ error: "Query is required" });
    }

    // Check usage limit
    if (userId && userEmail) {
      const { allowed, count, limit } = await ragService.checkUsageLimit(
        userId,
        userEmail
      );
      if (!allowed) {
        return reply.code(403).send({
          error: "Monthly limit reached",
          message: `You have used ${count}/${limit} free queries this month.`,
        });
      }
    }

    fastify.log.info(
      { query, docSource, userId },
      "Processing streaming query"
    );

    // Set headers for SSE
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Stream response
    for await (const chunk of ragService.generateAnswerStream(
      query,
      docSource,
      conversationHistory,
      responseMode
    )) {
      reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    // Increment usage after successful stream start
    if (userId) {
      await ragService.incrementUsage(userId);
    }

    reply.raw.write("data: [DONE]\n\n");
    reply.raw.end();
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: "Streaming failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get usage stats
fastify.get<{
  Querystring: { userId: string; userEmail: string };
}>("/api/v1/user/usage", async (request, reply) => {
  try {
    const { userId, userEmail } = request.query;
    if (!userId || !userEmail) {
      return { count: 0, limit: 30 };
    }

    const stats = await ragService.checkUsageLimit(userId, userEmail);
    return stats;
  } catch (error) {
    fastify.log.error(error);
    return { count: 0, limit: 30, error: "Failed to fetch usage" };
  }
});

// Get available documentation sources
fastify.get("/api/v1/docs/sources", async () => {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("doc_sources")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    return { sources: data };
  } catch (error) {
    fastify.log.error(error);
    return { sources: [] };
  }
});

// ===== CONVERSATION ENDPOINTS =====

// Create new conversation
fastify.post<{
  Body: {
    userId: string;
    docSource: string;
    title?: string;
    userEmail?: string;
  };
}>("/api/v1/conversations", async (request, reply) => {
  try {
    const { userId, docSource, title, userEmail } = request.body;

    if (!userId || !docSource) {
      return reply
        .code(400)
        .send({ error: "userId and docSource are required" });
    }

    const conversationId = await ragService.getOrCreateConversation(
      userId,
      docSource,
      title,
      userEmail
    );
    return { conversationId };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: "Failed to create conversation" });
  }
});

// Get user conversations
fastify.get<{
  Querystring: { userId: string; limit?: string };
}>("/api/v1/conversations", async (request, reply) => {
  try {
    const { userId, limit } = request.query;

    if (!userId) {
      return reply.code(400).send({ error: "userId is required" });
    }

    const conversations = await ragService.getUserConversations(
      userId,
      limit ? parseInt(limit) : 20
    );
    return { conversations };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: "Failed to get conversations" });
  }
});

// Get conversation messages
fastify.get<{
  Params: { id: string };
}>("/api/v1/conversations/:id/messages", async (request, reply) => {
  try {
    const { id } = request.params;
    const messages = await ragService.getConversationMessages(id);
    return { messages };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: "Failed to get messages" });
  }
});

// Update conversation title
// Update conversation (title, pin)
fastify.patch<{
  Params: { id: string };
  Body: { title?: string; is_pinned?: boolean };
}>("/api/v1/conversations/:id", async (request, reply) => {
  try {
    const { id } = request.params;
    const { title, is_pinned } = request.body;

    if (title === undefined && is_pinned === undefined) {
      return reply.code(400).send({ error: "No updates provided" });
    }

    await ragService.updateConversation(id, { title, is_pinned });
    return { success: true };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: "Failed to update conversation" });
  }
});

// Save message to conversation
fastify.post<{
  Params: { id: string };
  Body: {
    role: "user" | "assistant";
    content: string;
    references?: any[];
    tokensUsed?: number;
  };
}>("/api/v1/conversations/:id/messages", async (request, reply) => {
  try {
    const { id } = request.params;
    const { role, content, references, tokensUsed } = request.body;

    if (!role || !content) {
      return reply.code(400).send({ error: "role and content are required" });
    }

    await ragService.saveMessage(id, role, content, references, tokensUsed);
    return { success: true };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: "Failed to save message" });
  }
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📚 RAG service initialized`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
