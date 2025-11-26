import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  type MessageEventsQuery,
  queryMessageEvents,
} from "../../../../services/messaging-service.js";
import { requirePublicServant } from "../../../../utils/auth-helpers.js";
import {
  formatAPIResponse,
  sanitizePagination,
} from "../../../../utils/pagination.js";
import type {
  FastifyReplyTypebox,
  FastifyRequestTypebox,
} from "../../../shared-routes.js";
import { getLatestEventForMessagesRouteSchema } from "./schema.js";

/**
 * GET /v1/messages/events
 *
 * Query message events for the organization with pagination
 *
 * Spec: US2, FR-016, FR-022, FR-034
 * Success: 200 OK with paginated events
 * Errors: 401 auth_missing, 403 org_missing, 500 internal_error
 */

const getLatestEventForMessages: FastifyPluginAsyncTypebox = async (
  fastify,
) => {
  fastify.post(
    "/events",
    {
      schema: getLatestEventForMessagesRouteSchema,
      preValidation: (req, res) =>
        fastify.gatewayCheckPermissions(req, res, []),
    },
    async (
      request: FastifyRequestTypebox<
        typeof getLatestEventForMessagesRouteSchema
      >,
      reply: FastifyReplyTypebox<typeof getLatestEventForMessagesRouteSchema>,
    ) => {
      const authResponse = requirePublicServant(request, reply);
      if (!authResponse) return;

      const filters: MessageEventsQuery = {
        ...sanitizePagination(request.query),
        ...(request.body ?? {}),
      };

      const page = await queryMessageEvents(
        fastify.getMessagingSdk(authResponse.token),
        request.log,
        filters,
      );

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

export default getLatestEventForMessages;
