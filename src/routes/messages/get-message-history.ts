import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyPluginAsync } from "fastify";
import { queryMessageEvents } from "../../services/messaging-service.js";
import { sanitizePagination } from "../../utils/pagination.js";
import { getMessageHistoryRouteSchema } from "./schema.js";

/**
 * GET /v1/messages/:messageId/events
 *
 * Get complete event history for a specific message
 *
 * Spec: US3, FR-024, FR-025, FR-026
 * Success: 200 OK with event timeline
 * Errors: 401 auth_missing, 403 org_missing, 404 message_not_found, 500 internal_error
 *
 * Note: Uses same SDK method as get-message-events, but with messageId filter
 */

const getMessageHistoryRoute: FastifyPluginAsync = async (fastify) => {
  fastify
    .withTypeProvider<TypeBoxTypeProvider>()
    .get(
      "/v1/messages/:messageId/events",
      { schema: getMessageHistoryRouteSchema },
      async (request, reply) => {
        const { messageId } = request.params as { messageId: string };
        const query = request.query as { limit?: string; offset?: string };
        const sanitized = sanitizePagination(query);
        const limit = Number.parseInt(sanitized.limit, 10);
        const offset = Number.parseInt(sanitized.offset, 10);

        // Placeholder - will be fully implemented in Phase 5 (T079, T082)
        // Uses queryMessageEvents with messageId filter
        const result = await queryMessageEvents(request, {
          messageId,
          limit,
          offset,
        });
        reply.status(200).send(result as never);
      },
    );
};

export default getMessageHistoryRoute;
