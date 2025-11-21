import { type Static, Type } from "typebox";

// Recipient variants (aligns with RecipientInput in profile-service)
const EmailRecipientSchema = Type.Object({
  type: Type.Literal("email"),
  firstName: Type.String({ minLength: 1 }),
  lastName: Type.String({ minLength: 1 }),
  email: Type.String({ format: "email" }),
  ppsn: Type.Optional(Type.String()),
  dateOfBirth: Type.Optional(Type.String({ format: "date" })),
});

const IdentityRecipientSchema = Type.Object({
  type: Type.Literal("identity"),
  ppsn: Type.String({ minLength: 7 }),
  dateOfBirth: Type.String({ format: "date" }),
});

export const RecipientUnionSchema = Type.Union([
  EmailRecipientSchema,
  IdentityRecipientSchema,
]);

export type RecipientUnion = Static<typeof RecipientUnionSchema>;

// Send message request schema (multipart expects files separately; this covers JSON fields)
export const SendMessageRequestSchema = Type.Object({
  subject: Type.String({ minLength: 1, maxLength: 500 }),
  plainTextBody: Type.String({ minLength: 1 }),
  htmlBody: Type.Optional(Type.String()),
  securityLevel: Type.Union([
    Type.Literal("confidential"),
    Type.Literal("public"),
  ]),
  language: Type.Union([Type.Literal("en"), Type.Literal("ga")]),
  scheduledAt: Type.String({
    format: "date-time",
    description: "ISO 8601 timestamp (Europe/Dublin TZ assumed)",
  }),
  recipient: RecipientUnionSchema,
  // Attachments streamed via multipart; optional count hint for validation (not required)
  attachmentsMeta: Type.Optional(
    Type.Array(
      Type.Object({
        filename: Type.String(),
        mimeType: Type.String(),
        sizeBytes: Type.Number({ minimum: 1 }),
      }),
      { maxItems: 10 },
    ),
  ),
});

export type SendMessageRequest = Static<typeof SendMessageRequestSchema>;

// Send message response schema (aligned with orchestration result)
export const SendMessageResponseSchema = Type.Object({
  messageId: Type.String({ format: "uuid" }),
  recipientId: Type.String({ format: "uuid" }),
  attachmentIds: Type.Array(Type.String({ format: "uuid" })),
  status: Type.Literal("created"),
});

export type SendMessageResponse = Static<typeof SendMessageResponseSchema>;
