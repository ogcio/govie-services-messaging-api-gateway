import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";

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
        await fastify.checkPermissions(request, reply, permissions, { method });

        if (!request.userData) {
          request.log.error("No user data found after permission check");
          reply.status(401).send();
          return;
        }

        if (!request.userData.organizationId) {
          request.log.error("No organization ID found in user data");
          reply.status(401).send();
          return;
        }
      } catch (e) {
        request.log.error({ parent: e }, "Unauthorized request");
        reply.status(401).send();
      }
    },
  );
});
