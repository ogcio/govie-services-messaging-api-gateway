import { randomUUID } from "node:crypto";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import {
  formatAPIResponse,
  sanitizePagination,
} from "../../utils/pagination.js";
import type {
  FastifyReplyTypebox,
  FastifyRequestTypebox,
} from "../shared-routes.js";
import { type ExampleObject, ExamplesIndexSchema } from "./schema.js";

const plugin: FastifyPluginAsyncTypebox = async (fastify: FastifyInstance) => {
  fastify.get(
    "/",
    {
      schema: ExamplesIndexSchema,
    },
    async (
      request: FastifyRequestTypebox<typeof ExamplesIndexSchema>,
      reply: FastifyReplyTypebox<typeof ExamplesIndexSchema>,
    ) => {
      const exampleItems = createExampleItems(200);
      const paginationParams = sanitizePagination(request.query);

      const paginatedItems = exampleItems.slice(
        Number(paginationParams.offset),
        Number(paginationParams.offset) + Number(paginationParams.limit),
      );

      return reply.status(200).send(
        formatAPIResponse({
          data: paginatedItems,
          request,
          totalCount: exampleItems.length,
          config: fastify.config,
        }),
      );
    },
  );
};

function createExampleItems(numberToCreate: number): ExampleObject[] {
  const items = [];
  for (let i = 0; i < numberToCreate; i++) {
    items.push({
      id: randomUUID(),
      name: `Example Item ${i + 1}`,
    });
  }

  return items;
}

export default plugin;
export const autoPrefix = "/api/v1/examples";
