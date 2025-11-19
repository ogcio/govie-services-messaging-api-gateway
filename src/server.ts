import fastifyAutoload from "@fastify/autoload";
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { join } from "path";

export default async function buildServer(
  server: FastifyInstance,
  options: FastifyPluginOptions,
) {
  server.decorate("dirname", import.meta.dirname);

  await server.register(fastifyAutoload, {
    dir: join(import.meta.dirname, "plugins/external"),
    options: { ...options },
  });

  await server.register(fastifyAutoload, {
    dir: join(import.meta.dirname, "plugins/internal"),
    options: { ...options },
  });

  server.register(fastifyAutoload, {
    dir: join(import.meta.dirname, "routes"),
    autoHooks: true,
    cascadeHooks: true,
    // ignore the files that starts with shared or utils
    ignorePattern: /.*(shared|utils)-?(.+)?\.(t|j)s$/,
    options: { ...options },
  });
}
