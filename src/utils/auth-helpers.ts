import type { FastifyReply, FastifyRequest } from "fastify";
import { sendForbidden, sendUnauthorized } from "./error-responses.js";

/**
 * Validates that an auth token exists in request.userData.
 * If missing, sends 401 response and returns null.
 * If present, returns the token.
 *
 * Usage:
 *   const token = requireAuthToken(request, reply);
 *   if (!token) return; // 401 already sent
 */
export function requireAuthToken(
  request: FastifyRequest,
  reply: FastifyReply,
): string | null {
  const token = request.userData?.accessToken;
  if (!token) {
    sendUnauthorized(reply, request.id);
    return null;
  }
  return token;
}

export function requirePublicServant(
  request: FastifyRequest,
  reply: FastifyReply,
): { token: string; organizationId: string } | null {
  const token = request.userData?.accessToken;
  if (!token) {
    sendUnauthorized(reply, request.id);
    return null;
  }
  if (!request.userData?.organizationId) {
    sendForbidden(reply, request.id);
    return null;
  }

  return { token, organizationId: request.userData.organizationId };
}
