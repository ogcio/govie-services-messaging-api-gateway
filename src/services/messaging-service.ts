import type { Messaging } from "@ogcio/building-blocks-sdk/dist/types/index.js";
import type { FastifyBaseLogger } from "fastify";
import createError from "http-errors";
import { executeWithRetry } from "../utils/retry.js";

/**
 * Messaging Service
 *
 * Purpose: Dispatch messages and query events via messaging-api
 * Spec: FR-002, FR-003, FR-033, US2, US3
 *
 * Note: Both queryMessageEvents (US2) and getMessageHistory (US3) use the same
 * SDK method `messagingClient.getMessageEvents()`. The difference is:
 * - US2: calls without messageId param → returns latest events for all messages
 * - US3: calls with messageId param → returns all events for that specific message
 */

export interface MessageDispatchRequest {
  recipientUserId: string;
  subject: string;
  plainText: string;
  richText?: string;
  security: "confidential" | "public";
  language: "en" | "ga";
  attachments?: string[];
  scheduleAt: string;
}

export interface MessageDispatchResult {
  messageId: string;
  dispatchedAt: string;
}

export interface MessageEventsQuery {
  limit: number;
  offset: number;
  messageId?: string; // For US3: filter to single message
  recipientId?: string;
  subjectContains?: string;
  dateFrom?: string;
  dateTo?: string;
  recipientEmail?: string;
}

/**
 * SDK returns data in its own format; we pass through unchanged
 * and wrap with GenericResponse in route handlers
 */
export interface MessageEventsPage<T = unknown> {
  data: T[];
  totalCount: number;
}

/**
 * Dispatch a message to recipient
 *
 * @param messagingSdk - Messaging SDK client
 * @param logger - Logger instance
 * @param messageData - Message content and recipient
 * @returns Message ID and timestamp
 */
export async function dispatchMessage(
  messagingSdk: Messaging,
  logger: FastifyBaseLogger,
  messageData: MessageDispatchRequest,
): Promise<MessageDispatchResult> {
  return executeWithRetry(
    async () => {
      const payload: {
        preferredTransports: ("email" | "lifeEvent")[];
        recipientUserId: string;
        security: "confidential" | "public";
        scheduleAt: string;
        message: {
          threadName?: string;
          subject: string;
          plainText: string;
          richText?: string;
          language: "en" | "ga";
          excerpt?: string;
        };
        attachments?: string[];
      } = {
        preferredTransports: ["email"],
        recipientUserId: messageData.recipientUserId,
        security: messageData.security,
        scheduleAt: messageData.scheduleAt,
        message: {
          threadName: messageData.subject,
          subject: messageData.subject,
          plainText: messageData.plainText,
          richText: messageData.richText,
          language: messageData.language,
        },
        attachments: messageData.attachments,
      };

      const res = await messagingSdk.send(payload);
      if (res.error || !res.data?.id) {
        const detail = res.error?.detail || "Failed to dispatch message";
        throw createError.BadGateway(detail);
      }

      logger.info({ messageId: res.data.id }, "Message dispatched");

      return {
        messageId: res.data.id,
        dispatchedAt: new Date().toISOString(),
      };
    },
    { logger },
  );
}

/**
 * Query message events for organization
 *
 * Delegates to SDK messagingClient.getMessageEvents(params)
 * - US2 (latest events): Pass filters without messageId
 * - US3 (message history): Pass { messageId, limit, offset }
 *
 * @param messagingSdk - Messaging SDK client
 * @param logger - Logger instance
 * @param filters - Query filters (limit, offset, messageId?, etc.)
 * @returns SDK response unchanged (data[], totalCount)
 */
export async function queryMessageEvents(
  _messagingSdk: Messaging,
  _logger: FastifyBaseLogger,
  _filters: MessageEventsQuery,
): Promise<MessageEventsPage> {
  // Will be implemented in Phase 4 (T064 for US2, T079 for US3)
  // Both use same SDK method: messagingClient.getMessageEvents(filters)
  throw new Error("Not implemented");
}
