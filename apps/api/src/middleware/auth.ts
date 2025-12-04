import { FastifyReply, FastifyRequest } from "fastify";
import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Extend FastifyRequest to include user info
declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      userId: string;
      claims: any;
    };
  }
}

export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Missing or invalid Authorization header",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token using Clerk
    // Note: verifyToken returns the claims if valid, throws if invalid
    const claims = await clerk.verifyToken(token);

    // Attach user info to request
    request.auth = {
      userId: claims.sub,
      claims: claims,
    };
  } catch (error) {
    request.log.error(error, "Authentication failed");
    return reply.code(401).send({
      error: "Unauthorized",
      message: "Invalid authentication token",
    });
  }
};
