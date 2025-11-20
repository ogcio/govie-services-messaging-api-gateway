# Research: Messaging Gateway Endpoints

**Created**: 2025-11-20  
**Phase**: 0 (Outline & Research)  
**Purpose**: Resolve unknowns from Technical Context and research best practices

## Building Blocks SDK Integration

### Decision: Use @ogcio/building-blocks-sdk for all downstream API calls

**Rationale**: The SDK provides standardized clients for profile-api, messaging-api, and upload-api with built-in error handling, retry logic, and type safety. Version 0.2.67+ is already in dependencies.

**Key Methods Needed**:

- **Profile API**: `getProfile(identifier)`, `createOrganizationRelationship(profileId, orgId, data)`
- **Messaging API**: `sendMessage(payload)`, `getMessageEvents(filters)`, `getMessageHistory(messageId)`
- **Upload API**: `uploadFile(file, metadata)`, `shareFile(fileId, recipientId)`

**Token Forwarding**: The SDK clients must be initialized with the authenticated user's token from `request.headers.authorization` to maintain auth context across service boundaries.

**Alternatives considered**:

- Direct HTTP calls with fetch/axios: Rejected because SDK provides typed interfaces, standardized error handling, and is maintained by the organization
- GraphQL federation: Rejected as overkill for 3 simple API integrations

## Multipart Form-Data Handling

### Decision: Use @fastify/multipart for file upload processing

**Rationale**: Official Fastify plugin for handling multipart/form-data with streaming support, memory-efficient processing, and TypeScript types. Essential for the send-message endpoint which accepts both JSON payload and file attachments.

**Best Practices**:

- Use streaming API to avoid loading entire files into memory
- Set file size limits via plugin options (align with upload-api limits)
- Validate file types and extensions before upload
- Use `request.parts()` async iterator for processing mixed multipart data
- Handle errors gracefully (partial upload failures)

**Implementation Pattern**:

```typescript
// Register plugin with limits
fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10 // max 10 files per request
  }
});

// In route handler
for await (const part of request.parts()) {
  if (part.type === 'file') {
    // Stream to upload service
  } else {
    // Handle form fields
  }
}
```

**Alternatives considered**:

- busboy directly: Rejected because @fastify/multipart wraps it with Fastify conventions
- Storing files to disk first: Rejected due to unnecessary I/O and cleanup complexity

## OpenAPI Documentation Generation

### Decision: Use @fastify/swagger with @fastify/swagger-ui (already configured)

**Rationale**: Project already has these dependencies. They auto-generate OpenAPI 3.0 specs from TypeBox schemas attached to routes. Swagger UI provides interactive documentation.

**Best Practices**:

- Define complete TypeBox schemas for all request/response types
- Use `.describe()` on schema properties for documentation
- Add route-level descriptions via `schema.description`
- Document all HTTP status codes with response schemas
- Use `schema.tags` to group related endpoints
- Set API version prefix (`/v1`) in route configuration

**Configuration Requirements**:

```typescript
// In route schema
schema: {
  description: 'Send a message to a recipient with optional attachments',
  tags: ['messages'],
  security: [{ bearerAuth: [] }],
  body: SendMessageBodySchema,
  response: {
    201: SendMessageResponseSchema,
    401: UnauthorizedSchema,
    404: RecipientNotFoundSchema
  }
}
```

**Alternatives considered**:

- Manual OpenAPI YAML: Rejected because auto-generation from schemas ensures sync
- Swagger Codegen: Rejected because we're generating docs, not code

## Error Handling Strategy

### Decision: Use @ogcio/fastify-error-handler + @fastify/sensible (already integrated)

**Rationale**: Centralized error handling ensures consistent error response format across all endpoints. @fastify/sensible provides utility methods like `reply.notFound()`.

**Best Practices**:

- Throw HTTP errors from services using `@fastify/sensible` methods
- Let error handler format responses consistently
- Log errors with structured context (userId, organizationId, correlationId)
- Map SDK errors to appropriate HTTP status codes:
  - Profile not found → 404
  - Unauthorized → 401
  - Validation errors → 400
  - Downstream service errors → 502/503
  - Timeout → 504

**Error Response Format** (from @ogcio/fastify-error-handler):

```json
{
  "error": {
    "message": "Recipient not found in profile system",
    "statusCode": 404,
    "code": "RECIPIENT_NOT_FOUND"
  }
}
```

**Alternatives considered**:

- Custom error handler: Rejected because existing solution is battle-tested
- Throwing raw Error objects: Rejected because it bypasses standardization

## Pagination Strategy

### Decision: Extend existing pagination utilities with HATEOAS links

**Rationale**: Project already has pagination constants and utilities in `src/const/pagination.ts` and `src/utils/pagination.ts`. Need to add link generation for previous/next/first/last pages.

**Best Practices**:

- Use limit/offset pagination (simpler than cursor for this use case)
- Default limit: 20 items per page (configurable)
- Max limit: 100 items per page
- Return metadata object with: `totalCount`, `limit`, `offset`
- Generate HATEOAS links: `previous`, `next`, `first`, `last`
- Use query params: `?limit=20&offset=40`

**Response Structure**:

```json
{
  "data": [...],
  "metadata": {
    "totalCount": 250,
    "limit": 20,
    "offset": 40,
    "links": {
      "first": "/v1/messages/events?limit=20&offset=0",
      "previous": "/v1/messages/events?limit=20&offset=20",
      "next": "/v1/messages/events?limit=20&offset=60",
      "last": "/v1/messages/events?limit=20&offset=240"
    }
  }
}
```

**Alternatives considered**:

- Cursor-based pagination: Rejected as unnecessarily complex for this use case
- GraphQL-style connections: Rejected as over-engineering for REST API

## Orchestration Pattern for Message Sending

### Decision: Service layer orchestrates profile lookup, relationship check/create, file uploads, and message sending

**Rationale**: The send-message operation requires coordinating multiple downstream APIs with conditional logic. A dedicated orchestration service ensures testability and separation of concerns.

**Workflow**:

1. Extract recipient identifier from request
2. **Parallel Phase 1**: Parse multipart data for files while looking up profile
3. Verify profile exists (404 if not)
4. Check organization relationship
5. If no relationship and recipient data provided: create relationship
6. If no relationship and no recipient data: return 400
7. **Parallel Phase 2**: Upload all files simultaneously to upload-api
8. Share all uploaded files with recipient (can be parallelized)
9. Send message with attachment references
10. Return messageId, recipientId, attachmentIds

**Parallelization Opportunities**:

```typescript
// Phase 1: Parallel profile lookup and file parsing
const [profile, files] = await Promise.all([
  profileService.getProfile(recipientIdentifier),
  parseMultipartFiles(request)
]);

// Phase 2: Parallel file uploads
const uploadPromises = files.map(file => 
  uploadService.uploadFile(file, authToken)
);
const uploadedFiles = await Promise.all(uploadPromises);

// Phase 3: Parallel file sharing
const sharePromises = uploadedFiles.map(file =>
  uploadService.shareFile(file.id, profile.id, authToken)
);
await Promise.all(sharePromises);
```

**Error Handling**:

- Profile lookup fails → 404
- Relationship creation fails → 500/502
- Any upload fails → rollback? or partial success? (NEEDS CLARIFICATION in implementation)
- Message send fails after uploads → orphaned uploads (acceptable - uploads are shared, cleanup is downstream responsibility)

**Alternatives considered**:

- Saga pattern with compensation: Rejected as over-engineering (gateway doesn't own data)
- Sequential uploads: Rejected due to performance impact (3-5 files = 3-5x latency)

## TypeBox Schema Patterns

### Decision: Define reusable TypeBox schemas for all entities

**Rationale**: TypeBox provides compile-time type safety and runtime validation. Schemas serve as single source of truth for types and OpenAPI docs.

**Best Practices**:

- Define schemas in dedicated files under `src/schemas/`
- Use `Type.` constructors for all types
- Add `.describe()` for documentation
- Export both the schema and the inferred TypeScript type
- Compose complex schemas from simpler ones
- Use `Type.Union()` for alternative recipient identification

**Example Pattern**:

```typescript
import { Type, Static } from '@sinclair/typebox';

export const RecipientByEmailSchema = Type.Object({
  firstName: Type.String({ minLength: 1, describe: 'Recipient first name' }),
  lastName: Type.String({ minLength: 1, describe: 'Recipient last name' }),
  email: Type.String({ format: 'email', describe: 'Recipient email address' }),
  ppsn: Type.Optional(Type.String({ pattern: '^[0-9]{7}[A-Z]{1,2}$', describe: 'Optional PPSN' })),
  dateOfBirth: Type.Optional(Type.String({ format: 'date', describe: 'Optional date of birth' }))
});

export type RecipientByEmail = Static<typeof RecipientByEmailSchema>;
```

**Alternatives considered**:

- Zod: Rejected because project uses TypeBox
- JSON Schema: Rejected because TypeBox provides better TypeScript integration

## Authentication & Authorization Flow

### Decision: Reuse existing gateway-auth plugin, verify organizationId presence

**Rationale**: The `gateway-auth.ts` plugin already implements `gatewayCheckPermissions` which validates authentication and checks for organizationId. This is exactly what's needed.

**Implementation**:

```typescript
// In route preHandler hook
fastify.addHook('preHandler', async (request, reply) => {
  await fastify.gatewayCheckPermissions(request, reply, []);
});
```

**Token Forwarding**:

```typescript
// Extract token from request
const authToken = request.headers.authorization;

// Pass to SDK clients
const profileClient = buildingBlocksSDK.profile({ 
  authToken 
});
```

**Alternatives considered**:

- Implement custom auth check: Rejected because gateway-auth already exists
- Use @ogcio/api-auth directly: Rejected because gateway-auth wraps it appropriately

## Logging and Observability

### Decision: Use @ogcio/fastify-logging-wrapper + @ogcio/o11y-sdk-node (already configured)

**Rationale**: Structured logging and OpenTelemetry instrumentation are already integrated. Need to ensure proper context propagation and metric collection.

**Best Practices**:

- Log all downstream API calls with duration and status
- Include organizationId in all log entries
- Use correlation IDs for request tracing
- Log errors with full context (request details, user info sanitized)
- Create custom metrics: message_send_duration, profile_lookup_duration, upload_count
- Use appropriate log levels: debug for flows, info for events, error for failures

**Structured Logging Pattern**:

```typescript
request.log.info({
  action: 'message_send_initiated',
  organizationId: request.userData.organizationId,
  recipientType: recipientIdentifier.type,
  attachmentCount: files.length
});
```

**Alternatives considered**:

- Console.log: Rejected - not structured
- Winston/Pino directly: Rejected - wrapper provides standardization

## Summary of Decisions

| Area | Decision | Key Rationale |
|------|----------|---------------|
| Downstream APIs | @ogcio/building-blocks-sdk | Typed, maintained, standardized |
| File Uploads | @fastify/multipart | Official plugin, streaming support |
| Documentation | @fastify/swagger + swagger-ui | Auto-gen from TypeBox schemas |
| Error Handling | @ogcio/fastify-error-handler | Centralized, consistent format |
| Pagination | Extend existing utils with HATEOAS | Existing foundation, add links |
| Orchestration | Service layer with Promise.all | Parallel execution, testable |
| Schemas | TypeBox patterns | Type-safe, composable, documented |
| Auth | Reuse gateway-auth plugin | Already implements requirements |
| Observability | Existing wrappers | Structured logging, tracing |

All technical unknowns from planning phase are now resolved. Ready for Phase 1 design.
