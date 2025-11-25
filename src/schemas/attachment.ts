import { type Static, Type } from "typebox";

export const AttachmentMetadataSchema = Type.Object({
  filename: Type.String({ minLength: 1 }),
  mimeType: Type.String(),
  sizeBytes: Type.Number({ minimum: 1 }),
});

export type AttachmentMetadata = Static<typeof AttachmentMetadataSchema>;

export const AttachmentUploadResultSchema = Type.Object({
  uploadId: Type.String({ format: "uuid" }),
  filename: Type.String(),
  sizeBytes: Type.Number(),
  uploadedAt: Type.String({ format: "date-time" }),
});

export type AttachmentUploadResult = Static<
  typeof AttachmentUploadResultSchema
>;

export const AttachmentShareResultSchema = Type.Object({
  shareId: Type.String({ format: "uuid" }),
  uploadId: Type.String({ format: "uuid" }),
  recipientProfileId: Type.String({ format: "uuid" }),
  sharedAt: Type.String({ format: "date-time" }),
});

export type AttachmentShareResult = Static<typeof AttachmentShareResultSchema>;
