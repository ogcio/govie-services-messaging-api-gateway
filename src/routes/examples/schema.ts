import { type Static, Type } from "@sinclair/typebox";
import { getGenericResponseSchema } from "../../schemas/generic-response.js";
import { HttpError } from "../../schemas/http-error.js";
import { PaginationParamsSchema } from "../../schemas/pagination.js";

const ExampleObjectSchema = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    name: Type.String(),
  },
  { description: "Example object schema" },
);

export type ExampleObject = Static<typeof ExampleObjectSchema>;

export const ExamplesIndexSchema = {
  tags: ["Examples"],
  operationId: "indexExamples",
  querystring: PaginationParamsSchema,
  response: {
    200: getGenericResponseSchema(Type.Array(ExampleObjectSchema)),
    "4xx": HttpError,
    "5xx": HttpError,
  },
};
