import type { FastifyRequest } from "fastify";

/**
 * Messaging Service
 *
 * Purpose: Dispatch messages via messaging-api
 * Spec: FR-002, FR-003, FR-033
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
  recipientId?: string;
  subjectContains?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface MessageEventsPage<T = unknown> {
  data: T[];
  totalCount: number;
}

export interface MessageHistoryEntry {
  eventType: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface MessageHistoryResult {
  messageId: string;
  subject: string;
  events: MessageHistoryEntry[];
}

export interface MessagingService {
  dispatchMessage(
    request: FastifyRequest,
    messageData: MessageDispatchRequest,
  ): Promise<MessageDispatchResult>;
  queryMessageEvents(
    request: FastifyRequest,
    filters: MessageEventsQuery,
  ): Promise<MessageEventsPage>;
  getMessageHistory(
    request: FastifyRequest,
    messageId: string,
  ): Promise<MessageHistoryResult>;
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
  // Placeholder - will be implemented in Phase 3 (T054)
  throw new Error("Not implemented");
}

/**
 * Query message events for organization
 *
 * @param request - Fastify request with auth context
 * @param filters - Query filters (limit, offset, etc.)
 * @returns Paginated message events
 */
export async function queryMessageEvents(
  _request: FastifyRequest,
  _filters: MessageEventsQuery,
): Promise<MessageEventsPage> {
  // Base stub (Phase 2): interface only
  throw new Error("Not implemented");
}

/**
 * Get event history for a specific message
 *
 * @param request - Fastify request with auth context
 * @param messageId - Message UUID
 * @returns Complete event history
 */
export async function getMessageHistory(
  _request: FastifyRequest,
  _messageId: string,
): Promise<MessageHistoryResult> {
  // Base stub (Phase 2): interface only
  throw new Error("Not implemented");
}

export function createMessagingService(): MessagingService {
  return {
    dispatchMessage,
    queryMessageEvents,
    getMessageHistory,
  };
}
