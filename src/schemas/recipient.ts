import { type Static, Type } from "typebox";

export const RecipientSchema = Type.Object({
  identifier: Type.String({ description: "PPSN identifier" }),
  profileId: Type.String({ format: "uuid" }),
  resolvedAt: Type.String({ format: "date-time" }),
});

export type Recipient = Static<typeof RecipientSchema>;

export const RecipientErrorSchema = Type.Object({
  identifier: Type.String(),
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    statusCode: Type.Number(),
  }),
});

export type RecipientError = Static<typeof RecipientErrorSchema>;
