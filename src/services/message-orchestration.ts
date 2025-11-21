import type { MultipartFile } from "@fastify/multipart";
import type {
  Messaging,
  Profile,
  Upload,
} from "@ogcio/building-blocks-sdk/dist/types/index.js";
import type { FastifyBaseLogger } from "fastify";
import createError from "http-errors";
import { dispatchMessage } from "./messaging-service.js";
import { lookupRecipient, type RecipientInput } from "./profile-service.js";
import { cleanupFiles, shareFile, uploadFile } from "./upload-service.js";

export interface ExtractedUserData {
  userId: string;
  organizationId?: string;
  isM2MApplication: boolean;
  accessToken: string;
  signInMethod?: string;
}

export interface OrchestrationDeps {
  profileSdk: Profile;
  uploadSdk: Upload;
  messagingSdk: Messaging;
  userData: ExtractedUserData;
  logger: FastifyBaseLogger;
}

// Input shape aligned with contract (simplified mapping before schema layer integration)
export interface SendMessageInput {
  subject: string;
  plainTextBody: string;
  htmlBody?: string;
  securityLevel: "confidential" | "public";
  language: "en" | "ga";
  scheduledAt: string;
  recipient: RecipientInput;
  attachments?: MultipartFile[];
}

export interface SendMessageResult {
  messageId: string;
  recipientId: string;
  attachmentIds: string[];
}

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
  deps: OrchestrationDeps,
  messageData: SendMessageInput,
): Promise<SendMessageResult> {
  const { userData, logger, profileSdk, uploadSdk, messagingSdk } = deps;
  if (!userData.organizationId) {
    throw createError.Unauthorized("No organization ID found in user data");
  }
  const organizationId = userData.organizationId;
  const uploadIds: string[] = [];
  try {
    // Phase 1: Recipient lookup
    logger.info(
      {
        organizationId,
        recipientType: messageData.recipient.type,
        attachmentCount: messageData.attachments?.length || 0,
      },
      "Phase 1: Starting recipient lookup",
    );
    const recipientResult = await lookupRecipient(
      profileSdk,
      userData,
      messageData.recipient,
    );
    logger.info(
      { profileId: recipientResult.profileId, email: recipientResult.email },
      "Recipient lookup complete",
    );

    // Phase 2: Parallel uploads
    if (messageData.attachments?.length) {
      logger.info(
        { fileCount: messageData.attachments.length },
        "Phase 2: Uploading attachments",
      );
      const uploaded = await Promise.all(
        messageData.attachments.map((file) =>
          uploadFile(uploadSdk, logger, file),
        ),
      );
      uploadIds.push(...uploaded.map((u) => u.uploadId));
      logger.info(
        { uploadCount: uploadIds.length, uploadIds },
        "All attachments uploaded",
      );

      // Phase 3: Parallel shares
      logger.info(
        {
          uploadCount: uploadIds.length,
          recipientProfileId: recipientResult.profileId,
        },
        "Phase 3: Sharing attachments",
      );
      await Promise.all(
        uploadIds.map((id) =>
          shareFile(uploadSdk, logger, id, recipientResult.profileId),
        ),
      );
      logger.info({ shareCount: uploadIds.length }, "All attachments shared");
    }

    // Phase 4: Dispatch message
    logger.info(
      {
        recipientProfileId: recipientResult.profileId,
        attachmentCount: uploadIds.length,
      },
      "Phase 4: Dispatching message",
    );

    const dispatchResult = await dispatchMessage(messagingSdk, logger, {
      recipientUserId: recipientResult.profileId,
      subject: messageData.subject,
      plainText: messageData.plainTextBody,
      richText: messageData.htmlBody,
      security: messageData.securityLevel,
      language: messageData.language,
      scheduleAt: messageData.scheduledAt,
      attachments: uploadIds.length ? uploadIds : undefined,
    });

    logger.info(
      {
        messageId: dispatchResult.messageId,
        recipientId: recipientResult.profileId,
        attachmentIds: uploadIds,
      },
      "Message dispatched successfully",
    );

    return {
      messageId: dispatchResult.messageId,
      recipientId: recipientResult.profileId,
      attachmentIds: uploadIds,
    };
  } catch (error) {
    logger.error(
      { error, organizationId, uploadIds },
      "Orchestration failed; starting cleanup",
    );
    if (uploadIds.length) {
      const stats = await cleanupFiles(uploadSdk, logger, uploadIds);
      logger.info(
        {
          deleted: stats.deletedCount,
          attempted: stats.attemptedCount,
          successRate: `${(stats.successRate * 100).toFixed(1)}%`,
        },
        "Cleanup complete",
      );
    }
    throw error;
  }
}
