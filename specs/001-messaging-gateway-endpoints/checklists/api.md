# API Requirements Quality Checklist

**Feature**: Messaging Gateway Endpoints  
**Checklist Purpose**: Release-gate validation of API specification quality (requirements completeness, clarity, consistency, measurability, coverage) with priority emphasis on atomic failure semantics, error mapping, and pagination integrity.  
**Created**: 2025-11-20  
**Scope Focus**: API functional + critical non-functional (performance, cleanup reliability, retry boundaries)  
**Depth**: Comprehensive (release gate)  
**Risk Emphasis**: Atomic attachment failure, error code mapping consistency, pagination totalCount forwarding integrity

---
## Requirement Completeness
- [ ] CHK001 Are error mapping requirements enumerating all expected HTTP status codes (2xx, 4xx, 5xx) for each endpoint (send, events, history) present, or is a consolidated table missing? [Completeness, Gap]
- [ ] CHK002 Are functional requirements for atomic attachment upload/share failure (abort + cleanup + no dispatch) explicitly tied to response structure (error code + field semantics)? [Completeness, Spec §FR-030, Spec §FR-031]
- [ ] CHK003 Are pagination requirements covering both metadata.totalCount and HATEOAS links for latest events queries fully specified? [Completeness, Spec §FR-021, Spec §FR-022]
- [ ] CHK004 Are requirements defined for forwarding downstream `totalCount` unchanged (no transformation/inference)? [Completeness, Spec §FR-034]
- [ ] CHK005 Are retry policy boundaries (transient codes list, max attempts, jitter/backoff parameters) fully captured with no missing transient cases (e.g., network timeout vs DNS)? [Completeness, Spec §FR-032]
- [ ] CHK006 Are edge case scenarios for far-future `scheduled_at` acceptance documented (delegation to messaging-api) vs gateway validation scope? [Completeness, Spec §FR-033]
- [ ] CHK007 Are requirements present for handling recipient identification conflicts (multiple profiles same PPSN) or is this scenario unaddressed? [Completeness, Gap]
- [ ] CHK008 Are cleanup reliability measurement + logging requirements (≥95% success metric) fully specified (scope, window, data source)? [Completeness, Spec §SC-008]
- [ ] CHK009 Are list response structure requirements (data + metadata objects) fully specified for both events and latest events endpoints? [Completeness, Spec §FR-027, Spec §FR-028]
- [ ] CHK010 Are attachment upload size/count constraints delegated vs locally validated clarified (gateway vs upload-api) without ambiguity? [Completeness, Spec §Assumptions]

\n## Requirement Clarity
- [ ] CHK011 Is "appropriate HTTP error codes" in FR-018 clarified with explicit mapping (e.g., validation → 400, not found → 404, auth → 401, org missing → 401, conflict vs ambiguous recipient)? [Clarity, Spec §FR-018, Gap]
- [ ] CHK012 Is the atomic failure "best-effort cleanup" term defined (which operations attempted, failure handling, logging expectations)? [Clarity, Spec §SC-007, Spec §FR-030, Spec §FR-031]
- [ ] CHK013 Is the retry backoff defined precisely (initial delay, multiplier, jitter strategy, max cumulative delay) rather than conceptually? [Clarity, Spec §FR-032]
- [ ] CHK014 Is "scheduled immediately" for past timestamps defined (no queueing, synchronous pass-through) with measurable behavior (e.g., single downstream send call)? [Clarity, Spec §FR-009]
- [ ] CHK015 Is performance success criterion SC-001 distinguishing "normal load" vs heavy attachment scenario (size/count) or is the term ambiguous? [Clarity, Spec §SC-001, Gap]
- [ ] CHK016 Are error response body field names (code, message, details) standardized in the spec or missing? [Clarity, Spec §FR-029, Gap]
- [ ] CHK017 Is the meaning of "relationship creation" data requirements (minimum recipient fields needed) explicitly stated? [Clarity, Spec §FR-012]
- [ ] CHK018 Is the term "latest events" clearly defined (most recent event per message, no duplicates)? [Clarity, Spec §User Story 2]
- [ ] CHK019 Is the "chronological order" requirement for message history unambiguously defined (ascending by timestamp) with tie-break rule? [Clarity, Spec §User Story 3]
- [ ] CHK020 Is the distinction between upload failure vs share failure error signaling clarified (different status vs same)? [Clarity, Spec §FR-030, Spec §FR-031, Gap]

\n## Requirement Consistency
- [ ] CHK021 Do authentication failure responses use consistent HTTP 401 across all endpoints (send, latest events, history) as required? [Consistency, Spec §FR-003, Spec §FR-004]
- [ ] CHK022 Is scheduled_at handling (past → immediate, future → forwarded) consistent across functional and acceptance sections with no contradictions? [Consistency, Spec §FR-009, Spec §Acceptance Scenarios]
- [ ] CHK023 Are response structure conventions (data, metadata, error) consistent between send-message (201) and list endpoints (200) without deviations? [Consistency, Spec §FR-027, Spec §FR-028]
- [ ] CHK024 Are retry exclusions (no retries on any 4xx) consistent without exceptions stated elsewhere (e.g., 429 not addressed)? [Consistency, Spec §FR-032]
- [ ] CHK025 Is the assumption about attachment size limit delegating validation consistent with FR-014 (no local size enforcement)? [Consistency, Spec §FR-014, Spec §Assumptions]
- [ ] CHK026 Are profile lookup failure semantics (404) consistent between main requirements and acceptance scenarios? [Consistency, Spec §FR-013]

\n## Acceptance Criteria Quality
- [ ] CHK027 Can SC-001 be objectively validated without clarifying sample size/load profile (p95 under defined typical scenario)? [Acceptance Criteria, Spec §SC-001, Gap]
- [ ] CHK028 Does SC-003 specify the timezone for business hours (local ambiguous) to allow measurable uptime calculation? [Acceptance Criteria, Spec §SC-003, Gap]
- [ ] CHK029 Is SC-007 testable with explicit trigger conditions (failure before dispatch defined by absence of send API call)? [Acceptance Criteria, Spec §SC-007]
- [ ] CHK030 Is SC-008 measurable with defined numerator/denominator (successful deletions / attempted deletions) and sampling window boundaries? [Acceptance Criteria, Spec §SC-008]
- [ ] CHK031 Are success criteria for event query latency (SC-002) specifying dataset size (up to 1000 messages) consistently applied to both filtered and unfiltered queries? [Acceptance Criteria, Spec §SC-002]

\n## Scenario Coverage
- [ ] CHK032 Are atomic failure scenarios for mixed success (some attachments upload, share failure later) covered adequately? [Coverage, Spec §FR-031, Spec §SC-007]
- [ ] CHK033 Are retry success and retry exhaustion (all attempts fail) scenarios documented? [Coverage, Spec §FR-032, Gap]
- [ ] CHK034 Are zero-result pagination scenarios (no messages/events) explicitly covered? [Coverage, Gap]
- [ ] CHK035 Are far-future scheduled_at scenarios (years ahead) documented beyond acceptance scenario reference? [Coverage, Spec §Clarifications, Gap]
- [ ] CHK036 Are concurrent sends during pagination browsing addressed (stale totalCount effects)? [Coverage, Gap]
- [ ] CHK037 Are recipient conflict resolution scenarios (multiple profiles for PPSN) addressed or marked out of scope? [Coverage, Gap]

\n## Edge Case Coverage
- [ ] CHK038 Are partial cleanup failure semantics (one deletion fails) defined (logging, no retry vs retry)? [Edge Case, Spec §SC-007, Spec §SC-008, Gap]
- [ ] CHK039 Is behavior defined when downstream totalCount is unexpectedly null/undefined? [Edge Case, Spec §FR-034, Gap]
- [ ] CHK040 Is maximum attachment count overflow case (above limit) documented (gateway vs downstream rejection)? [Edge Case, Spec §Assumptions, Gap]
- [ ] CHK041 Is handling for empty multipart (declared attachments=0) specified? [Edge Case, Spec §FR-014, Gap]
- [ ] CHK042 Is behavior defined when retryable error occurs during final message send vs earlier phases? [Edge Case, Spec §FR-032, Gap]
- [ ] CHK043 Are pagination links correctness rules for first/last pages under single-page results defined? [Edge Case, Spec §FR-022, Gap]

\n## Non-Functional Requirements
- [ ] CHK044 Are performance targets differentiated for typical vs heavy (attachments present) requests? [Non-Functional, Spec §SC-001, Gap]
- [ ] CHK045 Are logging field requirements (correlationId, organizationId) explicitly enumerated in spec (not only plan)? [Non-Functional, Gap]
- [ ] CHK046 Are metrics names and units defined (milliseconds) for each timer metric? [Non-Functional, Spec §SC-001, Spec §SC-002, Gap]
- [ ] CHK047 Is resilience policy for timeouts vs 504 consistent (both transient in retry list)? [Non-Functional, Spec §FR-032]
- [ ] CHK048 Are security scope boundaries (delegated permission checks) clearly stated for all endpoints? [Non-Functional, Spec §FR-005]

\n## Dependencies & Assumptions
- [ ] CHK049 Are assumptions validated (e.g., unique PPSN) or should there be a requirement to confirm upstream uniqueness before relying on it? [Assumption, Spec §Assumptions, Gap]
- [ ] CHK050 Are dependencies on SDK error shape documented (field names, status exposure) for mapping? [Dependency, Gap]
- [ ] CHK051 Is there an explicit requirement for SDK token forwarding correctness (prevent missing auth header) or is it implicit only? [Dependency, Gap]

\n## Ambiguities & Conflicts
- [ ] CHK052 Is ambiguity around multiple profiles with same PPSN acknowledged and assigned resolution path (out of scope vs defined)? [Ambiguity, Gap]
- [ ] CHK053 Is potential conflict between SC-001 (<5s send) and plan performance target (<200ms p95 typical) reconciled and separated? [Conflict, Spec §SC-001, Plan §Performance Goals]
- [ ] CHK054 Is ambiguity around "normal load conditions" turned into quantifiable request rate / concurrency? [Ambiguity, Spec §SC-001, Gap]
- [ ] CHK055 Is undefined error body schema (FR-029) creating ambiguity for contract tests? [Ambiguity, Spec §FR-029]
- [ ] CHK056 Is lack of explicit timezone for SC-003 creating ambiguity for uptime measurement windows? [Ambiguity, Spec §SC-003]

\n## Traceability & ID Scheme
- [ ] CHK057 Are new FRs (FR-030–FR-034) traceable to acceptance scenarios added (1–5) with explicit cross-reference list? [Traceability, Spec §Clarifications]
- [ ] CHK058 Is there a missing explicit link between cleanup reliability metric (SC-008) and operational logging fields required to compute it? [Traceability, Spec §SC-008, Gap]
- [ ] CHK059 Are all success criteria (SC-001–SC-008) mapped to at least one acceptance scenario or requirement section? [Traceability, Spec §Success Criteria]
- [ ] CHK060 Is versioning or future evolution strategy for API changes absent (no deprecation policy)? [Traceability, Gap]

## Measurability Checks
- [ ] CHK061 Can atomic failure detection be measured via absence of downstream send call + presence of cleanup log events? [Measurability, Spec §SC-007, Spec §FR-030]
- [ ] CHK062 Can pagination integrity (unchanged totalCount) be measured via contract test capturing direct forwarding vs recomputation? [Measurability, Spec §FR-034]
- [ ] CHK063 Can retry behavior be measured via logging attempt count and final status (success/failure) per operation? [Measurability, Spec §FR-032]
- [ ] CHK064 Can cleanup success rate (SC-008) calculation be implemented from structured logs (needs field schema)? [Measurability, Spec §SC-008, Gap]

---
**Summary**: 64 checklist items created. High-priority gaps: error mapping table (CHK001, CHK011), performance differentiation (CHK015, CHK044), recipient conflict handling (CHK007, CHK052), pagination edge cases (CHK034, CHK043), cleanup reliability measurability (CHK030, CHK064). >80% of items include traceability references or gap markers.

**Next Actions Suggestion**: Address top gaps by adding: (1) Error code mapping matrix, (2) Split SC-001 into typical vs attachment-heavy cases, (3) Clarify PPSN conflict out-of-scope or define FR, (4) Specify error body schema fields, (5) Define metrics units & field names for cleanup logging.
