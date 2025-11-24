import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { queryMessageEvents } from "../../../../services/messaging-service.js";
import { requireAuthToken } from "../../../../utils/auth-helpers.js";
import {
  isForbiddenError,
  sendForbidden,
  sendNotFound,
} from "../../../../utils/error-responses.js";
import { sanitizePagination } from "../../../../utils/pagination.js";
import type {
  FastifyReplyTypebox,
  FastifyRequestTypebox,
} from "../../../shared-routes.js";
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

const getEventsForMessage: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.get(
    "/:messageId/events",
    {
      schema: getMessageHistoryRouteSchema,
      preValidation: (req, res) =>
        fastify.gatewayCheckPermissions(req, res, []),
    },
    async (
      request: FastifyRequestTypebox<typeof getMessageHistoryRouteSchema>,
      reply: FastifyReplyTypebox<typeof getMessageHistoryRouteSchema>,
    ) => {
      const { messageId } = request.params;
      const query = request.query;
      const sanitized = sanitizePagination(query);

      const token = requireAuthToken(request, reply);
      if (!token) return;

      const messagingSdk = fastify.getMessagingSdk(token);

      try {
        const result = await queryMessageEvents(messagingSdk, request.log, {
          messageId,
          limit: sanitized.limit,
          offset: sanitized.offset,
        });
        // If no events found, return 404
        if (!result.data || result.data.length === 0) {
          sendNotFound(
            reply,
            request.id,
            `No events found for messageId ${messageId}`,
          );
          return;
        }

        // Assemble response to match schema
        const response = {
          data: {
            messageId: result.data[0].messageId,
            subject: result.data[0].subject || "",
            events: result.data.map((ev) => ({
              eventType: ev.eventType,
              timestamp: ev.scheduledAt,
            })),
          },
          metadata: {
            totalCount: result.totalCount,
          },
        };
        reply.status(200).send(response as never);
      } catch (err: unknown) {
        // Map org/authorization errors to 403
        if (isForbiddenError(err)) {
          sendForbidden(reply, request.id);
          return;
        }
        // Pass through other errors
        throw err;
      }
    },
  );
};

export default getEventsForMessage;
