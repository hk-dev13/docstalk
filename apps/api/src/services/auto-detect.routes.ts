import { FastifyInstance } from "fastify";
import { RAGService } from "./rag.service.js";
import { RouterService } from "./router.service.js";

interface ChatRequest {
  query: string;
  conversationId?: string;
  history?: Array<{ role: string; content: string }>;
  stream?: boolean;
  forceDocSource?: string; // User manually selected from clarification popup
  forceOnlineSearch?: boolean; // User toggled online search button
}

export async function registerAutoDetectRoutes(
  fastify: FastifyInstance,
  ragService: RAGService,
  routerService: RouterService
) {
  // Services are already initialized and passed in

  fastify.post<{ Body: ChatRequest }>(
    "/api/v1/chat/auto/stream",
    async (request, reply) => {
      const {
        query,
        conversationId,
        history,
        stream = true, // Default to streaming since this is /stream endpoint
        forceDocSource,
        forceOnlineSearch,
      } = request.body;

      // BYPASS: If user already selected source from clarification popup, skip AI detection
      let decision;

      if (forceDocSource) {
        // User manually selected source - create decision object directly
        decision = {
          queryType: "specific" as const,
          primarySource: forceDocSource,
          additionalSources: [],
          confidence: 100,
          reasoning: `User manually selected ${forceDocSource} from clarification`,
          needsClarification: false,
        };

        fastify.log.info(
          { forceDocSource, query },
          "Bypassing AI routing - user selection"
        );
      } else {
        // Normal AI routing
        decision = await routerService.detectContext(
          query,
          history,
          conversationId
        );
      }

      // 2. Log context switch if relevant
      if (conversationId && decision.primarySource) {
        await routerService.trackContextSwitch(
          conversationId,
          null, // We could track previous source if we had it handy
          decision.primarySource,
          query,
          false
        );

        // --- UPDATE CONVERSATION DOC_SOURCE ---
        // Ensure the conversation icon reflects the current context
        if (
          decision.queryType === "specific" &&
          decision.primarySource !== "general"
        ) {
          try {
            await ragService.supabase
              .from("conversations")
              .update({ doc_source: decision.primarySource })
              .eq("id", conversationId);
          } catch (err) {
            request.log.error(
              { err, conversationId },
              "Failed to update conversation doc_source"
            );
          }
        }
      }

      // 3. Handle AMBIGUOUS -> Ask for Clarification
      if (decision.needsClarification && decision.queryType === "ambiguous") {
        const sources = await routerService.getAvailableDocSources();
        const clarification = routerService.generateClarificationPrompt(
          decision.suggestedSources || [],
          sources
        );

        // Set SSE headers
        reply.raw.setHeader("Content-Type", "text/event-stream");
        reply.raw.setHeader("Cache-Control", "no-cache");
        reply.raw.setHeader("Connection", "keep-alive");

        // Send clarification event
        reply.raw.write(`event: clarification\n`);
        reply.raw.write(`data: ${JSON.stringify(clarification)}\n\n`);

        // Send done event
        reply.raw.write(`event: done\n`);
        reply.raw.write(`data: {}\n\n`);
        reply.raw.end();
        return;
      }

      // 4. Handle META Query -> Stream Answer
      if (decision.queryType === "meta") {
        // Set SSE headers
        reply.raw.setHeader("Content-Type", "text/event-stream");
        reply.raw.setHeader("Cache-Control", "no-cache");
        reply.raw.setHeader("Connection", "keep-alive");

        // Send routing metadata
        reply.raw.write(`event: routing\n`);
        reply.raw.write(
          `data: ${JSON.stringify({
            queryType: "meta",
            detectedSource: "docstalk",
            confidence: 1.0,
            wasAutoDetected: true,
            reasoning:
              decision.reasoning || "Meta query about DocsTalk platform",
          })}\n\n`
        );

        // Generate answer
        const answer = await routerService.handleMetaQuery(query);

        // Stream answer in chunks (simulate streaming for consistency)
        reply.raw.write(`event: content\n`);
        reply.raw.write(`data: ${JSON.stringify({ chunk: answer })}\n\n`);

        // Send done event
        reply.raw.write(`event: done\n`);
        reply.raw.write(`data: {}\n\n`);
        reply.raw.end();
        return;
      }

      // 5. Handle SPECIFIC / GENERAL Query
      // Determine sources
      const primarySource = decision.primarySource || "general"; // Default to general if undefined
      const additionalSources = decision.additionalSources || [];

      // --- PERBAIKAN UTAMA DI SINI ---
      // Kita harus menggunakan 'await' karena fungsi ini sekarang mengambil data dari DB
      let docInstructions = "";
      if (primarySource !== "general") {
        docInstructions = await routerService.getDocSourceInstructions(
          primarySource
        );
      }
      // -------------------------------

      // MODE STREAMING
      if (stream) {
        reply.raw.setHeader("Content-Type", "text/event-stream");
        reply.raw.setHeader("Cache-Control", "no-cache");
        reply.raw.setHeader("Connection", "keep-alive");

        // First, send routing metadata
        reply.raw.write(`event: routing\n`);
        reply.raw.write(
          `data: ${JSON.stringify({
            queryType: decision.queryType,
            detectedSource: decision.primarySource,
            confidence: decision.confidence || 1.0,
            wasAutoDetected: true,
            reasoning: decision.reasoning,
          })}\n\n`
        );

        // Get user info for premium check
        // TODO: Integrate with actual user subscription check
        const userId = (request as any).userId || undefined;
        const isPremium = true; // For now, enable for all users during testing

        // Stream content chunks with online search support
        const streamGenerator = ragService.generateAnswerStream(
          query,
          additionalSources.length > 0
            ? [primarySource, ...additionalSources]
            : primarySource === "general"
            ? undefined
            : primarySource,
          history,
          "auto",
          { isPremium, userId, forceOnlineSearch }
        );

        for await (const part of streamGenerator) {
          if (part.type === "content") {
            reply.raw.write(`event: content\n`);
            reply.raw.write(
              `data: ${JSON.stringify({ chunk: part.text })}\n\n`
            );
          } else if (part.type === "references") {
            reply.raw.write(`event: references\n`);
            reply.raw.write(`data: ${JSON.stringify(part.data)}\n\n`);
          } else if (part.type === "status") {
            // New: Status events for online search
            reply.raw.write(`event: status\n`);
            reply.raw.write(`data: ${JSON.stringify({ text: part.text })}\n\n`);
          } else if (part.type === "source_discovered") {
            // New: Source discovered via online search
            reply.raw.write(`event: source_discovered\n`);
            reply.raw.write(`data: ${JSON.stringify(part.data)}\n\n`);
          }
        }

        // Send done event
        reply.raw.write(`event: done\n`);
        reply.raw.write(`data: {}\n\n`);
        reply.raw.end();
      }
    }
  );

  // Get session context for a conversation
  fastify.get<{
    Params: { id: string };
  }>("/api/v1/conversations/:id/session", async (request, reply) => {
    try {
      const { id } = request.params;
      const sessionContext = await routerService.getSessionContext(id);

      if (!sessionContext) {
        return reply.code(404).send({ error: "Conversation not found" });
      }

      return reply.send(sessionContext);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to get session context" });
    }
  });
}
