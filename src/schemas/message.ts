import { type Static, Type } from "typebox";

export const RecipientTypes = {
  Email: "email",
  Identity: "identity",
} as const;

// Recipient variants (aligns with RecipientInput in profile-service)
const EmailRecipientSchema = Type.Object({
  type: Type.Literal(RecipientTypes.Email),
  firstName: Type.String({ minLength: 1 }),
  lastName: Type.String({ minLength: 1 }),
  email: Type.String({ format: "email" }),
  ppsn: Type.Optional(Type.String()),
  dateOfBirth: Type.Optional(Type.String({ format: "date" })),
});

const IdentityRecipientSchema = Type.Object({
  type: Type.Literal(RecipientTypes.Identity),
  ppsn: Type.String({ minLength: 5 }),
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
  securityLevel: Type.Enum(["public", "confidential"]),
  language: Type.Enum(["en", "ga"]),
  scheduledAt: Type.String({
    format: "date-time",
    description: "ISO 8601 timestamp (Europe/Dublin TZ assumed)",
  }),
  recipient: RecipientUnionSchema,
  attachments: Type.Optional(Type.Unknown()), // Placeholder for multipart files
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
