import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyPluginAsync } from "fastify";
import { queryMessageEvents } from "../../services/messaging-service.js";
import { sanitizePagination } from "../../utils/pagination.js";
import { getMessageEventsRouteSchema } from "./schema.js";

/**
 * GET /v1/messages/events
 *
 * Query message events for the organization with pagination
 *
 * Spec: US2, FR-016, FR-022, FR-034
 * Success: 200 OK with paginated events
 * Errors: 401 auth_missing, 403 org_missing, 500 internal_error
 */

const getMessageEventsRoute: FastifyPluginAsync = async (fastify) => {
  fastify
    .withTypeProvider<TypeBoxTypeProvider>()
    .get(
      "/v1/messages/events",
      { schema: getMessageEventsRouteSchema },
      async (request, reply) => {
        const query = request.query as { limit?: string; offset?: string };
        const sanitized = sanitizePagination(query);
        const limit = Number.parseInt(sanitized.limit, 10);
        const offset = Number.parseInt(sanitized.offset, 10);

        // Placeholder - will be fully implemented in Phase 4 (T074)
        const result = await queryMessageEvents(request, { limit, offset });
        reply.status(200).send(result as never);
      },
    );
};

export default getMessageEventsRoute;
