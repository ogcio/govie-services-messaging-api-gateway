import crypto from "node:crypto";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  type MessageEventsQuery,
  queryMessageEvents,
} from "../../../../services/messaging-service.js";
import {
  formatAPIResponse,
  sanitizePagination,
} from "../../../../utils/pagination.js";
import type {
  FastifyReplyTypebox,
  FastifyRequestTypebox,
} from "../../../shared-routes.js";
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
    "/events",
    { schema: getMessageEventsRouteSchema },
    async (
      request: FastifyRequestTypebox<typeof getMessageEventsRouteSchema>,
      reply: FastifyReplyTypebox<typeof getMessageEventsRouteSchema>,
    ) => {
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

      const filters: MessageEventsQuery = {
        ...sanitizePagination(request.query),
        ...request.query,
      };

      const page = await queryMessageEvents(messagingSdk, request.log, filters);
      const response = formatAPIResponse({
        data: page.data,
        totalCount: page.totalCount,
        request,
        config: fastify.config,
      });
      reply.status(200).send(response);
    },
  );
};

export default getMessageEventsRoute;
