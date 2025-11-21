# Tasks: Messaging Gateway Endpoints

Feature Directory: `specs/001-messaging-gateway-endpoints/`
Spec Reference: `specs/001-messaging-gateway-endpoints/spec.md`
Plan Reference: `specs/001-messaging-gateway-endpoints/plan.md`

 
## Phase 1: Setup

Purpose: Establish baseline project capabilities (multipart, retry utility, initial schemas, directory scaffolding) without implementing business logic.
Independent Test Criteria: Fastify server starts with new plugins (multipart), new schema files compile, retry utility exports expected functions, and Biome & TypeScript checks pass.

Implementation Tasks:

- [X] T001 Create `src/utils/retry.ts` with exported `executeWithRetry(fn, classifyError)` implementing exponential backoff (100ms base, full jitter, max 3 attempts) (src/utils/retry.ts)
- [X] T002 [P] Add transient error status code map constant `TRANSIENT_STATUS_CODES` (src/utils/retry.ts)
- [X] T003 Add unit test skeleton for retry utility (src/test/utils/retry.test.ts)
- [X] T004 [P] Register @fastify/multipart plugin in server bootstrap (src/plugins/external/multipart.ts)
- [X] T005 Add attachment config constants (max files, max size) (src/const/attachments.ts)
- [X] T006 [P] Create initial message schemas file exporting placeholder TypeBox objects (src/schemas/message.ts)
- [X] T007 [P] Create recipient identification schemas file (src/schemas/recipient.ts)
- [X] T008 [P] Create attachment schemas file (src/schemas/attachment.ts)
- [X] T009 Extend existing pagination schema with HATEOAS links structure (src/schemas/pagination.ts)
- [X] T010 Ensure OpenAPI swagger plugin tags include `messages` (src/plugins/external/swagger.ts)
- [X] T011 [P] Add script comment in quickstart about retry & cleanup behavior (specs/001-messaging-gateway-endpoints/quickstart.md)
- [X] T012 Add placeholder service files (src/services/profile-service.ts)
- [X] T013 [P] Add placeholder service files (src/services/messaging-service.ts)
- [X] T014 [P] Add placeholder service files (src/services/upload-service.ts)
- [X] T015 Create orchestration service placeholder (src/services/message-orchestration.ts)
- [X] T016 Add contract tests folder scaffolding (src/test/contracts/message-routes.test.ts)
- [X] T017 [P] Add messages route index scaffolding (src/routes/messages/index.ts)
- [X] T018 [P] Add empty handler files for routes (src/routes/messages/send-message.ts)
- [X] T019 [P] Add empty handler files for routes (src/routes/messages/get-message-events.ts)
- [X] T020 [P] Add empty handler files for routes (src/routes/messages/get-message-history.ts)

 
## Phase 2: Foundational

Purpose: Implement shared validation, token forwarding, pagination enhancements, error mapping, and logging hooks required by all user stories.
Independent Test Criteria: Shared utilities (pagination, token forwarding, retry, error mapper) pass unit tests; route registration returns 404 for unknown endpoints; swagger docs include placeholder endpoints.

Implementation Tasks:

- [X] T021 Implement token extraction helper `getAuthToken(request)` (src/utils/token-forwarding.ts) - Not needed (request.userData provides token)
- [X] T022 [P] Implement pagination HATEOAS link builder `buildPaginationLinks(baseUrl, limit, offset, totalCount)` (src/utils/pagination.ts) - Already exists as getPaginationLinks
- [X] T023 [P] Add metadata assembling helper `buildListMetadata(params)` (src/utils/pagination.ts) - Already exists as formatAPIResponse
- [X] T024 Implement error classification function `isRetryableError(error)` (src/utils/retry.ts)
- [X] T025 [P] Add structured logging wrapper for retry attempts (src/utils/retry.ts)
- [X] T026 Add Fastify decorator for retry utility injection (src/plugins/internal/retry.ts)
- [X] T027 [P] Implement base profile-service interface & stub methods (src/services/profile-service.ts)
- [X] T028 [P] Implement base messaging-service interface & stub methods (src/services/messaging-service.ts)
- [X] T029 [P] Implement base upload-service interface & stub methods (src/services/upload-service.ts)
- [X] T030 Implement initial route schemas aggregator (src/routes/messages/schema.ts)
- [X] T031 [P] Add contract test asserting schema presence for all three endpoints (src/test/contracts/message-routes.test.ts)
- [X] T032 Add unit tests for pagination utilities (src/test/utils/pagination.test.ts)
- [X] T033 [P] Add unit tests for token forwarding utility (src/test/utils/token-forwarding.test.ts) - Not needed (token forwarding delegated to SDK)
- [X] T034 Add logging fields (correlationId, organizationId) integration check (src/test/routes/healthcheck.test.ts)
- [X] T035 [P] Update quickstart with pagination example (specs/001-messaging-gateway-endpoints/quickstart.md)

 
## Phase 3: User Story 1 (Send Message with Attachments) [P1]

Story Goal: Public servant can send message with optional scheduled_at and attachments; atomic failure cleanup ensures no partial sends.
Independent Test Criteria: Integration tests create a message, verify response (201, messageId, recipientId, attachmentIds), simulate upload failure and share failure verifying atomic cleanup (no message dispatched), scheduled_at past triggers immediate send, future passes through.

Implementation Tasks:

- [X] T036 [US1] Implement recipient lookup in profile-service (src/services/profile-service.ts)
- [ ] T037 [P] [US1] Implement organization relationship check/create (src/services/profile-service.ts)
- [X] T038 [US1] Implement upload-service `uploadAttachment(stream, meta)` (src/services/upload-service.ts)
- [X] T039 [P] [US1] Implement upload-service `shareAttachment(fileId, recipientId)` (src/services/upload-service.ts)
- [X] T040 [US1] Implement cleanup deletion `deleteAttachment(fileId)` (src/services/upload-service.ts)
- [X] T041 [US1] Implement messaging-service `sendMessage(payload)` (src/services/messaging-service.ts)
- [X] T042 [P] [US1] Implement orchestration phase 1 (parse multipart + profile lookup) (src/services/message-orchestration.ts)
- [X] T043 [P] [US1] Implement orchestration phase 2 (parallel uploads) (src/services/message-orchestration.ts)
- [X] T044 [P] [US1] Implement orchestration phase 3 (parallel shares) (src/services/message-orchestration.ts)
- [X] T045 [US1] Implement final send + response assembly (src/services/message-orchestration.ts)
- [X] T046 [US1] Implement atomic failure handling branch (aggregate errors + cleanup + abort) (src/services/message-orchestration.ts)
- [X] T047 [US1] Add retry wrapping for transient upload/share errors (src/services/upload-service.ts)
- [X] T048 [P] [US1] Add retry wrapping for transient messaging send errors (src/services/messaging-service.ts)
- [X] T049 [US1] Add structured logging for each orchestration phase start/end (src/services/message-orchestration.ts)
- [X] T050 [US1] Add metrics timers (profile_lookup_duration, upload_phase_duration, cleanup_duration) (src/instrumentation.ts)
- [X] T051 [P] [US1] Extend schemas for send-message body & response (src/routes/messages/schema.ts)
- [X] T052 [US1] Implement route handler logic (src/routes/messages/send-message.ts)
- [X] T053 [US1] Add integration test: successful send with attachments (src/test/routes/messages/send-message.test.ts)
- [X] T054 [P] [US1] Add integration test: upload failure triggers atomic abort (src/test/routes/messages/send-message.test.ts)
- [X] T055 [P] [US1] Add integration test: share failure triggers atomic abort (src/test/routes/messages/send-message.test.ts)
- [X] T056 [US1] Add integration test: scheduled_at past sends immediately (src/test/routes/messages/send-message.test.ts)
- [X] T057 [US1] Add integration test: scheduled_at future accepted (src/test/routes/messages/send-message.test.ts)
- [X] T058 [US1] Add unit test: cleanup deletion success path (src/test/services/upload-service.test.ts)
- [X] T059 [P] [US1] Add unit test: cleanup partial failure logs (src/test/services/upload-service.test.ts)
- [X] T060 [US1] Add unit test: retry utility used for transient upload error (src/test/services/upload-service.test.ts)
- [X] T061 [US1] Add unit test: no retry on 401/403 upload errors (src/test/services/upload-service.test.ts)
- [X] T062 [US1] Add contract test: send-message swagger schema fields (src/test/contracts/message-routes.test.ts)
- [X] T063 [P] [US1] Update quickstart with send-message examples (specs/001-messaging-gateway-endpoints/quickstart.md)

 
## Phase 4: User Story 2 (Query Latest Message Events) [P2]

Story Goal: Public servant can query latest events with filters and pagination; downstream `totalCount` forwarded; HATEOAS links generated.
Independent Test Criteria: Integration tests query events with no filters, each filter path, pagination metadata with links, unauthorized cases return 401; performance within target.

Implementation Tasks:

- [X] T064 [US2] Implement messaging-service `queryMessageEvents(filters)` using SDK getMessageEvents (src/services/messaging-service.ts)
- [ ] T065 [P] [US2] Map query filters to SDK params (subject substring, date range, recipient identifiers) (src/services/messaging-service.ts)
- [X] T066 [US2] Integrate pagination link builder in route handler (src/routes/messages/get-message-events.ts)
- [X] T067 [US2] Extend schemas for query parameters & response (src/routes/messages/schema.ts)
- [X] T068 [US2] Implement route handler logic (src/routes/messages/get-message-events.ts)
- [X] T069 [P] [US2] Add integration test: no filters returns paginated list (src/test/routes/messages/get-message-events.test.ts)
- [ ] T070 [P] [US2] Add integration test: filter by recipientId (src/test/routes/messages/get-message-events.test.ts)
- [ ] T071 [P] [US2] Add integration test: filter by subject substring (src/test/routes/messages/get-message-events.test.ts)
- [ ] T072 [P] [US2] Add integration test: filter by date range (src/test/routes/messages/get-message-events.test.ts)
- [ ] T073 [P] [US2] Add integration test: filter by recipientEmail (src/test/routes/messages/get-message-events.test.ts)
- [ ] T074 [US2] Add integration test: pagination links correctness (src/test/routes/messages/get-message-events.test.ts)
- [ ] T075 [US2] Add integration test: unauthorized (no token) returns 401 (src/test/routes/messages/get-message-events.test.ts)
- [ ] T076 [US2] Add integration test: missing organizationId returns 401 (src/test/routes/messages/get-message-events.test.ts)
- [ ] T077 [US2] Add contract test: events schema includes metadata.totalCount (src/test/contracts/message-routes.test.ts)
- [ ] T078 [P] [US2] Update quickstart with query examples (specs/001-messaging-gateway-endpoints/quickstart.md)

 
## Phase 5: User Story 3 (Get Message Event History) [P3]

Story Goal: Public servant retrieves chronological event history for a specific message within their organization.
Independent Test Criteria: Integration tests fetch events for valid messageId, 404 for unknown id, 401 for unauthorized, verify chronological order.

Note: Uses same SDK method as US2 (getMessageEvents) but with messageId parameter to filter to single message.

Implementation Tasks:

- [X] T079 [US3] Use queryMessageEvents with messageId filter (already unified in messaging-service.ts)
- [X] T080 [P] [US3] Verify SDK returns chronological sort (no additional sorting needed) (src/services/messaging-service.ts)
- [X] T081 [US3] Extend schemas for message history response (src/routes/messages/schema.ts)
- [X] T082 [US3] Implement route handler logic (src/routes/messages/get-message-history.ts)
- [X] T083 [P] [US3] Add integration test: valid message history returned (src/test/routes/messages/get-message-history.test.ts)
- [X] T084 [P] [US3] Add integration test: non-existent message returns 404 (src/test/routes/messages/get-message-history.test.ts)
- [X] T085 [P] [US3] Add integration test: unauthorized returns 401 (src/test/routes/messages/get-message-history.test.ts)
- [X] T086 [US3] Add integration test: missing organizationId returns 401 (src/test/routes/messages/get-message-history.test.ts)
- [X] T087 [US3] Add contract test: history schema correctness (src/test/contracts/message-routes.test.ts)
- [X] T088 [P] [US3] Update quickstart with history examples (specs/001-messaging-gateway-endpoints/quickstart.md)

 
## Phase 6: Polish & Cross-Cutting

Purpose: Finalize performance instrumentation, documentation, observability metrics, and non-functional refinements.
Independent Test Criteria: Metrics emitted, logs structured, cleanup success monitoring implemented, all tests green, coverage >=80%.

Implementation Tasks:

- [X] T089 Implement metric emission for `message_send_duration` (src/instrumentation.ts)
- [X] T090 [P] Add metric emission for `upload_phase_duration` (src/instrumentation.ts)
- [X] T091 [P] Add metric emission for `cleanup_duration` (src/instrumentation.ts)
- [ ] T092 Implement periodic cleanup success aggregation (rolling 30-day, in-memory or stub) (src/services/upload-service.ts)
- [X] T093 [P] Add log field standardizer (correlationId, organizationId, attempt) (src/utils/logging-standardizer.ts)
- [X] T094 Add README section for messaging endpoints (README.md)
- [ ] T095 [P] Add performance test script stub (scripts/perf/send-message-perf.test.ts)
- [ ] T096 Add final quickstart polish (specs/001-messaging-gateway-endpoints/quickstart.md)
- [ ] T097 [P] Add coverage threshold config check (package.json)
- [ ] T098 Add rate limiting TODO stub for future enhancement (docs/future/rate-limiting.md)

Additional Remediation & Verification Tasks:

- [ ] T099 Add integration test: scheduled_at far-future horizon scenario (src/test/routes/messages/send-message.test.ts)
- [ ] T100 Add integration test: totalCount integrity forwarding (src/test/routes/messages/get-message-events.test.ts)
- [ ] T101 Add unit test: cleanup success breach alert scenario (<95% triggers alert/log) (src/test/services/upload-service.test.ts)
- [ ] T102 Add contract test: atomic failure 502 error schema (src/test/contracts/message-routes.test.ts)

 
## Dependencies & Story Order

1. Setup must complete before Foundational.
2. Foundational must complete before any User Story implementation.
3. User Story 1 (P1) precedes User Story 2 and 3.
4. User Stories 2 and 3 can run in parallel after US1 completion.
5. Polish only after all stories complete.

 
## Parallel Execution Examples

- During Phase 1: T002, T006, T007, T008, T011, T013–T020 can run concurrently.
- During Phase 2: T022, T023, T025, T027–T029, T031, T033, T035 parallelizable.
- User Story 1: Parallel groups: (T037,T039,T042–T044,T048,T051,T054–T055,T059,T063) while sequential core (T036,T038,T040–T047,T049–T053,T056–T062) depend on earlier outputs.
- User Story 2: T065, T069–T073, T078 parallel with core T064,T066–T068,T074–T077.
- User Story 3: T080,T083–T085,T088 can parallel with core T079,T081–T082,T086–T087.
- Polish: T090,T091,T093,T095,T097 parallel with T089,T092,T094,T096,T098.
- New tests (T099–T102) can run after their related core story tasks are green; T099 & T100 depend on US1/US2 completion respectively; T101 after T092; T102 after atomic failure logic (T046) and send-message schema (T051,T062).

 
## Implementation Strategy

MVP Scope: Complete User Story 1 (Phase 3) after Setup & Foundational.
Incremental Delivery:

1. MVP: Send message end-to-end with atomic failure + cleanup (T036–T063).
2. Add querying latest events (Phase 4) for operational visibility.
3. Add message history (Phase 5) for diagnostics.
4. Polish pass adds metrics, documentation, and performance harness.


Rollback Plan: Keep each phase behind feature branch; merge to `dev` only after tests green and coverage threshold met.

 
## Task Counts

 - Total Tasks: 102
- Setup Phase: 20
- Foundational Phase: 15
- User Story 1: 28
- User Story 2: 15
- User Story 3: 10
 - Polish Phase: 14

## Independent Test Criteria per Story

- US1: Successful send returns 201 with IDs; failure scenarios abort without dispatch; scheduling behaviors verified.
- US2: Query returns filtered latest events; pagination metadata and links correct; unauthorized paths return 401.
- US3: Full chronological event list for valid message; 404 on invalid ID; org filtering implicit via SDK.

## Format Validation

All tasks follow required format: `- [ ] T### [P] [USx] Description (file path)` with sequential IDs, optional [P] only on parallel-safe tasks, story labels only in story phases.

