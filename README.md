# GovIE MessagingIE API Gateway

A production-ready Node.js API scaffolding built with Fastify, featuring TypeScript, OpenAPI documentation, and comprehensive observability tooling.

## Features

- **Type Safety**: Full TypeScript support with TypeBox schema validation
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation
- **Observability**: Integrated logging, metrics, and tracing with OpenTelemetry
- **Testing**: Complete test suite with Vitest and testcontainers
- **Code Quality**: Biome for linting and formatting, Husky for git hooks

## Prerequisites

- Node.js >= 22.0.0
- pnpm (recommended) or npm

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

The server will start on `http://localhost:3000` (or your configured PORT).

### API Documentation

Once the server is running, you can access:

- **Swagger UI**: `http://localhost:3000/documentation`
- **OpenAPI Spec**: The `openapi-definition.yml` file is auto-generated on server start

## Available Scripts

- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Build the application for production
- `pnpm run start` - Start production server
- `pnpm run test` - Run test suite with coverage
- `pnpm run lint` - Run linter and auto-fix issues
- `pnpm run format` - Format code with Biome

For the other scripts, check [package.json](package.json).

## Project Structure

```
src/
├── index.ts              # Application entry point
├── server.ts             # Server configuration
├── instrumentation.ts    # OpenTelemetry setup
├── plugins/
│   └── external/         # External plugins (env, swagger, etc.)
│   └── internal/         # Internal plugins (logger, error handler, etc.)
├── routes/
│   ├── healthcheck.ts    # Health check endpoint
│   └── examples/         # Example API routes
├── schemas/              # Shared schema definitions
├── utils/                # Utility functions
├── migrations/           # Database migration scripts
└── test/                 # Test files and utilities
```

## API Endpoints

### Health Check

- `GET /health` - Returns service health and version information

### Examples

- `GET /api/v1/examples/` - List examples with pagination support

### Messaging Endpoints

The gateway provides three core messaging endpoints for public servants to send messages and query message events.

#### Send Message with Attachments

- `POST /api/v1/messages` - Send a message with optional file attachments

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
- `attachments` (optional): One or more file uploads

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

#### Query Latest Message Events

- `GET /api/v1/messages/events` - Query recent message events with filters and pagination

**Features:**

- Pagination support with HATEOAS links
- Filter by recipient email
- Organization-level data isolation
- Configurable page size (limit/offset)

**Query Parameters:**

- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Number of results to skip (default: 0)
- `recipientEmail` (optional): Filter events by recipient email address

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

**Authentication:**

All messaging endpoints require a valid JWT token with `organizationId` claim. Include the token in the `Authorization` header:

```bash
Authorization: Bearer <your-jwt-token>
```

**Error Responses:**

- `400 Bad Request` - Invalid request parameters or validation errors
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Insufficient permissions or missing organization ID
- `404 Not Found` - Recipient or message not found
- `502 Bad Gateway` - Downstream service failure
- `503 Service Unavailable` - Temporary service outage

For detailed examples and quickstart guide, see [specs/001-messaging-gateway-endpoints/quickstart.md](specs/001-messaging-gateway-endpoints/quickstart.md).

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
docker run -p {your port}:{your port} --env-file .env --name messaging-api-gateway --rm messaging-api-gateway:latest
```
