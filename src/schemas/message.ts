import { type Static, Type } from "typebox";

export const RecipientTypes = {
  Email: "email",
  Identity: "identity",
} as const;

// Recipient variants (aligns with RecipientInput in profile-service)
const EmailRecipientSchema = Type.Object({
  type: Type.Literal(RecipientTypes.Email, {
    description: "Recipient type identifier for email-based recipients",
    examples: ["email"],
  }),
  firstName: Type.String({
    minLength: 1,
    description: "Recipient's first name",
    examples: ["John"],
  }),
  lastName: Type.String({
    minLength: 1,
    description: "Recipient's last name",
    examples: ["Doe"],
  }),
  email: Type.String({
    format: "email",
    description: "Recipient's email address",
    examples: ["john.doe@example.ie"],
  }),
  ppsn: Type.Optional(
    Type.String({
      description:
        "Personal Public Service Number (optional for email recipients)",
      examples: ["1234567T"],
    }),
  ),
  dateOfBirth: Type.Optional(
    Type.String({
      format: "date",
      description:
        "Recipient's date of birth in YYYY-MM-DD format (optional for email recipients)",
      examples: ["1985-03-15"],
    }),
  ),
});

const IdentityRecipientSchema = Type.Object({
  type: Type.Literal(RecipientTypes.Identity, {
    description: "Recipient type identifier for identity-based recipients",
    examples: ["identity"],
  }),
  ppsn: Type.String({
    minLength: 5,
    description:
      "Personal Public Service Number (required for identity recipients)",
    examples: ["1234567T"],
  }),
  dateOfBirth: Type.String({
    format: "date",
    description:
      "Recipient's date of birth in YYYY-MM-DD format (required for identity recipients)",
    examples: ["1985-03-15"],
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
    examples: ["Welcome to MessagingIE"],
  }),
  plainTextBody: Type.String({
    minLength: 1,
    description: "Plain text version of the message body",
    examples: ["Dear John Doe, Welcome to MessagingIE."],
  }),
  htmlBody: Type.Optional(
    Type.String({
      description: "HTML version of the message body (optional)",
      examples: [
        "<p>Dear <strong>John Doe</strong>,</p><p>Welcome to MessagingIE.</p>",
      ],
    }),
  ),
  securityLevel: Type.Enum(["public", "confidential"], {
    description:
      "Security classification of the message: 'public' to show the original message in the sent email, 'confidential' to show the content only after login in MessagingIE",
    examples: ["confidential"],
  }),
  language: Type.Enum(["en", "ga"], {
    description: "Message language: 'en' for English, 'ga' for Irish (Gaeilge)",
    examples: ["en"],
  }),
  scheduledAt: Type.String({
    format: "date-time",
    description: "ISO 8601 timestamp (Europe/Dublin TZ assumed)",
    examples: ["2025-11-25T14:30:00Z"],
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
    examples: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
  }),
  recipientId: Type.String({
    format: "uuid",
    description: "Unique identifier for the message recipient profile",
    examples: ["b2c3d4e5-f6a7-8901-bcde-f12345678901"],
  }),
  attachmentIds: Type.Array(
    Type.String({
      format: "uuid",
      description: "Unique identifier for an uploaded attachment",
      examples: ["c3d4e5f6-a7b8-9012-cdef-123456789012"],
    }),
    {
      description: "List of attachment identifiers associated with the message",
      examples: [
        [
          "c3d4e5f6-a7b8-9012-cdef-123456789012",
          "d4e5f6a7-b8c9-0123-def1-234567890123",
        ],
      ],
    },
  ),
  status: Type.Literal("created", {
    description: "Message creation status",
    examples: ["created"],
  }),
});

export type SendMessageResponse = Static<typeof SendMessageResponseSchema>;
