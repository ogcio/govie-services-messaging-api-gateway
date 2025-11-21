import fastifyMultipart from "@fastify/multipart";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

export default fp(
  async (fastify: FastifyInstance, opts: FastifyPluginAsync) => {
    await fastify.register(fastifyMultipart, {
      attachFieldsToBody: "keyValues",
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB per file
        files: 3, // Max 3 files
      },
      ...opts,
    });
  },
  { name: "fastifyMultipart" },
);
