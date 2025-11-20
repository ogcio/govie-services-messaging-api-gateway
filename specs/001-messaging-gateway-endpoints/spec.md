# Feature Specification: Messaging Gateway Endpoints

**Feature Branch**: `001-messaging-gateway-endpoints`  
**Created**: 2025-11-20  
**Status**: Draft (will move to Ready after remediation)  
**Input**: User description: "I want to build an API Gateway that makes public servant users (ones that have organizationId set in their user data) able to use, from a single entry point, our downstream APIs, profile-api, messaging-api, upload-api. It needs to communicate with them using our building blocks sdk. It must be secure, but must delegate the permissions check to the downstream APIs, it just has to ensure users are logged as public servants in to perform actions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send Message with Attachments (Priority: P1)

A public servant needs to send a message to a citizen recipient, optionally including file attachments. The system verifies the recipient exists in the profile system and has a relationship with the sender's organization, then sends the message through the messaging service and shares any attachments with the recipient.

**Why this priority**: This is the core value proposition - enabling public servants to communicate with citizens. Without this capability, the gateway provides no value.

**Independent Test**: Can be fully tested by authenticating as a public servant, providing recipient details and message content, uploading attachments, and verifying the message ID and attachment IDs are returned. Delivers immediate value by enabling one-way communication.

**Acceptance Scenarios**:

1. **Given** a public servant is authenticated with an organizationId, **When** they send a message with subject, body, and recipient email to an existing citizen with an org relationship, **Then** the message is sent and a response containing messageId and recipientId is returned with HTTP 201
2. **Given** a public servant sends a message with file attachments, **When** the request includes multipart form data with files, **Then** each attachment is uploaded, shared with the recipient, and attachment IDs are returned
3. **Given** a public servant sends a message to a recipient identified by PPSN and date of birth only, **When** the recipient exists in the profile system with an org relationship, **Then** the message is sent successfully
4. **Given** a public servant sends a message with scheduled_at in the past, **When** the message is processed, **Then** it is sent immediately
5. **Given** a public servant sends a message with scheduled_at in the future, **When** the message is processed, **Then** it is scheduled for that future time
6. **Given** a public servant sends a message to a recipient who exists but has no relationship with their organization, **When** the request includes recipient details (name, email), **Then** the relationship is created using the provided data and the message is sent with HTTP 201
7. **Given** a public servant sends a message to a non-existent recipient, **When** the profile lookup fails, **Then** HTTP 404 is returned with an error message
8. **Given** an unauthenticated user attempts to send a message, **When** the request is made, **Then** HTTP 401 is returned
9. **Given** an authenticated user without organizationId attempts to send a message, **When** the request is made, **Then** HTTP 401 is returned

---

### User Story 2 - Query Latest Message Events (Priority: P2)

A public servant needs to view the latest event status for multiple messages they have sent, with the ability to filter by recipient, subject, date range, or recipient email. Results are paginated for efficient browsing of large result sets.

**Why this priority**: Monitoring message delivery status is essential for public servants to know if their communications reached citizens, but it depends on messages being sent first (P1).

**Independent Test**: Can be tested independently by creating test messages, then querying with various filters (recipient ID, subject, date range, email) and verifying paginated results contain the latest event for each message. Delivers value by providing visibility into message status.

**Acceptance Scenarios**:

1. **Given** a public servant has sent multiple messages, **When** they request latest events without filters, **Then** a paginated list of latest events for all their messages is returned with HTTP 200
2. **Given** a public servant filters by recipient ID, **When** they request latest events, **Then** only events for messages to that recipient are returned
3. **Given** a public servant filters by subject substring, **When** they request latest events, **Then** only events for messages matching that subject are returned
4. **Given** a public servant filters by start and end date, **When** they request latest events, **Then** only events for messages within that date range are returned
5. **Given** a public servant filters by recipient email, **When** they request latest events, **Then** only events for messages to that email address are returned
6. **Given** query results exceed one page, **When** the response is returned, **Then** it includes metadata with totalCount, and links to previous/next/first/last pages
7. **Given** an unauthenticated user queries message events, **When** the request is made, **Then** HTTP 401 is returned
8. **Given** an authenticated user without organizationId queries message events, **When** the request is made, **Then** HTTP 401 is returned

---

### User Story 3 - Get Message Event History (Priority: P3)

A public servant needs to view the complete event history for a specific message to understand its full lifecycle (sent, delivered, read, failed, etc.).

**Why this priority**: Detailed event history provides diagnostic value and full transparency, but is less critical than sending messages (P1) or getting latest status (P2).

**Independent Test**: Can be tested independently by creating a test message with a known ID, then retrieving all events for that message and verifying the complete event sequence is returned. Delivers value by enabling troubleshooting and audit trails.

**Acceptance Scenarios**:

1. **Given** a public servant has sent a message with a known message ID, **When** they request events for that message, **Then** all events for that message are returned in chronological order with HTTP 200
2. **Given** a message ID that does not exist, **When** events are requested, **Then** HTTP 404 is returned
3. **Given** a message ID from another organization, **When** events are requested, **Then** the messaging SDK returns no results (SDK handles org filtering)
4. **Given** an unauthenticated user requests message events, **When** the request is made, **Then** HTTP 401 is returned
5. **Given** an authenticated user without organizationId requests message events, **When** the request is made, **Then** HTTP 401 is returned

---

### Edge Cases

- What happens when a recipient has multiple profiles with the same PPSN but different organizations?
- How does the system handle extremely large attachments that exceed upload limits?
- What happens when the messaging-api or upload-api is temporarily unavailable during message sending?
- How are partial failures handled (e.g., message sent but attachment upload fails)?
- What happens when scheduled_at is far in the future (e.g., years ahead)?
- How does pagination behave when new messages are sent while a user is browsing pages?
- What happens when attachment sharing fails but the message was already sent?

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization

- **FR-001**: System MUST verify users are authenticated before processing any request
- **FR-002**: System MUST verify authenticated users have an organizationId in their userData
- **FR-003**: System MUST return HTTP 401 for unauthenticated requests
- **FR-004**: System MUST return HTTP 401 for authenticated users without organizationId
- **FR-005**: System MUST delegate fine-grained permission checks to downstream APIs

#### Message Sending

- **FR-006**: System MUST accept messages with subject, plain text body, optional HTML body, security level (confidential/public), and language (en/ga)
- **FR-007**: System MUST accept recipient identification by either email+name (with optional PPSN and DOB) or PPSN+DOB only
- **FR-008**: System MUST accept a scheduled_at timestamp for message scheduling
- **FR-009**: System MUST send messages scheduled in the past immediately
- **FR-010**: System MUST verify recipient exists in the profile system before sending
- **FR-011**: System MUST verify recipient has a relationship with the sender's organization
- **FR-012**: System MUST create organization relationship using provided recipient data when recipient exists but has no relationship
- **FR-013**: System MUST return HTTP 404 when recipient does not exist in the profile system
- **FR-014**: System MUST accept file attachments via multipart/form-data
- **FR-015**: System MUST upload each attachment using the upload-api
- **FR-016**: System MUST share uploaded attachments with the recipient
- **FR-017**: System MUST return HTTP 201 on successful message creation with messageId, recipientId, and attachmentIds
- **FR-018**: System MUST map each failure category to explicit HTTP status codes documented in the Error Mapping Matrix and MUST NOT emit undocumented status codes

#### Message Event Querying

- **FR-019**: System MUST support filtering latest message events by recipientId, subject, startDate, endDate, and recipientEmail
- **FR-020**: System MUST return paginated results for message event lists
- **FR-021**: System MUST include metadata in list responses showing totalCount
- **FR-022**: System MUST include pagination links (previous, next, first, last) in list responses
- **FR-023**: System MUST return HTTP 200 for successful queries

#### Message Event History

- **FR-024**: System MUST retrieve all events for a given message ID
- **FR-025**: System MUST return HTTP 404 when message ID does not exist
- **FR-026**: System MUST return HTTP 200 with event list for valid message IDs

#### Response Format

- **FR-027**: All successful responses MUST include a "data" object containing the payload
- **FR-028**: List endpoints MUST include a "metadata" object with totalCount and pagination links
- **FR-029**: Error responses MUST use standard HTTP status codes with descriptive error messages

### Key Entities

- **Message**: Represents a communication from a public servant to a citizen. Contains subject, body (plain and/or HTML), security level, language, scheduled time, sender organization, and recipient reference.
- **Recipient**: Represents a citizen receiving messages. Identified by email and name, or PPSN and date of birth. Must have a profile in the profile-api and a relationship with the sender's organization.
- **Attachment**: Represents a file attached to a message. Uploaded to upload-api and shared with the recipient.
- **Message Event**: Represents a status change in a message lifecycle (sent, delivered, read, failed, etc.). Multiple events can exist for a single message.
- **Organization Relationship**: Links a recipient (citizen) to an organization, enabling that organization's public servants to communicate with them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001a**: Typical send-message requests without attachments (or ≤2 small attachments <250KB each) complete with p95 latency <200ms and p99 <400ms under ≤50 concurrent requests.
- **SC-001b**: Attachment-heavy send-message requests (≤5 attachments totaling ≤25MB) complete end-to-end in <5s p95 and <7s p99 under ≤50 concurrent requests.
- **SC-002**: Message event queries return results in under 2 seconds for result sets up to 1000 messages
- **SC-003**: System maintains 99.9% uptime during business hours (09:00–17:00 Europe/Dublin timezone) (public holiday handling deferred)
- **SC-004**: All API responses comply with defined HTTP status codes and response structure
- **SC-005**: 100% of authenticated requests from users without organizationId are rejected with HTTP 401
- **SC-006**: System successfully handles message sending when recipient exists but lacks organization relationship (creates relationship automatically)
- **SC-007**: Message sending operations complete end-to-end (profile lookup, relationship check/creation, upload attachments, send message) and if any attachment upload or share fails BEFORE message dispatch, the gateway performs best-effort cleanup (delete uploaded attachments) and DOES NOT send the message (atomic failure)
- **SC-008**: In ≥95% of atomic attachment failure cases (upload/share failure before dispatch) all previously uploaded attachments are successfully deleted (rolling 30-day window), with structured logging of cleanup outcomes for observability.

## Assumptions

- The Building Blocks SDK provides methods for communicating with profile-api, messaging-api, and upload-api
- The messaging SDK automatically filters all queries by the authenticated user's organizationId, ensuring org-level data isolation
- Existing authentication middleware populates request.userData with user information including organizationId
- The gateway-auth plugin (gatewayCheckPermissions) is already implemented for verifying organizationId
- Downstream APIs handle their own permission validation beyond organization membership
- PPSN (Personal Public Service Number) is a unique identifier in the Irish public service system
- Date of birth format is standardized across all systems
- Pagination uses standard limit/offset or cursor-based pagination
- Attachment file size limits are enforced by the upload-api, not the gateway
- Message scheduling is handled by the messaging-api, not the gateway

## Clarifications

### Session 2025-11-20

- Q: How should partial failures (e.g., one attachment upload/share fails) be handled during send-message orchestration? → A: Fail whole request; perform best-effort cleanup of any successfully uploaded attachments; do not send the message.
- Q: What retry strategy should the gateway apply to transient downstream HTTP errors? → A: Exponential backoff (base 100ms, full jitter) with up to 3 total attempts only for transient errors (HTTP 502, 503, 504, network timeouts). No retries MUST be performed for client/auth errors (all 4xx including 400, 401, 403, 404) because they are not recoverable.
- Q: What maximum future horizon should be enforced for `scheduled_at`? → A: No explicit limit enforced by gateway; validation and rejection of overly distant scheduling delegated entirely to messaging-api.
- Q: What is the authoritative source for pagination `totalCount` values? → A: Downstream messaging-api responses; gateway MUST forward provided `totalCount` unchanged without performing extra count requests or heuristic inference.
- Q: What success metric should quantify attachment cleanup reliability? → A: 95% cleanup success target (rolling 30-day window) for atomic attachment failure cases.

### Applied Changes

- Added atomic failure rule to **SC-007** clarifying rollback semantics.
- Will introduce new functional requirement for atomic attachment handling.
- Added retry resilience requirements (FR-032) scoping retries to transient downstream failures only.
- Added scheduling horizon clarification: gateway does not cap future `scheduled_at` (delegated) and MUST only enforce past-time immediate send behavior.
- Added pagination totalCount source clarification (FR-034) to rely solely on downstream messaging-api provided counts.
- Added cleanup success reliability metric (SC-008) to quantify effectiveness of atomic failure cleanup.
- Added performance split (SC-001a / SC-001b) replacing previous ambiguous SC-001.
- Added uptime timezone clarification (SC-003).

### Additional Functional Requirements (Atomic Attachment Handling)

- **FR-030**: If any attachment upload fails, the gateway MUST abort the operation, attempt to delete any already-uploaded attachments, and return an error (message not sent).
- **FR-031**: If any attachment share operation fails, the gateway MUST abort sending the message, attempt cleanup (delete uploads that were shared or partially shared), and return an error (message not sent).

### Additional Functional Requirements (Retry & Resilience)

- **FR-032**: The gateway MUST apply an exponential backoff with full jitter (initial delay 100ms, capped cumulative delay < 1s) for up to 3 attempts ONLY on transient downstream failures (HTTP 502, 503, 504, and network timeouts). It MUST NOT retry on any 4xx client/auth errors (including 400 validation, 401 unauthorized, 403 forbidden, 404 not found). After exhausting retries, it MUST surface the last error with appropriate HTTP status code.

### Additional Functional Requirements (Scheduling Horizon Delegation)

- **FR-033**: The gateway MUST NOT enforce a maximum future scheduling horizon for `scheduled_at`; it MUST only validate timestamp format and apply immediate send behavior for past timestamps, delegating distant future acceptance/rejection to the messaging-api.

### Additional Functional Requirements (Pagination Count Source)

- **FR-034**: The gateway MUST use the `totalCount` value returned by the messaging-api (or corresponding downstream endpoint) directly, forwarding it unchanged in responses without issuing supplemental count queries or deriving estimates.

### New Acceptance Scenario (User Story 1)

1. **Given** a public servant sends a message with multiple attachments and one upload fails, **When** the failure occurs, **Then** the gateway aborts, cleans up uploaded attachments, does NOT send the message, and returns an appropriate error (HTTP 502/500 depending on failure source).
2. **Given** a public servant sends a message and all uploads succeed but one share call fails, **When** the share failure occurs, **Then** the gateway aborts, cleans up uploaded attachments, does NOT send the message, and returns an appropriate error.
3. **Given** a transient downstream error (HTTP 503) occurs during an attachment upload, **When** the gateway retries with exponential backoff and the next attempt succeeds, **Then** the message send continues and ultimately returns HTTP 201.
4. **Given** a downstream messaging-api returns HTTP 401 for a send attempt, **When** the gateway processes the error, **Then** it does NOT retry and returns HTTP 401 immediately.
5. **Given** a public servant schedules a message 18 months in the future, **When** the gateway validates the request, **Then** it accepts the timestamp (format only), forwards it to messaging-api, and relies on downstream validation (no local horizon cap).
6. **Given** a PPSN+DOB lookup yields multiple matching profiles, **When** the gateway detects the ambiguity, **Then** it returns HTTP 409 with error code `recipient_conflict` and DOES NOT send the message.
7. **Given** an attachment exceeds downstream limits and upload-api returns 413, **When** the gateway receives the response, **Then** it forwards 413 with `attachment_limit_exceeded` error code and aborts with no retries.
8. **Given** a transient 503 occurs during upload and succeeds after one retry, **When** the operation completes, **Then** the send continues and returns HTTP 201 while logs show retryAttempt=1.
9. **Given** a transient failure persists through all retries (three attempts), **When** the final attempt fails, **Then** the gateway returns the last 503 (or 502/504) with `transient_failure`.
10. **Given** cleanup success rate falls below 95% (rolling 30-day window) for the first time in an hour, **When** breach detection runs, **Then** a `cleanup_breach` log and metric increment are emitted.

---

## Additional Functional Requirements (New)

### Recipient Profile Conflict Handling

- **FR-035**: If multiple profile records match a PPSN+DOB recipient lookup (conflict), the gateway MUST return HTTP 409 with error code `recipient_conflict`, MUST NOT attempt disambiguation, and MUST NOT create organization relationship or send message.

### Attachment Size/Count Delegation

- **FR-036**: The gateway MUST delegate attachment count and size limit enforcement to upload-api. On receiving 413 or documented limit error from upload-api, the gateway MUST forward the status and error body unchanged (with standard error wrapper only) and MUST NOT retry.

### Cleanup Breach Alerting

- **FR-037**: When rolling 30-day cleanup success rate (SC-008 metric) drops below 95%, the gateway MUST emit a structured log event `cleanup_breach` and increment metric `cleanup_breach_count` (minimum 1-hour detection granularity).

### Standard Error Response Schema

- **FR-038**: All error responses MUST conform to schema:
  - `error.code` (string, kebab-case, required)
  - `error.message` (string, human-readable, EN, required)
  - `error.status` (integer HTTP status, required)
  - `error.details` (object/array for field-level issues, optional)
  - `error.timestamp` (ISO-8601 UTC, required)
  - List endpoints MAY include `metadata` if partial context relevant.

### Retry Backoff Precision

- **FR-039**: Retry delays MUST follow nominal sequence [100ms, 200ms, 400ms] with full jitter (±50% bounds); cumulative nominal delay <1s. Logs MUST include fields: `retryAttempt`, `delayMs`, `operation`, `errorStatus`.

## Extended Success Criteria

- **SC-009**: On cleanup breach (<95% success), system emits breach log and increments metric within 5 minutes of detection.
- **SC-010**: 100% of error responses include required fields per FR-038; contract tests cover each major category (validation, auth, conflict, not_found, atomic_failure, transient_failure, attachment_limit).
- **SC-011**: 100% of transient retry attempts produce structured log entries with required fields (retryAttempt, delayMs, operation, errorStatus).
- **SC-012**: Forwarded `totalCount` equals downstream value (bitwise equality) in 100% of tested pagination scenarios (FR-034).

## Error Mapping Matrix

| Endpoint | Condition | HTTP Status | error.code | Notes |
|----------|-----------|-------------|------------|-------|
| POST /v1/messages | Success | 201 | message_created | Contains messageId, recipientId, attachmentIds |
| POST /v1/messages | Validation failure (schema) | 400 | validation_error | No retry |
| POST /v1/messages | Auth missing | 401 | auth_missing | No retry |
| POST /v1/messages | Org missing | 401 | org_missing | No retry |
| POST /v1/messages | Recipient not found | 404 | recipient_not_found | No retry |
| POST /v1/messages | Recipient conflict (multiple PPSN) | 409 | recipient_conflict | Abort, no retry |
| POST /v1/messages | Attachment limit exceeded | 413 | attachment_limit_exceeded | Forwarded from upload-api |
| POST /v1/messages | Transient failure (retries exhausted) | 502/503/504 | transient_failure | Last downstream status |
| POST /v1/messages | Atomic cleanup partial failure | 500 | cleanup_partial_failure | Message not sent; log details |
| POST /v1/messages | Internal orchestration error | 500 | internal_error | Unexpected processing error |
| GET /v1/messages/events | Success | 200 | events_list | Includes metadata.totalCount |
| GET /v1/messages/events | Validation failure (filters) | 400 | validation_error | No retry |
| GET /v1/messages/events | Auth/Org missing | 401 | auth_missing / org_missing | No retry |
| GET /v1/messages/events | Transient failure (exhausted) | 502/503/504 | transient_failure | Last status |
| GET /v1/messages/:id/events | Success | 200 | history_list | Chronological events |
| GET /v1/messages/:id/events | Message not found | 404 | message_not_found | No retry |
| GET /v1/messages/:id/events | Auth/Org missing | 401 | auth_missing / org_missing | No retry |
| Any endpoint | Rate limit (future) | 429 | rate_limited | Enhancement placeholder |
| Any endpoint | Unexpected exception | 500 | internal_error | Catch-all |

## Metrics Definitions

| Metric Name | Unit | Description |
|-------------|------|-------------|
| message_send_duration | ms | End-to-end latency from request to response for successful POST /v1/messages |
| profile_lookup_duration | ms | Profile lookup phase time |
| upload_phase_duration | ms | Aggregate parallel uploads window latency |
| cleanup_duration | ms | Attachment cleanup deletion phase latency |
| cleanup_breach_count | count | Number of cleanup success rate breach detections (<95%) |

**Required Structured Log Fields** (minimum): `timestamp`, `requestId`, `correlationId`, `organizationId`, `phase`, `retryAttempt` (if retry), `delayMs` (if retry), `operation`, `error.code`, `error.status`, `cleanupDeletedCount`, `cleanupAttemptedCount`.

## Error Response Schema Example

```json
{
  "error": {
    "code": "recipient_conflict",
    "message": "Multiple recipient profiles matched PPSN/DOB; cannot disambiguate.",
    "status": 409,
    "timestamp": "2025-11-20T10:15:30.123Z",
    "details": {"matchedProfiles": 2}
  }
}
```

## Retry Backoff Example

Nominal delays (pre-jitter): 100ms, 200ms, 400ms.  
Example with jitter applied: 73ms, 295ms, 420ms.  
Jitter bounds: each delay randomized within [50% of nominal, 150% of nominal].

## Cleanup Success Rate Calculation

```
successRate = totalSuccessfulDeletions / totalDeletionAttempts
```

Measured over rolling 30-day window of atomic failure cases only.  
Breach threshold: `successRate < 0.95`  
Detection interval: Minimum 1 hour granularity.
