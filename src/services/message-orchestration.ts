import type { MultipartFile } from "@fastify/multipart";
import type {
  Messaging,
  Profile,
  Upload,
} from "@ogcio/building-blocks-sdk/dist/types/index.js";
import { withSpan } from "@ogcio/o11y-sdk-node";
import type { FastifyBaseLogger } from "fastify";
import createError from "http-errors";
import { dispatchMessage } from "./messaging-service.js";
import { lookupRecipient, type RecipientInput } from "./profile-service.js";
import { cleanupFiles, shareFile, uploadFile } from "./upload-service.js";

export interface OrchestrationDeps {
  profileSdk: Profile;
  uploadSdk: Upload;
  messagingSdk: Messaging;
  organizationId: string;
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
  const { organizationId, logger, profileSdk, uploadSdk, messagingSdk } = deps;
  const uploadIds: string[] = [];

  if (!organizationId) {
    throw createError.Unauthorized("No organization ID found in user data");
  }

  try {
    // Phase 1: Recipient lookup
    const recipientResult = await withSpan({
      spanName: "profile_lookup_duration",
      fn: async (span) => {
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

        span.setAttributes({
          "messaging.organization_id": organizationId,
          "messaging.recipient_type": messageData.recipient.type,
          "messaging.attachment_count": messageData.attachments?.length || 0,
        });

        const result = await lookupRecipient(profileSdk, messageData.recipient);

        const phase1Duration = Date.now() - phase1Start;
        logger.info(
          {
            phase: "profile_lookup_end",
            durationMs: phase1Duration,
            profileId: result.profileId,
            email: result.email,
          },
          "profile lookup phase end",
        );

        span.setAttributes({
          "messaging.profile_id": result.profileId,
          "messaging.duration_ms": phase1Duration,
        });

        return result;
      },
    });

    // Phase 2: Upload attachments (parallel)
    if (messageData.attachments?.length) {
      const attachments = messageData.attachments;
      await withSpan({
        spanName: "upload_phase_duration",
        fn: async (span) => {
          const phase2Start = Date.now();
          logger.info(
            {
              phase: "upload_phase_start",
              fileCount: attachments.length,
            },
            "upload phase start",
          );

          span.setAttribute("messaging.file_count", attachments.length);

          const uploaded = await Promise.all(
            attachments.map((file) => uploadFile(uploadSdk, logger, file)),
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

          span.setAttributes({
            "messaging.upload_count": uploadIds.length,
            "messaging.duration_ms": phase2Duration,
          });
        },
      });

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
    const result = await withSpan({
      spanName: "message_send_duration",
      fn: async (span) => {
        const phase4Start = Date.now();
        logger.info(
          {
            phase: "dispatch_phase_start",
            recipientProfileId: recipientResult.profileId,
            attachmentCount: uploadIds.length,
          },
          "dispatch phase start",
        );

        span.setAttributes({
          "messaging.recipient_id": recipientResult.profileId,
          "messaging.attachment_count": uploadIds.length,
          "messaging.subject": messageData.subject,
          "messaging.security_level": messageData.securityLevel,
          "messaging.language": messageData.language,
        });

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

        const phase4Duration = Date.now() - phase4Start;
        logger.info(
          {
            phase: "dispatch_phase_end",
            durationMs: phase4Duration,
            messageId: dispatchResult.messageId,
            recipientId: recipientResult.profileId,
            attachmentIds: uploadIds,
          },
          "dispatch phase end",
        );

        span.setAttributes({
          "messaging.message_id": dispatchResult.messageId,
          "messaging.duration_ms": phase4Duration,
        });

        return {
          messageId: dispatchResult.messageId,
          recipientId: recipientResult.profileId,
          attachmentIds: uploadIds,
        };
      },
    });

    return result;
  } catch (error) {
    // Cleanup phase (only on failure)
    if (uploadIds.length) {
      await withSpan({
        spanName: "cleanup_duration",
        fn: async (span) => {
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

          span.setAttributes({
            "messaging.cleanup_file_count": uploadIds.length,
            "messaging.organization_id": organizationId,
          });

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

          span.setAttributes({
            "messaging.cleanup_deleted": stats.deletedCount,
            "messaging.cleanup_attempted": stats.attemptedCount,
            "messaging.cleanup_success_rate": stats.successRate,
            "messaging.duration_ms": cleanupDuration,
          });
        },
      });
    } else {
      logger.error(
        {
          phase: "cleanup_phase_start",
          organizationId,
          uploadIds,
          error,
        },
        "orchestration failed; no files to cleanup",
      );
    }
    throw error;
  }
}
