import fp from "fastify-plugin";
import { executeWithRetry } from "../../utils/retry.js";

declare module "fastify" {
  interface FastifyInstance {
    retry: typeof executeWithRetry;
  }
}

// Retry plugin: decorates fastify with executeWithRetry utility
export default fp(async (fastify) => {
  if (!fastify.hasDecorator("retry")) {
    fastify.decorate("retry", executeWithRetry);
  }
});
