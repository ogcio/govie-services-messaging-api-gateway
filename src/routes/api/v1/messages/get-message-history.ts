import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { queryMessageEvents } from "../../../../services/messaging-service.js";
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

const getMessageHistoryRoute: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.get(
    "/:messageId/events",
    { schema: getMessageHistoryRouteSchema },
    async (
      request: FastifyRequestTypebox<typeof getMessageHistoryRouteSchema>,
      reply: FastifyReplyTypebox<typeof getMessageHistoryRouteSchema>,
    ) => {
      const { messageId } = request.params;
      const query = request.query;
      const sanitized = sanitizePagination(query);

      const token = request.userData?.accessToken;
      if (!token) {
        reply.status(401).send({
          code: "UNAUTHORIZED",
          detail: "No authorization header found",
          requestId: crypto.randomUUID(),
          name: "UnauthorizedError",
          statusCode: 401,
        });
        return;
      }
      const messagingSdk = fastify.getMessagingSdk(token);

      try {
        const result = await queryMessageEvents(messagingSdk, request.log, {
          messageId,
          limit: sanitized.limit,
          offset: sanitized.offset,
        });
        // If no events found, return 404
        if (!result.data || result.data.length === 0) {
          reply.status(404).send({
            code: "NOT_FOUND",
            detail: `No events found for messageId ${messageId}`,
            requestId: crypto.randomUUID(),
            name: "NotFoundError",
            statusCode: 404,
          });
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
        if (
          typeof err === "object" &&
          err !== null &&
          ("statusCode" in err || "code" in err)
        ) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          const code = (err as { code?: string }).code;
          if (statusCode === 403 || code === "ORG_MISSING") {
            reply.status(403).send({
              code: "ORG_MISSING",
              detail: "Organization missing or forbidden",
              requestId: crypto.randomUUID(),
              name: "ForbiddenError",
              statusCode: 403,
            });
            return;
          }
        }
        // Pass through other errors
        throw err;
      }
    },
  );
};

export default getMessageHistoryRoute;
