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
 * Coordinates profile lookup, file upload/share, and dispatch with
 * atomic failure semantics (FR-030/FR-031).
 */
export async function sendMessage(
  deps: OrchestrationDeps,
  messageData: SendMessageInput,
): Promise<SendMessageResult> {
  const { userData, logger, profileSdk, uploadSdk, messagingSdk } = deps;
  const uploadIds: string[] = [];

  if (!userData.organizationId) {
    throw createError.Unauthorized("No organization ID found in user data");
  }
  const organizationId = userData.organizationId;

  try {
    // Phase 1: Recipient lookup
    const phase1Start = Date.now();
    logger.info(
      {
        phase: "profile_lookup_start",
        organizationId,
        recipientType: messageData.recipient.type,
        attachmentCount: messageData.attachments?.length || 0,
      },
      "profile lookup phase start",
    );
    const recipientResult = await lookupRecipient(
      profileSdk,
      userData,
      messageData.recipient,
    );
    const phase1Duration = Date.now() - phase1Start;
    logger.info(
      {
        phase: "profile_lookup_end",
        durationMs: phase1Duration,
        profileId: recipientResult.profileId,
        email: recipientResult.email,
      },
      "profile lookup phase end",
    );

    // Phase 2: Upload attachments (parallel)
    if (messageData.attachments?.length) {
      const phase2Start = Date.now();
      logger.info(
        {
          phase: "upload_phase_start",
          fileCount: messageData.attachments.length,
        },
        "upload phase start",
      );
      const uploaded = await Promise.all(
        messageData.attachments.map((file) =>
          uploadFile(uploadSdk, logger, file),
        ),
      );
      uploadIds.push(...uploaded.map((u) => u.uploadId));
      const phase2Duration = Date.now() - phase2Start;
      logger.info(
        {
          phase: "upload_phase_end",
          durationMs: phase2Duration,
          uploadCount: uploadIds.length,
          uploadIds,
        },
        "upload phase end",
      );

      // Phase 3: Share attachments (parallel)
      const phase3Start = Date.now();
      logger.info(
        {
          phase: "share_phase_start",
          uploadCount: uploadIds.length,
          recipientProfileId: recipientResult.profileId,
        },
        "share phase start",
      );
      await Promise.all(
        uploadIds.map((id) =>
          shareFile(uploadSdk, logger, id, recipientResult.profileId),
        ),
      );
      logger.info(
        {
          phase: "share_phase_end",
          durationMs: Date.now() - phase3Start,
          shareCount: uploadIds.length,
        },
        "share phase end",
      );
    }

    // Phase 4: Dispatch message
    const phase4Start = Date.now();
    logger.info(
      {
        phase: "dispatch_phase_start",
        recipientProfileId: recipientResult.profileId,
        attachmentCount: uploadIds.length,
      },
      "dispatch phase start",
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
        phase: "dispatch_phase_end",
        durationMs: Date.now() - phase4Start,
        messageId: dispatchResult.messageId,
        recipientId: recipientResult.profileId,
        attachmentIds: uploadIds,
      },
      "dispatch phase end",
    );

    return {
      messageId: dispatchResult.messageId,
      recipientId: recipientResult.profileId,
      attachmentIds: uploadIds,
    };
  } catch (error) {
    // Cleanup phase (only on failure)
    const cleanupStart = Date.now();
    logger.error(
      {
        phase: "cleanup_phase_start",
        organizationId,
        uploadIds,
        error,
      },
      "orchestration failed; cleanup phase start",
    );
    if (uploadIds.length) {
      const stats = await cleanupFiles(uploadSdk, logger, uploadIds);
      const cleanupDuration = Date.now() - cleanupStart;
      logger.info(
        {
          phase: "cleanup_phase_end",
          durationMs: cleanupDuration,
          deleted: stats.deletedCount,
          attempted: stats.attemptedCount,
          successRate: `${(stats.successRate * 100).toFixed(1)}%`,
        },
        "cleanup phase end",
      );
    }
    throw error;
  }
}
