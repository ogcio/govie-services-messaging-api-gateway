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
  limit: string;
  offset: string;
  messageId?: string; // For US3: filter to single message
  recipientId?: string;
  subjectContains?: string;
  dateFrom?: string;
  dateTo?: string;
  recipientEmail?: string;
  status?: string;
}

/**
 * SDK returns data in its own format; we pass through unchanged
 * and wrap with GenericResponse in route handlers
 */
export type MessageEventRecord = Awaited<
  ReturnType<Messaging["getMessageEvents"]>
>["data"][number];

export interface MessageEventsPage {
  data: MessageEventRecord[];
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
      const payload = {
        preferredTransports: ["email"] as "email"[],
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
  messagingSdk: Messaging,
  logger: FastifyBaseLogger,
  filters: MessageEventsQuery,
): Promise<MessageEventsPage> {
  const params: Record<string, string> = {
    limit: filters.limit,
    offset: filters.offset,
  };
  if (filters.messageId) params.messageId = filters.messageId;
  if (filters.recipientId) params.recipientId = filters.recipientId;
  if (filters.subjectContains) params.search = filters.subjectContains;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.recipientEmail) params.recipientEmail = filters.recipientEmail;
  if (filters.status) params.status = filters.status;

  try {
    const res = await messagingSdk.getMessageEvents(params);
    if (res.error) {
      const detail = res.error.detail || "Failed to query message events";
      throw createError.BadGateway(detail);
    }

    return {
      data: res.data,
      totalCount: res.metadata?.totalCount || res.data.length,
    };
  } catch (err) {
    logger.error({ err }, "queryMessageEvents failed");
    throw err;
  }
}
