import type { MultipartFile } from "@fastify/multipart";
import type { FastifyRequest } from "fastify";
import type {
  SendMessageRequest,
  SendMessageResponse,
} from "../schemas/message.js";

/**
 * Message Orchestration Service
 *
 * Purpose: Coordinate profile lookup, file upload, file sharing, and message dispatch
 * with atomic failure semantics per FR-030/FR-031
 *
 * Spec: FR-001 through FR-039, SC-007, SC-008
 */

/**
 * Orchestrate complete message send workflow
 *
 * Flow (with atomic failure):
 * 1. Validate request (FR-007, FR-008, FR-009)
 * 2. Resolve PPSN identifiers to profile IDs (FR-001)
 *    - Abort on any recipient not found (FR-004, FR-035)
 * 3. Upload attachments if present (FR-005)
 *    - Abort on any upload failure (FR-030)
 * 4. Share attachments with all recipients (FR-006)
 *    - Abort on any share failure (FR-030)
 * 5. Dispatch message (FR-002, FR-003)
 * 6. On failure at any step:
 *    - Delete all uploaded files (FR-031)
 *    - Log cleanup metrics (SC-008)
 *    - Return error
 *
 * @param request - Fastify request with auth and organizationId
 * @param messageData - Validated message request
 * @param attachments - Optional file uploads
 * @returns Message ID and status
 */
export async function sendMessage(
  _request: FastifyRequest,
  _messageData: SendMessageRequest,
  _attachments?: MultipartFile[],
): Promise<SendMessageResponse> {
  // Placeholder - will be implemented in Phase 4 (T073)
  throw new Error("Not implemented");
}
