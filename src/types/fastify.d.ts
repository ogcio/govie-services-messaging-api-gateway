import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  export interface FastifyInstance {
    dirname: string;
    checkPermissions: (
      request: FastifyRequest,
      reply: FastifyReply,
      permissions: string[],
      matchConfig?: { method: "AND" | "OR" },
    ) => Promise<void>;
  }
}
