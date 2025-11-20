import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyPluginAsync } from "fastify";
import { getMessageHistory } from "../../services/messaging-service.js";
import { getMessageHistoryRouteSchema } from "./schema.js";

/**
 * GET /v1/messages/:messageId/events
 *
 * Get complete event history for a specific message
 *
 * Spec: US3, FR-017
 * Success: 200 OK with event timeline
 * Errors: 401 auth_missing, 403 org_missing, 404 message_not_found, 500 internal_error
 */

const getMessageHistoryRoute: FastifyPluginAsync = async (fastify) => {
  fastify
    .withTypeProvider<TypeBoxTypeProvider>()
    .get(
      "/v1/messages/:messageId/events",
      { schema: getMessageHistoryRouteSchema },
      async (request, reply) => {
        // Placeholder - will be fully implemented in Phase 4 (T075)
        const params = request.params;
        const result = await getMessageHistory(request, params.messageId);
        reply.status(200).send({ data: result } as never);
      },
    );
};

export default getMessageHistoryRoute;
