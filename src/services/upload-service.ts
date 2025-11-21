import type { MultipartFile } from "@fastify/multipart";
import type { Upload } from "@ogcio/building-blocks-sdk/dist/types/index.js";
import type { FastifyBaseLogger } from "fastify";
import createError from "http-errors";
import { executeWithRetry } from "../utils/retry.js";

/**
 * Upload Service
 *
 * Purpose: Upload files and share with recipients via upload-api
 * Spec: FR-005, FR-006, FR-030, FR-031, FR-036
 */

export interface UploadResult {
  uploadId: string;
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface ShareResult {
  shareId: string;
  uploadId: string;
  recipientProfileId: string;
  sharedAt: string;
}

export interface CleanupResult {
  deletedCount: number;
  attemptedCount: number;
  successRate: number;
}

/**
 * Upload a single file
 *
 * @param uploadSdk - Upload SDK client
 * @param logger - Logger instance
 * @param file - Multipart file stream
 * @returns Upload ID and metadata
 */
export async function uploadFile(
  uploadSdk: Upload,
  logger: FastifyBaseLogger,
  file: MultipartFile,
): Promise<UploadResult> {
  return executeWithRetry(
    async () => {
      const buffer = await file.toBuffer();
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;
      const fileObj = new File([arrayBuffer], file.filename, {
        type: file.mimetype,
      });

      const res = await uploadSdk.uploadFile(fileObj);
      if (res.error) {
        const status = (res.error as { statusCode?: number }).statusCode;
        const detail = res.error.detail || "Failed to upload file";
        if (status) {
          throw createError(status, detail);
        }
        throw createError.BadGateway(detail);
      }
      if (!res.data?.uploadId) {
        throw createError.BadGateway("Missing uploadId in response");
      }

      logger.info(
        { uploadId: res.data.uploadId, filename: file.filename },
        "File uploaded",
      );

      return {
        uploadId: res.data.uploadId,
        filename: file.filename,
        sizeBytes: buffer.length,
        uploadedAt: new Date().toISOString(),
      };
    },
    { logger },
  );
}

/**
 * Share an uploaded file with a recipient
 *
 * @param uploadSdk - Upload SDK client
 * @param logger - Logger instance
 * @param uploadId - File upload ID
 * @param recipientProfileId - Recipient profile ID
 * @returns Share ID and metadata
 */
export async function shareFile(
  uploadSdk: Upload,
  logger: FastifyBaseLogger,
  uploadId: string,
  recipientProfileId: string,
): Promise<ShareResult> {
  return executeWithRetry(
    async () => {
      const res = await uploadSdk.shareFile(uploadId, recipientProfileId);
      if (res.error) {
        const status = (res.error as { statusCode?: number }).statusCode;
        const detail = res.error.detail || "Failed to share file";
        if (status) {
          throw createError(status, detail);
        }
        throw createError.BadGateway(detail);
      }

      logger.info({ uploadId, recipientProfileId }, "File shared");

      return {
        shareId: res.data?.fileId || uploadId,
        uploadId,
        recipientProfileId,
        sharedAt: new Date().toISOString(),
      };
    },
    { logger },
  );
}

/**
 * Delete uploaded files (best-effort cleanup on failure)
 *
 * @param uploadSdk - Upload SDK client
 * @param logger - Logger instance
 * @param uploadIds - Array of upload IDs to delete
 * @returns Cleanup statistics per FR-031, SC-008
 */
export async function cleanupFiles(
  uploadSdk: Upload,
  logger: FastifyBaseLogger,
  uploadIds: string[],
): Promise<CleanupResult> {
  if (uploadIds.length === 0) {
    return { deletedCount: 0, attemptedCount: 0, successRate: 1.0 };
  }

  const deletionResults = await Promise.allSettled(
    uploadIds.map((id) => uploadSdk.scheduleFileDeletion(id)),
  );

  const deleted = deletionResults.filter((r) => {
    if (r.status !== "fulfilled") return false;
    const val: unknown = r.value;
    if (typeof val === "object" && val !== null && "error" in val) {
      return (val as { error?: unknown }).error == null;
    }
    return true;
  }).length;

  const successRate = deleted / uploadIds.length;

  logger.info(
    {
      deleted,
      attempted: uploadIds.length,
      successRate: `${(successRate * 100).toFixed(1)}%`,
      uploadIds,
    },
    "Cleanup complete",
  );

  return {
    deletedCount: deleted,
    attemptedCount: uploadIds.length,
    successRate,
  };
}
