import type { FastifyReply } from "fastify";

/**
 * Sends a standardized 401 Unauthorized response.
 *
 * @param reply - Fastify reply object
 * @param requestId - Request ID for tracing
 * @param detail - Optional custom error detail message
 */
export function sendUnauthorized(
  reply: FastifyReply,
  requestId: string,
  detail = "No authorization header found",
): void {
  reply.status(401).send({
    code: "UNAUTHORIZED",
    detail,
    requestId,
    name: "UnauthorizedError",
    statusCode: 401,
  });
}

/**
 * Sends a standardized 403 Forbidden response.
 *
 * @param reply - Fastify reply object
 * @param requestId - Request ID for tracing
 * @param detail - Optional custom error detail message
 */
export function sendForbidden(
  reply: FastifyReply,
  requestId: string,
  detail = "Organization missing or forbidden",
): void {
  reply.status(403).send({
    code: "ORG_MISSING",
    detail,
    requestId,
    name: "ForbiddenError",
    statusCode: 403,
  });
}

/**
 * Sends a standardized 404 Not Found response.
 *
 * @param reply - Fastify reply object
 * @param requestId - Request ID for tracing
 * @param detail - Error detail message describing what was not found
 */
export function sendNotFound(
  reply: FastifyReply,
  requestId: string,
  detail: string,
): void {
  reply.status(404).send({
    code: "NOT_FOUND",
    detail,
    requestId,
    name: "NotFoundError",
    statusCode: 404,
  });
}

/**
 * Checks if an error indicates a forbidden/organization access issue.
 * Used for consistent error classification across routes.
 *
 * @param err - Error object to check
 * @returns true if error indicates forbidden/org access issue
 */
export function isForbiddenError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;

  const statusCode = (err as { statusCode?: number }).statusCode;
  const code = (err as { code?: string }).code;

  return statusCode === 403 || code === "ORG_MISSING";
}
