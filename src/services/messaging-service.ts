import type { FastifyRequest } from "fastify";

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
  organizationId: string;
  subject: string;
  plainTextContent: string;
  richTextContent?: string;
  recipientProfileIds: string[];
  attachmentUploadIds?: string[];
  scheduledAt?: string;
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

export interface MessagingService {
  dispatchMessage(
    request: FastifyRequest,
    messageData: MessageDispatchRequest,
  ): Promise<MessageDispatchResult>;
  /**
   * Query message events - delegates to SDK getMessageEvents
   * US2: without messageId → latest events for all messages
   * US3: with messageId → all events for specific message
   */
  queryMessageEvents(
    request: FastifyRequest,
    filters: MessageEventsQuery,
  ): Promise<MessageEventsPage>;
}

/**
 * Dispatch a message to multiple recipients
 *
 * @param request - Fastify request with auth context
 * @param messageData - Message content and recipients
 * @returns Message ID and timestamp
 */
export async function dispatchMessage(
  _request: FastifyRequest,
  _messageData: MessageDispatchRequest,
): Promise<MessageDispatchResult> {
  // Placeholder - will be implemented in Phase 3 (T041)
  throw new Error("Not implemented");
}

/**
 * Query message events for organization
 *
 * Delegates to SDK messagingClient.getMessageEvents(params)
 * - US2 (latest events): Pass filters without messageId
 * - US3 (message history): Pass { messageId, limit, offset }
 *
 * @param request - Fastify request with auth context
 * @param filters - Query filters (limit, offset, messageId?, etc.)
 * @returns SDK response unchanged (data[], totalCount)
 */
export async function queryMessageEvents(
  _request: FastifyRequest,
  _filters: MessageEventsQuery,
): Promise<MessageEventsPage> {
  // Will be implemented in Phase 4 (T064 for US2, T079 for US3)
  // Both use same SDK method: messagingClient.getMessageEvents(filters)
  throw new Error("Not implemented");
}

export function createMessagingService(): MessagingService {
  return {
    dispatchMessage,
    queryMessageEvents,
  };
}
