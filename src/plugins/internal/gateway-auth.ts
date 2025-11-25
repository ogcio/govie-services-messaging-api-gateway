import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";
import {
  sendForbidden,
  sendUnauthorized,
} from "../../utils/error-responses.js";

declare module "fastify" {
  export interface FastifyInstance {
    gatewayCheckPermissions: (
      request: FastifyRequest,
      reply: FastifyReply,
      neededPermissions: string[],
      method?: "AND" | "OR",
    ) => Promise<void>;
  }
}

export default fp((fastify: FastifyInstance, _opts: FastifyPluginAsync) => {
  fastify.decorate(
    "gatewayCheckPermissions",
    async (
      request: FastifyRequest,
      reply: FastifyReply,
      permissions: string[],
      method: "AND" | "OR" = "AND",
    ): Promise<void> => {
      try {
        await fastify.checkPermissions(request, reply, permissions, {
          method,
        });

        if (!request.userData) {
          request.log.error("No user data found after permission check");
          return sendUnauthorized(reply, request.id, "No user data found");
        }

        if (!request.userData.organizationId) {
          request.log.error("No organization ID found in user data");
          return sendForbidden(reply, request.id, "No organization ID found");
        }
      } catch (e) {
        request.log.error({ parent: e }, "Unauthorized request");
        return sendUnauthorized(reply, request.id);
      }
    },
  );
});
