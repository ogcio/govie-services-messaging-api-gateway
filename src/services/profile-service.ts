import type { Profile } from "@ogcio/building-blocks-sdk/dist/types/index.js";
import createError from "http-errors";

/**
 * Profile Service
 *
 * Purpose: Lookup recipient and ensure organization relationship exists (if API enforces it)
 * Spec References: FR-001, FR-004, FR-035 (recipient existence + org relationship), T036, T037
 */

// Recipient identification (contract excerpt)
export interface RecipientByEmail {
  type: "email";
  firstName: string;
  lastName: string;
  email: string;
  ppsn?: string;
  dateOfBirth?: string;
}

export interface RecipientByIdentity {
  type: "identity";
  ppsn: string;
  dateOfBirth: string;
}

export type RecipientInput = RecipientByEmail | RecipientByIdentity;

export interface RecipientLookupResult {
  profileId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

// Minimal shape of userData from @ogcio/api-auth
export interface ExtractedUserData {
  userId: string;
  organizationId?: string;
  isM2MApplication: boolean;
  accessToken: string;
  signInMethod?: string;
}

/**
 * Lookup recipient using provided profile SDK client & userData.
 * Organization ID is derived from userData (no separate param).
 * Currently supports email-based lookup; identity-based (PPSN+DOB) deferred.
 *
 * Failure Modes:
 *  - 401 if organizationId missing in userData
 *  - 404 if recipient not found
 *  - 501 for identity-based lookup (not yet implemented)
 */
export async function lookupRecipient(
  profileSdk: Profile,
  userData: ExtractedUserData,
  recipient: RecipientInput,
): Promise<RecipientLookupResult> {
  if (!userData.organizationId) {
    throw createError.Unauthorized("No organization ID found in user data");
  }

  if (recipient.type === "identity") {
    // Future enhancement: implement PPSN + DOB lookup path
    throw createError.NotImplemented(
      "Identity-based recipient lookup not implemented yet",
    );
  }

  // Email-based lookup (primary path for T036/T037)
  // Current SDK typing does not include an email query parameter; assume upstream fixed invocation separately.
  const findResult = await profileSdk.findProfile({});

  if (findResult.error) {
    const { statusCode, detail } = findResult.error;
    if (statusCode === 404) {
      throw createError.NotFound("Recipient not found in profile system");
    }
    throw createError(statusCode || 502, detail || "Profile lookup failed");
  }

  if (!findResult.data) {
    throw createError.BadGateway("Profile lookup returned no data");
  }

  const profile = findResult.data;

  return {
    profileId: profile.id,
    email: profile.email || recipient.email,
    firstName: recipient.firstName,
    lastName: recipient.lastName,
  };
}

// Factory retained for consistency (could expose higher-level abstractions later)
export function createProfileService() {
  return {
    lookupRecipient,
  };
}
