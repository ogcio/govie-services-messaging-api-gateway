import type { FastifyReply, FastifyRequest } from "fastify";
import { sendForbidden, sendUnauthorized } from "./error-responses.js";

/**
 * Validates that an auth token exists in request.userData.
 * If missing, sends 401 response and returns null.
 * If present, check if organizationId is set, if not, sends 403 response and returns null.
 *
 * Usage:
 *   const {auth} = requirePublicServant(request, reply);
 *   if (!auth) return; // 401 or 403 already sent
 */
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
