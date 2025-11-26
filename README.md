# GovIE MessagingIE API Gateway

Gateway service exposing a curated set of MessagingIE capabilities for authorised Public Servants. It provides APIs to:

- Send a message (optionally with up to 3 attachments)
- Retrieve the full event history for a message
- Retrieve the latest (most recent) event for multiple messages

Access is restricted to authenticated Public Servant applications (client credential flow). The gateway wraps downstream services and applies organisation scoping, validation, retry logic and consistent error responses.

## Features

- **Type Safety**: Full TypeScript support with TypeBox schema validation
- **API Documentation**: Auto-generated OpenAPI (Swagger UI served at `/docs`)
- **Observability**: Integrated logging, metrics, and tracing with OpenTelemetry
- **Testing**: Complete test suite with Vitest and testcontainers
- **Code Quality**: Biome for linting and formatting, Husky for git hooks

## Prerequisites

- Node.js >= 22.0.0
- pnpm (recommended) or npm

## Authentication

All endpoints (except `/health`) require a bearer token obtained via the OAuth2 client credentials flow. Request a `client_id` and `client_secret` and perform:

```bash
curl --request POST \
  --url {AUTH_URL}/oidc/token \
  --header 'authorization: Basic {BASE64(clientId:clientSecret)}' \
  --header 'content-type: application/x-www-form-urlencoded' \
  --data grant_type=client_credentials \
  --data 'scope=messaging:event:read profile:user.admin:* messaging:message:* upload:file:*' \
  --data organization_id={ORGANIZATION_ID}
```

Include the resulting access token in requests:

```bash
Authorization: Bearer <access_token>
```

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install
```

### Environment Configuration

Copy the `.env.sample` to `.env` file and set your values.

### Development

```bash
# Start development server with hot reload
pnpm run dev
```

The server will start on `http://localhost:8123` (or your configured PORT).

### API Documentation

Once the server is running you can access:

- **Swagger UI**: `http://localhost:8123/docs`
- **OpenAPI JSON**: `GET /docs/json`
- **OpenAPI Definition File**: Generated as `openapi-definition.yml` on start

## Available Scripts

- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Build the application for production
- `pnpm run start` - Start production server
- `pnpm run test` - Run test suite with coverage
- `pnpm run lint` - Run linter and auto-fix issues
- `pnpm run format` - Format code with Biome

For the other scripts, check [package.json](package.json).

## Project Structure

```text
src/
├── index.ts               # Application entry point
├── server.ts              # Fastify instance creation & boot
├── instrumentation.ts     # OpenTelemetry setup
├── const/                 # Static constants (e.g. pagination, attachment limits)
├── plugins/
│   ├── external/          # Third-party & cross-cutting plugins (env, swagger, multipart, under-pressure)
│   └── internal/          # Internal plugins (auth wrappers, error handler, logging, cache, SDK bindings)
├── public/                # Static assets served under / (e.g. logo for docs)
├── routes/
│   ├── healthcheck.ts     # GET /health endpoint
│   ├── shared-routes.ts   # Common route types & helpers
│   └── api/v1/messages/   # Messaging endpoints (send, latest event, history)
├── schemas/               # TypeBox schemas (message, attachment, pagination, recipient, responses)
├── services/              # Orchestration & downstream service wrappers
├── utils/                 # Utility helpers (auth, pagination, retry, package info)
├── types/                 # Type augmentation (Fastify declarations)
└── test/                  # Test suite (routes, services, utils, contracts)
```

## Runtime Dependencies (Dev)

Before starting `pnpm dev`, ensure the following services are available (locally or in a reachable environment):

- `profile-api`
- `upload-api`
- `messaging-api`
- `scheduler-api`
- `logto` (for auth / token issuance)

## API Endpoints

### Health Check

- `GET /health` - Returns service health and version information

### Messaging Endpoints

The gateway provides three core messaging endpoints for Public Servants to send messages and query message events.

#### Send Message (multipart form)

- `POST /api/v1/messages` - Send a message with optional file attachments (max 3 per message)

**Features:**

- Support for both email and identity-based recipient lookup
- Optional file attachments with automatic upload and sharing
- Scheduled message delivery (immediate or future timestamps)
- Atomic failure handling with automatic cleanup
- Retry logic for transient errors (502/503/504)

**Request Body** (multipart/form-data):

- `subject` (required): Message subject
- `plainTextBody` (required): Plain text message content
- `htmlBody` (optional): HTML formatted message content
- `securityLevel` (required): Either "public" or "confidential"
- `language` (required): Message language ("en" or "ga")
- `scheduledAt` (required): ISO 8601 timestamp for delivery
- `recipient` (required): JSON object with recipient details
  - For email: `{ "type": "email", "firstName": "...", "lastName": "...", "email": "..." }`
  - For identity: `{ "type": "identity", "ppsn": "...", "dateOfBirth": "..." }`
- `attachments` (optional): Up to 3 file parts. Provide multiple parts each with the same field name `attachments`:
  - `attachments=@file1.pdf`
  - `attachments=@file2.png`
  - `attachments=@file3.txt`

Example multipart (curl):

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F 'subject=Your Tax Return is Ready' \
  -F 'plainTextBody=Dear Jane, your tax return is ready.' \
  -F 'securityLevel=confidential' \
  -F 'language=en' \
  -F 'scheduledAt=2025-11-25T14:30:00Z' \
  -F 'recipient={"type":"email","firstName":"Jane","lastName":"Doe","email":"jane.doe@example.ie"}' \
  -F 'attachments=@/path/to/statement.pdf' \
  -F 'attachments=@/path/to/summary.txt' \
  http://localhost:8123/api/v1/messages
```

**Response** (201 Created):

```json
{
  "data": {
    "messageId": "uuid",
    "recipientId": "profile-id",
    "attachmentIds": ["file-uuid-1", "file-uuid-2"]
  }
}
```

#### Get Latest Event For Messages

- `POST /api/v1/messages/events` - Retrieve latest event for messages with filters & pagination

**Features:**

- Pagination support with HATEOAS links
- Filter by recipient email
- Organization-level data isolation
- Configurable page size (limit/offset)

**Pagination Query Parameters:**

- `limit` (optional): Page size (default: 20)
- `offset` (optional): Offset for pagination (default: 0)

**Body Filters (JSON, all optional):**

- `recipientEmail`: Filter by recipient email
- `recipientId`: Filter by recipient profile UUID
- `subjectContains`: Case-insensitive subject substring match
- `dateFrom`: ISO 8601 start timestamp
- `dateTo`: ISO 8601 end timestamp
- `status`: One of `delivered | scheduled | opened | failed`

**Response** (200 OK):

```json
{
  "data": [
    {
      "messageId": "uuid",
      "subject": "Message subject",
      "recipientId": "profile-id",
      "recipientEmail": "user@example.ie",
      "eventType": "sent",
      "timestamp": "2025-11-21T10:00:00Z",
      "details": {}
    }
  ],
  "metadata": {
    "totalCount": 47,
    "limit": 20,
    "offset": 0,
    "links": {
      "self": "/api/v1/messages/events?limit=20&offset=0",
      "first": "/api/v1/messages/events?limit=20&offset=0",
      "previous": null,
      "next": "/api/v1/messages/events?limit=20&offset=20",
      "last": "/api/v1/messages/events?limit=20&offset=40"
    }
  }
}
```

#### Get Message Event History

- `GET /api/v1/messages/:messageId/events` - Retrieve chronological event history for a specific message

**Features:**

- Complete event timeline in chronological order (oldest first)
- Pagination support for messages with many events
- Message metadata included with events
- 404 response for non-existent or unauthorized messages

**Path Parameters:**

- `messageId` (required): UUID of the message

**Query Parameters:**

- `limit` (optional): Number of events per page
- `offset` (optional): Number of events to skip

**Response** (200 OK):

```json
{
  "data": {
    "messageId": "uuid",
    "subject": "Message subject",
    "recipientId": "profile-id",
    "recipientEmail": "user@example.ie",
    "events": [
      {
        "eventType": "queued",
        "timestamp": "2025-11-21T10:00:00Z",
        "details": {}
      },
      {
        "eventType": "sent",
        "timestamp": "2025-11-21T10:00:15Z",
        "details": { "deliveryAttempts": 1 }
      },
      {
        "eventType": "delivered",
        "timestamp": "2025-11-21T10:00:22Z",
        "details": { "smtpResponse": "250 OK" }
      }
    ]
  }
}
```

**Authentication:** All messaging endpoints require a valid bearer token (see Authentication section) containing the `organizationId` claim.

**Error Responses:**

- `400 Bad Request` - Invalid request parameters or validation errors
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions or missing organization ID
- `404 Not Found` - Recipient or message not found
- `502 Bad Gateway` - Downstream service failure
- `503 Service Unavailable` - Temporary service outage

For detailed examples and quickstart guide, see [specs/001-messaging-gateway-endpoints/quickstart.md](specs/001-messaging-gateway-endpoints/quickstart.md).

## Retry Logic

Transient downstream errors are retried automatically using exponential backoff with full jitter:

- Status codes considered transient: `502`, `503`, `504` plus network timeouts (`ETIMEDOUT`, `ECONNRESET`)
- Non-retryable: All `4xx` client errors
- Attempts: Up to 3 total (initial + 2 retries)
- Base delay: 100ms; nominal sequence 100ms → 200ms → 400ms
- Jitter: Each delay randomized within ±50% (i.e. 50%–150% of nominal)
- Logging: Each retry attempt is logged with attempt number and delay

Implementation: see `src/utils/retry.ts`.

## Testing

The project includes comprehensive testing with:

- **Unit Tests**: Component and utility testing
- **Integration Tests**: Full API endpoint testing
- **Coverage Reports**: Detailed code coverage analysis

```bash
# Run all tests
pnpm run test

# Run tests in watch mode (development)
pnpm run test:watch
```

## Docker Support

### Building the Image

```bash
docker build -t messaging-api-gateway:latest --build-arg "PORT={your port}" .
```

### Running with Docker

```bash
docker run -p {PORT}:{PORT} --env-file .env --name messaging-api-gateway --rm messaging-api-gateway:latest
```

## Notes

- Only available to authorised Public Servant clients.
- Health endpoint (`/health`) is omitted from Swagger UI.
- OpenAPI UI served at `/docs`; JSON spec at `/docs/json`.
