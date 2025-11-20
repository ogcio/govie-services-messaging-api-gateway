import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyPluginAsync } from "fastify";
import { Type } from "typebox";
import { getGenericResponseSchema } from "../../schemas/generic-response.js";
import { HttpError } from "../../schemas/http-error.js";
import { getMessageHistory } from "../../services/messaging-service.js";

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
  const MessageHistorySchema = Type.Object({
    messageId: Type.String({ format: "uuid" }),
    subject: Type.String(),
    events: Type.Array(
      Type.Object({
        eventType: Type.String(),
        timestamp: Type.String({ format: "date-time" }),
        details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
      }),
    ),
  });

  fastify.withTypeProvider<TypeBoxTypeProvider>().get(
    "/v1/messages/:messageId/events",
    {
      schema: {
        tags: ["messages"],
        description: "Get complete event history for a message",
        params: Type.Object({
          messageId: Type.String({ format: "uuid" }),
        }),
        response: {
          200: getGenericResponseSchema(MessageHistorySchema),
          401: HttpError,
          403: HttpError,
          404: HttpError,
          500: HttpError,
        },
      },
    },
    async (request, reply) => {
      // Placeholder - will be fully implemented in Phase 4 (T075)
      const params = request.params;
      const result = await getMessageHistory(request, params.messageId);
      reply.status(200).send({ data: result } as never);
    },
  );
};

export default getMessageHistoryRoute;
