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

export interface ProfileLookupResponse {
  resolved: ProfileLookupResult[];
  errors: ProfileLookupError[];
}

export interface ProfileService {
  lookupProfiles(
    request: FastifyRequest,
    identifiers: string[],
  ): Promise<ProfileLookupResponse>;
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
): Promise<ProfileLookupResponse> {
  // Base stub (Phase 2): interface layer only
  throw new Error("Not implemented");
}

export function createProfileService(): ProfileService {
  return {
    lookupProfiles,
  };
}
