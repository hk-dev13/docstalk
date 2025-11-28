import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { RAGService } from "./rag.service.js";
import { RouterService } from "./router.service.js";

interface AutoDetectBody {
  query: string;
  userId?: string;
  userEmail?: string;
  conversationId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  responseMode?: string;
  forceDocSource?: string;
}

/**
 * Register auto-detect endpoints
 */
export async function registerAutoDetectRoutes(
  fastify: FastifyInstance,
  ragService: RAGService,
  routerService: RouterService
) {
  // Auto-detect chat endpoint (non-streaming)
  fastify.post<{
    Body: AutoDetectBody;
  }>("/api/v1/chat/auto", async (request, reply) => {
    try {
      const {
        query,
        userId,
        userEmail,
        conversationId,
        conversationHistory,
        responseMode,
        forceDocSource,
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
        { query, userId, conversationId, forceDocSource },
        "Processing auto-detect query"
      );

      // Detect context using router
      const routingDecision = await routerService.detectContext(
        query,
        conversationHistory,
        conversationId
      );

      fastify.log.info({ routingDecision }, "Routing decision");

      // Handle meta queries
      if (routingDecision.queryType === "meta") {
        const metaAnswer = await routerService.handleMetaQuery(query);

        // Track meta query in session if conversation exists
        if (conversationId) {
          await routerService.trackContextSwitch(
            conversationId,
            null,
            "meta",
            query,
            false
          );
        }

        return {
          answer: metaAnswer,
          references: [],
          tokensUsed: 0,
          routing: {
            queryType: "meta",
            detectedSource: "meta",
            confidence: 100,
            wasAutoDetected: true,
          },
        };
      }

      // Handle general queries (fallback agent)
      if (routingDecision.queryType === "general") {
        // For non-streaming, we need a non-streaming version of generateGeneralAnswer
        // Or we can consume the stream. For now, let's implement a simple non-streaming wrapper or method.
        // Since we didn't implement generateGeneralAnswer (non-stream) in RAGService,
        // we'll consume the stream here or add the method.
        // Let's add generateGeneralAnswer to RAGService first or use the stream.
        // Using stream to text helper:
        let fullAnswer = "";
        for await (const chunk of ragService.generateGeneralAnswerStream(
          query,
          conversationHistory,
          responseMode
        )) {
          fullAnswer += chunk;
        }

        if (conversationId) {
          await routerService.trackContextSwitch(
            conversationId,
            null,
            "general",
            query,
            false
          );
        }

        return {
          answer: fullAnswer,
          references: [],
          tokensUsed: 0,
          routing: {
            queryType: "general",
            detectedSource: "general",
            confidence: routingDecision.confidence,
            wasAutoDetected: true,
            reasoning: routingDecision.reasoning,
          },
        };
      }

      // Handle ambiguous queries (needs clarification)
      if (routingDecision.needsClarification) {
        const docSources = await routerService.getAvailableDocSources();
        const clarification = routerService.generateClarificationPrompt(
          routingDecision.suggestedSources || [],
          docSources
        );

        return {
          needsClarification: true,
          clarification,
          routing: {
            queryType: routingDecision.queryType,
            confidence: routingDecision.confidence,
            suggestedSources: routingDecision.suggestedSources,
          },
        };
      }

      // Handle specific doc source queries
      const docSource = forceDocSource || routingDecision.primarySource;
      if (!docSource) {
        return reply.code(400).send({
          error: "Could not determine doc source",
          routing: routingDecision,
        });
      }

      // Get doc source instructions
      const docSourceInstructions =
        routerService.getDocSourceInstructions(docSource);

      // Generate answer
      const response = await ragService.generateAnswerWithRouter(
        query,
        docSource,
        routingDecision.additionalSources,
        conversationHistory,
        responseMode,
        docSourceInstructions
      );

      // Track context switch
      if (conversationId) {
        const sessionContext = await routerService.getSessionContext(
          conversationId
        );
        await routerService.trackContextSwitch(
          conversationId,
          sessionContext.currentSource,
          docSource,
          query,
          !!forceDocSource // explicit if user forced a source
        );
      }

      // Increment usage
      if (userId) {
        await ragService.incrementUsage(userId);
      }

      return {
        ...response,
        routing: {
          queryType: routingDecision.queryType,
          detectedSource: docSource,
          additionalSources: routingDecision.additionalSources,
          confidence: routingDecision.confidence,
          wasAutoDetected: !forceDocSource,
          reasoning: routingDecision.reasoning,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: "Auto-detect query failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Auto-detect chat endpoint (streaming)
  fastify.post<{
    Body: AutoDetectBody;
  }>("/api/v1/chat/auto/stream", async (request, reply) => {
    try {
      const {
        query,
        userId,
        userEmail,
        conversationId,
        conversationHistory,
        responseMode,
        forceDocSource,
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

      fastify.log.info({ query, userId }, "Processing auto-detect stream");

      // If force doc source is provided, skip detection and go straight to streaming
      if (forceDocSource) {
        fastify.log.info(
          { forceDocSource },
          "Using forced doc source, skipping detection"
        );

        // Set headers for SSE
        reply.raw.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        // Send routing metadata
        reply.raw.write(
          `event: routing\ndata: ${JSON.stringify({
            queryType: "specific",
            detectedSource: forceDocSource,
            confidence: 100,
            wasAutoDetected: false,
            reasoning: "Manual selection",
          })}\n\n`
        );

        // Stream answer directly
        for await (const chunk of ragService.generateAnswerStream(
          query,
          forceDocSource,
          conversationHistory,
          responseMode
        )) {
          reply.raw.write(
            `event: content\ndata: ${JSON.stringify({ chunk })}\n\n`
          );
        }

        // Track context switch
        if (conversationId) {
          const sessionContext = await routerService.getSessionContext(
            conversationId
          );
          await routerService.trackContextSwitch(
            conversationId,
            sessionContext.currentSource,
            forceDocSource,
            query,
            true // explicit selection
          );
        }

        // Increment usage
        if (userId) {
          await ragService.incrementUsage(userId);
        }

        reply.raw.write("event: done\ndata: {}\n\n");
        reply.raw.end();
        return;
      }

      // Detect context
      const routingDecision = await routerService.detectContext(
        query,
        conversationHistory,
        conversationId
      );

      // Set headers for SSE
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      // Send routing metadata as named event
      reply.raw.write(
        `event: routing\ndata: ${JSON.stringify({
          queryType: routingDecision.queryType,
          detectedSource: routingDecision.primarySource,
          confidence: routingDecision.confidence,
          wasAutoDetected: !forceDocSource,
          reasoning: routingDecision.reasoning,
        })}\n\n`
      );

      // Handle meta queries
      if (routingDecision.queryType === "meta") {
        const metaAnswer = await routerService.handleMetaQuery(query);

        reply.raw.write(
          `event: content\ndata: ${JSON.stringify({ chunk: metaAnswer })}\n\n`
        );

        if (conversationId) {
          await routerService.trackContextSwitch(
            conversationId,
            null,
            "meta",
            query,
            false
          );
        }

        reply.raw.write("event: done\ndata: {}\n\n");
        reply.raw.end();
        return;
      }

      // Handle general queries (fallback agent)
      if (routingDecision.queryType === "general") {
        for await (const chunk of ragService.generateGeneralAnswerStream(
          query,
          conversationHistory,
          responseMode
        )) {
          reply.raw.write(
            `event: content\ndata: ${JSON.stringify({ chunk })}\n\n`
          );
        }

        if (conversationId) {
          await routerService.trackContextSwitch(
            conversationId,
            null,
            "general", // Track as general context
            query,
            false
          );
        }

        reply.raw.write("event: done\ndata: {}\n\n");
        reply.raw.end();
        return;
      }

      // Handle clarification needed
      if (routingDecision.needsClarification) {
        const docSources = await routerService.getAvailableDocSources();
        const clarification = routerService.generateClarificationPrompt(
          routingDecision.suggestedSources || [],
          docSources
        );

        reply.raw.write(
          `event: clarification\ndata: ${JSON.stringify(clarification)}\n\n`
        );

        reply.raw.write("event: done\ndata: {}\n\n");
        reply.raw.end();
        return;
      }

      // Stream answer
      const docSource = forceDocSource || routingDecision.primarySource!;
      const additionalSources = routingDecision.additionalSources;

      const stream =
        additionalSources && additionalSources.length > 0
          ? ragService.generateMultiSourceAnswerStream(
              query,
              [docSource, ...additionalSources],
              conversationHistory,
              responseMode
            )
          : ragService.generateAnswerStream(
              query,
              docSource,
              conversationHistory,
              responseMode
            );

      for await (const chunk of stream) {
        reply.raw.write(
          `event: content\ndata: ${JSON.stringify({ chunk })}\n\n`
        );
      }

      // Track context switch
      if (conversationId) {
        const sessionContext = await routerService.getSessionContext(
          conversationId
        );
        await routerService.trackContextSwitch(
          conversationId,
          sessionContext.currentSource,
          docSource,
          query,
          !!forceDocSource
        );
      }

      // Increment usage
      if (userId) {
        await ragService.incrementUsage(userId);
      }

      reply.raw.write("event: done\ndata: {}\n\n");
      reply.raw.end();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: "Auto-detect streaming failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get session context for conversation
  fastify.get<{
    Params: { id: string };
  }>("/api/v1/conversations/:id/session", async (request, reply) => {
    try {
      const { id } = request.params;
      const sessionContext = await routerService.getSessionContext(id);
      return { sessionContext };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to get session context" });
    }
  });
}
