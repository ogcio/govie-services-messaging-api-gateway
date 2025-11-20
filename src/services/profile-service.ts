import type { FastifyRequest } from "fastify";

/**
 * Profile Service
 *
 * Purpose: Resolve PPSN identifiers to profile IDs via profile-api
 * Spec: FR-001, FR-004, FR-035
 */

export interface ProfileLookupResult {
  profileId: string;
  identifier: string;
  resolvedAt: string;
}

export interface ProfileLookupError {
  identifier: string;
  statusCode: number;
  code: string;
  message: string;
}

/**
 * Resolve multiple PPSN identifiers to profile IDs
 *
 * @param request - Fastify request with auth context
 * @param identifiers - Array of PPSN identifiers
 * @returns Resolved profiles and errors
 */
export async function lookupProfiles(
  _request: FastifyRequest,
  _identifiers: string[],
): Promise<{
  resolved: ProfileLookupResult[];
  errors: ProfileLookupError[];
}> {
  // Placeholder - will be implemented in Phase 3 (T046)
  throw new Error("Not implemented");
}
