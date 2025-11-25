import { type Static, Type } from "typebox";

export const RecipientTypes = {
  Email: "email",
  Identity: "identity",
} as const;

// Recipient variants (aligns with RecipientInput in profile-service)
const EmailRecipientSchema = Type.Object({
  type: Type.Literal(RecipientTypes.Email, {
    description: "Recipient type identifier for email-based recipients",
  }),
  firstName: Type.String({
    minLength: 1,
    description: "Recipient's first name",
  }),
  lastName: Type.String({
    minLength: 1,
    description: "Recipient's last name",
  }),
  email: Type.String({
    format: "email",
    description: "Recipient's email address",
  }),
  ppsn: Type.Optional(
    Type.String({
      description:
        "Personal Public Service Number (optional for email recipients)",
    }),
  ),
  dateOfBirth: Type.Optional(
    Type.String({
      format: "date",
      description:
        "Recipient's date of birth in YYYY-MM-DD format (optional for email recipients)",
    }),
  ),
});

const IdentityRecipientSchema = Type.Object({
  type: Type.Literal(RecipientTypes.Identity, {
    description: "Recipient type identifier for identity-based recipients",
  }),
  ppsn: Type.String({
    minLength: 5,
    description:
      "Personal Public Service Number (required for identity recipients)",
  }),
  dateOfBirth: Type.String({
    format: "date",
    description:
      "Recipient's date of birth in YYYY-MM-DD format (required for identity recipients)",
  }),
});

export const RecipientUnionSchema = Type.Union([
  EmailRecipientSchema,
  IdentityRecipientSchema,
]);

export type RecipientUnion = Static<typeof RecipientUnionSchema>;

// Send message request schema (multipart expects files separately; this covers JSON fields)
export const SendMessageRequestSchema = Type.Object({
  subject: Type.String({
    minLength: 1,
    maxLength: 500,
    description: "Message subject line (1-500 characters)",
  }),
  plainTextBody: Type.String({
    minLength: 1,
    description: "Plain text version of the message body",
  }),
  htmlBody: Type.Optional(
    Type.String({
      description: "HTML version of the message body (optional)",
    }),
  ),
  securityLevel: Type.Enum(["public", "confidential"], {
    description:
      "Security classification of the message: 'public' to show the original message in the sent email, 'confidential' to show the content only after login in MessagingIE",
  }),
  language: Type.Enum(["en", "ga"], {
    description: "Message language: 'en' for English, 'ga' for Irish (Gaeilge)",
  }),
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
  messageId: Type.String({
    format: "uuid",
    description: "Unique identifier for the created message",
  }),
  recipientId: Type.String({
    format: "uuid",
    description: "Unique identifier for the message recipient profile",
  }),
  attachmentIds: Type.Array(
    Type.String({
      format: "uuid",
      description: "Unique identifier for an uploaded attachment",
    }),
    {
      description: "List of attachment identifiers associated with the message",
    },
  ),
  status: Type.Literal("created", {
    description: "Message creation status",
  }),
});

export type SendMessageResponse = Static<typeof SendMessageResponseSchema>;
