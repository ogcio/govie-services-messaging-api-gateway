import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyPluginAsync } from "fastify";
import { sendMessage } from "../../services/message-orchestration.js";
import { sendMessageRouteSchema } from "./schema.js";

/**
 * POST /v1/messages
 *
 * Send a message to recipients with optional attachments
 *
 * Spec: US1, FR-001 through FR-039
 * Success: 201 Created
 * Errors: 400 validation_error, 401 auth_missing, 403 org_missing,
 *         404 recipient_not_found, 409 recipient_conflict,
 *         413 attachment_limit_exceeded, 500 internal_error,
 *         502/503/504 transient_failure
 */

const sendMessageRoute: FastifyPluginAsync = async (fastify) => {
  fastify
    .withTypeProvider<TypeBoxTypeProvider>()
    .post(
      "/v1/messages",
      { schema: sendMessageRouteSchema },
      async (request, reply) => {
        // Placeholder - will be fully implemented in Phase 4 (T073)
        const result = await sendMessage(request, request.body);
        reply.status(201).send({ data: result });
      },
    );
};

export default sendMessageRoute;
