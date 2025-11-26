import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { queryMessageEvents } from "../../../../services/messaging-service.js";
import { requirePublicServant } from "../../../../utils/auth-helpers.js";
import { sendNotFound } from "../../../../utils/error-responses.js";
import {
  formatAPIResponse,
  sanitizePagination,
} from "../../../../utils/pagination.js";
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

      const authResponse = requirePublicServant(request, reply);
      if (!authResponse) return;

      const result = await queryMessageEvents(
        fastify.getMessagingSdk(authResponse.token),
        request.log,
        {
          messageId,
          limit: sanitized.limit,
          offset: sanitized.offset,
        },
      );

      // If no events found, return 404
      if (!result.data || result.data.length === 0) {
        sendNotFound(
          reply,
          request.id,
          `No events found for messageId ${messageId}`,
        );
        return;
      }

      const response = formatAPIResponse({
        data: result.data,
        totalCount: result.totalCount,
        request,
        config: fastify.config,
      });

      reply.status(200).send(response);
    },
  );
};

export default getEventsForMessage;
