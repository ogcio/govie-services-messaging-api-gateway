import { type Static, Type } from "typebox";

export const MessageSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  organizationId: Type.String({ format: "uuid" }),
  subject: Type.String({ minLength: 1, maxLength: 500 }),
  plainTextContent: Type.String({ minLength: 1 }),
  richTextContent: Type.Optional(Type.String()),
  scheduledAt: Type.Optional(
    Type.String({
      format: "date-time",
      description: "ISO 8601 timestamp in Europe/Dublin timezone",
    }),
  ),
  createdAt: Type.String({ format: "date-time" }),
});

export type Message = Static<typeof MessageSchema>;

export const SendMessageRequestSchema = Type.Object({
  subject: Type.String({ minLength: 1, maxLength: 500 }),
  plainTextContent: Type.String({ minLength: 1 }),
  richTextContent: Type.Optional(Type.String()),
  recipientIdentifiers: Type.Array(Type.String(), {
    minItems: 1,
    description: "Array of PPSN identifiers",
  }),
  scheduledAt: Type.Optional(
    Type.String({
      format: "date-time",
      description: "ISO 8601 timestamp in Europe/Dublin timezone",
    }),
  ),
});

export type SendMessageRequest = Static<typeof SendMessageRequestSchema>;

export const SendMessageResponseSchema = Type.Object({
  messageId: Type.String({ format: "uuid" }),
  status: Type.Literal("created"),
});

export type SendMessageResponse = Static<typeof SendMessageResponseSchema>;
