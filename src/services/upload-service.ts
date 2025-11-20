import type { MultipartFile } from "@fastify/multipart";
import type { FastifyRequest } from "fastify";

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
 * @param request - Fastify request with auth context
 * @param file - Multipart file stream
 * @returns Upload ID and metadata
 */
export async function uploadFile(
  _request: FastifyRequest,
  _file: MultipartFile,
): Promise<UploadResult> {
  // Placeholder - will be implemented in Phase 3 (T048)
  throw new Error("Not implemented");
}

/**
 * Share an uploaded file with a recipient
 *
 * @param request - Fastify request with auth context
 * @param uploadId - File upload ID
 * @param recipientProfileId - Recipient profile ID
 * @returns Share ID and metadata
 */
export async function shareFile(
  _request: FastifyRequest,
  _uploadId: string,
  _recipientProfileId: string,
): Promise<ShareResult> {
  // Placeholder - will be implemented in Phase 3 (T051)
  throw new Error("Not implemented");
}

/**
 * Delete uploaded files (best-effort cleanup on failure)
 *
 * @param request - Fastify request with auth context
 * @param uploadIds - Array of upload IDs to delete
 * @returns Cleanup statistics per FR-031, SC-008
 */
export async function cleanupFiles(
  _request: FastifyRequest,
  _uploadIds: string[],
): Promise<CleanupResult> {
  // Placeholder - will be implemented in Phase 3 (T058)
  throw new Error("Not implemented");
}
