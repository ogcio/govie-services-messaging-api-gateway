import { Type } from "typebox";
import { getGenericResponseSchema } from "../../schemas/generic-response.js";
import { HttpError } from "../../schemas/http-error.js";
import {
  SendMessageRequestSchema,
  SendMessageResponseSchema,
} from "../../schemas/message.js";
import { PaginationParamsSchema } from "../../schemas/pagination.js";

// Aggregated route schemas for messaging endpoints (T030)

// POST /v1/messages
export const sendMessageRouteSchema = {
  tags: ["messages"],
  consumes: ["multipart/form-data"],
  description: "Send a message with optional attachments (multipart/form-data)",
  body: SendMessageRequestSchema,
  response: {
    201: getGenericResponseSchema(SendMessageResponseSchema),
    400: HttpError,
    401: HttpError,
    403: HttpError,
    404: HttpError,
    409: HttpError,
    413: HttpError,
    500: HttpError,
    502: HttpError,
    503: HttpError,
    504: HttpError,
  },
};

// GET /v1/messages/events
const MessageEventSchema = Type.Object({
  messageId: Type.String({ format: "uuid" }),
  subject: Type.String(),
  timestamp: Type.String({ format: "date-time" }),
  status: Type.String(),
});

export const getMessageEventsRouteSchema = {
  tags: ["messages"],
  description: "Query message events with pagination and HATEOAS links",
  querystring: PaginationParamsSchema,
  response: {
    200: getGenericResponseSchema(Type.Array(MessageEventSchema)),
    401: HttpError,
    403: HttpError,
    500: HttpError,
  },
};

// GET /v1/messages/:messageId/events
const MessageHistorySchema = Type.Object({
  messageId: Type.String({ format: "uuid" }),
  subject: Type.String(),
  events: Type.Array(
    Type.Object({
      eventType: Type.String(),
      timestamp: Type.String({ format: "date-time" }),
      details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    }),
  ),
});

export const getMessageHistoryRouteSchema = {
  tags: ["messages"],
  querystring: PaginationParamsSchema,
  description: "Get complete event history for a message",
  params: Type.Object({
    messageId: Type.String({ format: "uuid" }),
  }),
  response: {
    200: getGenericResponseSchema(MessageHistorySchema),
    401: HttpError,
    403: HttpError,
    404: HttpError,
    500: HttpError,
  },
};

export const messagingRouteSchemas = {
  sendMessage: sendMessageRouteSchema,
  getMessageEvents: getMessageEventsRouteSchema,
  getMessageHistory: getMessageHistoryRouteSchema,
};
