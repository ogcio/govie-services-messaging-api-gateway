import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyPluginAsync } from "fastify";
import { Type } from "typebox";
import { getGenericResponseSchema } from "../../schemas/generic-response.js";
import { HttpError } from "../../schemas/http-error.js";
import { PaginationParamsSchema } from "../../schemas/pagination.js";
import { queryMessageEvents } from "../../services/messaging-service.js";
import { sanitizePagination } from "../../utils/pagination.js";

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
  const MessageEventSchema = Type.Object({
    messageId: Type.String({ format: "uuid" }),
    subject: Type.String(),
    timestamp: Type.String({ format: "date-time" }),
    status: Type.String(),
  });

  fastify.withTypeProvider<TypeBoxTypeProvider>().get(
    "/v1/messages/events",
    {
      schema: {
        tags: ["messages"],
        description: "Query message events with pagination and HATEOAS links",
        querystring: PaginationParamsSchema,
        response: {
          200: getGenericResponseSchema(Type.Array(MessageEventSchema)),
          401: HttpError,
          403: HttpError,
          500: HttpError,
        },
      },
    },
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
