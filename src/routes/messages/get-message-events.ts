import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { queryMessageEvents } from "../../services/messaging-service.js";
import { sanitizePagination } from "../../utils/pagination.js";
import type {
  FastifyReplyTypebox,
  FastifyRequestTypebox,
} from "../shared-routes.js";
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

const getMessageEventsRoute: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.get(
    "/v1/messages/events",
    { schema: getMessageEventsRouteSchema },
    async (
      request: FastifyRequestTypebox<typeof getMessageEventsRouteSchema>,
      reply: FastifyReplyTypebox<typeof getMessageEventsRouteSchema>,
    ) => {
      const sanitized = sanitizePagination(request.query);
      const limit = Number.parseInt(sanitized.limit, 10);
      const offset = Number.parseInt(sanitized.offset, 10);

      // Placeholder - will be fully implemented in Phase 4 (T074)
      const result = await queryMessageEvents(request, { limit, offset });
      reply.status(200).send(result as never);
    },
  );
};

export default getMessageEventsRoute;
