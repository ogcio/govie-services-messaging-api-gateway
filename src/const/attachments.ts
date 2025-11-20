/**
 * Attachment limits
 *
 * Per FR-036, the gateway delegates enforcement to upload-api,
 * but defines these constants for documentation and client guidance.
 */

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
export const TOTAL_ATTACHMENTS_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
