import { Type } from "typebox";
import { getGenericResponseSchema } from "../../../../schemas/generic-response.js";
import { HttpError } from "../../../../schemas/http-error.js";
import {
  SendMessageRequestSchema,
  SendMessageResponseSchema,
} from "../../../../schemas/message.js";
import { PaginationParamsSchema } from "../../../../schemas/pagination.js";

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
  id: Type.String({
    format: "uuid",
    description: "Unique id of the event",
  }),
  messageId: Type.String({
    format: "uuid",
    description: "Unique id of the related message",
  }),
  subject: Type.String({ description: "Subject of the related message" }),
  receiverFullName: Type.String({
    description: "Full name of the recipient",
  }),
  eventType: Type.String({ description: "Event type description" }),
  eventStatus: Type.String({ description: "Status for event type" }),
  scheduledAt: Type.String({
    description:
      "Date and time which describes when the message has to be sent",
  }),
});

const MessageStatus = {
  Delivered: "delivered",
  Scheduled: "scheduled",
  Opened: "opened",
  Failed: "failed",
};

const GetLatestEventBodySchema = Type.Object({
  recipientEmail: Type.Optional(Type.String({ format: "email" })),
  recipientId: Type.Optional(Type.String({ format: "uuid" })),
  subjectContains: Type.Optional(Type.String()),
  dateFrom: Type.Optional(Type.String({ format: "date-time" })),
  dateTo: Type.Optional(Type.String({ format: "date-time" })),
  status: Type.Optional(
    Type.Enum(Object.values(MessageStatus), {
      description: "Filter events by status",
    }),
  ),
});

export const getLatestEventForMessagesRouteSchema = {
  tags: ["messages"],
  querystring: PaginationParamsSchema,
  description:
    "Get latest event for a list of messages with pagination, filters, and HATEOAS links",
  body: Type.Optional(GetLatestEventBodySchema),
  response: {
    200: getGenericResponseSchema(Type.Array(MessageEventSchema)),
    401: HttpError,
    403: HttpError,
    500: HttpError,
  },
};

// GET /v1/messages/:messageId/events

export const getMessageHistoryRouteSchema = {
  tags: ["messages"],
  querystring: PaginationParamsSchema,
  description: "Get complete event history for a message",
  params: Type.Object({
    messageId: Type.String({ format: "uuid" }),
  }),
  response: {
    200: getGenericResponseSchema(Type.Array(MessageEventSchema)),
    401: HttpError,
    403: HttpError,
    404: HttpError,
    500: HttpError,
  },
};

export const messagingRouteSchemas = {
  sendMessage: sendMessageRouteSchema,
  getMessageEvents: getLatestEventForMessagesRouteSchema,
  getMessageHistory: getMessageHistoryRouteSchema,
};
