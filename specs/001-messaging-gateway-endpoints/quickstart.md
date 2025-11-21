# Quickstart: Messaging Gateway Endpoints

**Created**: 2025-11-20  
**Purpose**: Validate implementation by following step-by-step instructions  
**Audience**: Developers testing the implementation

## Prerequisites

- Node.js >= 22.0.0
- pnpm installed
- Access to downstream APIs (profile-api, messaging-api, upload-api)
- Valid JWT token for a public servant user with `organizationId`
- Test recipient profiles in the profile system

## Environment Setup

1. **Clone and install dependencies**:

```bash
git clone <repository-url>
cd govie-services-messaging-api-gateway
git checkout 001-messaging-gateway-endpoints
pnpm install
```

2. **Configure environment variables**:

Create a `.env` file with:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Downstream API URLs
PROFILE_API_URL=https://profile-api.example.ie
MESSAGING_API_URL=https://messaging-api.example.ie
UPLOAD_API_URL=https://upload-api.example.ie

# Authentication
AUTH_PUBLIC_KEY=<your-public-key>

# Logging
LOG_LEVEL=debug
```

3. **Start the development server**:

```bash
pnpm run dev
```

The server should start on `http://localhost:3000` and display:

```
Server listening at http://localhost:3000
OpenAPI documentation available at http://localhost:3000/documentation
```

## Validation Steps

### Step 1: Verify Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response** (200 OK):

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

### Step 2: View API Documentation

Open your browser to `http://localhost:3000/documentation` and verify:

- ✅ Three message endpoints are documented
- ✅ All request/response schemas are visible
- ✅ Authentication requirements are shown
- ✅ HTTP status codes are documented

### Step 3: Test Authentication (Should Fail Without Token)

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test",
    "plainTextBody": "Test body",
    "securityLevel": "public",
    "language": "en",
    "scheduledAt": "2025-11-20T14:00:00Z",
    "recipient": {
      "type": "email",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.ie"
    }
  }'
```

**Expected Response** (401 Unauthorized):

```json
{
  "error": {
    "message": "No authorization header found",
    "statusCode": 401,
    "code": "UNAUTHORIZED"
  }
}
```

### Step 4: Send Message Without Attachments

**Setup**: Get a valid JWT token for a user with `organizationId` set.

```bash
export TOKEN="<your-jwt-token>"

curl -X POST http://localhost:3000/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test message from quickstart",
    "plainTextBody": "This is a test message to verify the gateway is working correctly.",
    "htmlBody": "<p>This is a <strong>test message</strong> to verify the gateway is working correctly.</p>",
    "securityLevel": "public",
    "language": "en",
    "scheduledAt": "2025-11-20T14:00:00Z",
    "recipient": {
      "type": "email",
      "firstName": "Test",
      "lastName": "User",
      "email": "test.user@example.ie"
    }
  }'
```

**Expected Response** (201 Created):

```json
{
  "data": {
    "messageId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "recipientId": "profile-12345",
    "attachmentIds": []
  }
}
```

**Validation Checks**:

- ✅ Response has HTTP 201 status
- ✅ `messageId` is a valid UUID
- ✅ `recipientId` matches the profile system ID
- ✅ `attachmentIds` is an empty array

### Step 5: Send Message With Attachments

Create a test file:

```bash
echo "This is a test attachment" > test-attachment.txt
```

Send message with attachment:

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -F "subject=Message with attachment" \
  -F "plainTextBody=This message includes a file attachment." \
  -F "securityLevel=confidential" \
  -F "language=en" \
  -F "scheduledAt=2025-11-20T15:00:00Z" \
  -F 'recipient={"type":"email","firstName":"Test","lastName":"User","email":"test.user@example.ie"}' \
  -F "attachments=@test-attachment.txt"
```

**Expected Response** (201 Created):

```json
{
  "data": {
    "messageId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "recipientId": "profile-12345",
    "attachmentIds": ["file-uuid-1"]
  }
}
```

**Validation Checks**:

- ✅ Response has HTTP 201 status
- ✅ `attachmentIds` array has one element
- ✅ Attachment ID is a valid UUID

### Step 5a: Scheduling Semantics (Past vs Future)

The `scheduledAt` field controls deferred dispatch. Current semantics:

- A timestamp in the PAST is still forwarded; downstream may choose to dispatch immediately.
- A timestamp in the FUTURE (e.g. +1h) is accepted and forwarded unchanged (`scheduleAt`).
- There is no server-side delay queue in the gateway; scheduling is delegated to downstream messaging service.

Example future schedule:

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -F "subject=Future scheduled message" \
  -F "plainTextBody=This will be processed later." \
  -F "securityLevel=public" \
  -F "language=en" \
  -F "scheduledAt=$(date -u -v+1H +"%Y-%m-%dT%H:%M:%SZ")" \
  -F 'recipient={"type":"email","firstName":"Test","lastName":"User","email":"test.user@example.ie"}'
```

### Step 5b: Atomic Failure & Cleanup Example

If an attachment upload fails (e.g. transient 502 persisting across retries), the gateway aborts the send and attempts best-effort deletion of already uploaded files.

Simulate failure (example assumes downstream returns 502 for a specific filename):

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -F "subject=Failure simulation" \
  -F "plainTextBody=One attachment will fail." \
  -F "securityLevel=confidential" \
  -F "language=en" \
  -F "scheduledAt=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  -F 'recipient={"type":"email","firstName":"Test","lastName":"User","email":"test.user@example.ie"}' \
  -F "attachments=@failing-attachment.bin"
```

**Expected Response** (502 Bad Gateway):

```json
{
  "error": {
    "message": "Failed to upload file",
    "statusCode": 502,
    "code": "BAD_GATEWAY"
  }
}
```

Log output will include:

```text
{"phase":"upload_phase_start",...}
{"phase":"cleanup_phase_start",...}
{"phase":"cleanup_phase_end","deleted":2,"attempted":2,"successRate":"100.0%",...}
```

No message is dispatched; no partial artifacts remain (FR-030, FR-031).

### Step 5c: Retry Behavior Illustration

Transient errors (502/503/504, ETIMEDOUT, ECONNRESET) during upload/share are retried up to 3 attempts with exponential backoff (nominal 100ms, 200ms, 400ms ±50% jitter). Client errors (4xx) are not retried.

Sample log lines for retries:

```text
{"msg":"retry_attempt","attempt":1,"statusCode":502,"delayMs":137}
{"msg":"retry_attempt","attempt":2,"statusCode":503,"delayMs":295}
```

After final failed attempt a 502 error response is returned and cleanup is initiated.

### Step 6: Query Latest Message Events

```bash
curl -X GET "http://localhost:3000/v1/messages/events?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):

```json
{
  "data": [
    {
      "messageId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "subject": "Test message from quickstart",
      "recipientId": "profile-12345",
      "recipientEmail": "test.user@example.ie",
      "eventType": "sent",
      "timestamp": "2025-11-20T14:00:15Z",
      "details": {}
    }
  ],
  "metadata": {
    "totalCount": 2,
    "limit": 10,
    "offset": 0,
    "links": {
      "first": "/v1/messages/events?limit=10&offset=0",
      "previous": null,
      "next": null,
      "last": "/v1/messages/events?limit=10&offset=0"
    }
  }
}
```

**Validation Checks**:

- ✅ Response has HTTP 200 status
- ✅ `data` is an array of message events
- ✅ `metadata.totalCount` reflects total messages
- ✅ `metadata.links` contains pagination URLs
- ✅ Only messages from user's organization are returned

### Step 7: Pagination Response Structure Example (T035)

The pagination response demonstrates the **GenericResponse** envelope with HATEOAS links as specified in FR-021, FR-022, and FR-034.

**Key Features**:
- `data`: Array of message event objects
- `metadata.totalCount`: Forwarded unchanged from downstream (FR-034)
- `metadata.links`: HATEOAS navigation (first, previous, next, last, self)
- `metadata.limit` and `metadata.offset`: Echo sanitized request values

#### Example: GET /v1/messages/events?limit=10&offset=20

Response (200 OK):

```json
{
  "data": [
    {
      "messageId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "subject": "Test message from quickstart",
      "recipientId": "profile-12345",
      "recipientEmail": "test.user@example.ie",
      "eventType": "sent",
      "timestamp": "2025-11-20T14:00:15Z",
      "details": {}
    },
    {
      "messageId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "subject": "Message with attachment",
      "recipientId": "profile-12345",
      "recipientEmail": "test.user@example.ie",
      "eventType": "delivered",
      "timestamp": "2025-11-20T14:05:22Z",
      "details": { "smtpResponse": "250 OK" }
    }
  ],
  "metadata": {
    "totalCount": 47,
    "limit": 10,
    "offset": 20,
    "links": {
      "self": "/v1/messages/events?limit=10&offset=20",
      "first": "/v1/messages/events?limit=10&offset=0",
      "previous": "/v1/messages/events?limit=10&offset=10",
      "next": "/v1/messages/events?limit=10&offset=30",
      "last": "/v1/messages/events?limit=10&offset=40"
    }
  }
}
```

**Edge Cases Covered** (per spec addendum):


1. **Zero Results** (`totalCount=0`):

  ```json
   {
     "data": [],
     "metadata": {
       "totalCount": 0,
       "limit": 20,
       "offset": 0,
       "links": {
         "self": "/v1/messages/events?limit=20&offset=0",
         "first": "/v1/messages/events?limit=20&offset=0",
         "previous": null,
         "next": null,
         "last": "/v1/messages/events?limit=20&offset=0"
       }
     }
   }
   ```

1. **Single Page** (totalCount ≤ limit):

  ```json
   {
     "data": [ /* 5 events */ ],
     "metadata": {
       "totalCount": 5,
       "limit": 20,
       "offset": 0,
       "links": {
         "self": "/v1/messages/events?limit=20&offset=0",
         "first": "/v1/messages/events?limit=20&offset=0",
         "previous": null,
         "next": null,
         "last": "/v1/messages/events?limit=20&offset=0"
       }
     }
   }
   ```

1. **Filters Preserved in Links**:
  For `GET /v1/messages/events?recipientEmail=test@example.ie&limit=10&offset=0`:

  ```json
   {
     "metadata": {
       "links": {
         "self": "/v1/messages/events?recipientEmail=test@example.ie&limit=10&offset=0",
         "next": "/v1/messages/events?recipientEmail=test@example.ie&limit=10&offset=10",
         ...
       }
     }
   }
   ```

### Step 8: Filter Message Events by Recipient

```bash
curl -X GET "http://localhost:3000/v1/messages/events?recipientEmail=test.user@example.ie" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):

```json
{
  "data": [
    {
      "messageId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "subject": "Test message from quickstart",
      "recipientId": "profile-12345",
      "recipientEmail": "test.user@example.ie",
      "eventType": "sent",
      "timestamp": "2025-11-20T14:00:15Z",
      "details": {}
    }
  ],
  "metadata": {
    "totalCount": 1,
    "limit": 20,
    "offset": 0,
    "links": {
      "first": "/v1/messages/events?recipientEmail=test.user@example.ie&limit=20&offset=0",
      "previous": null,
      "next": null,
      "last": "/v1/messages/events?recipientEmail=test.user@example.ie&limit=20&offset=0"
    }
  }
}
```

**Validation Checks**:

- ✅ Only events for the specified recipient email are returned
- ✅ Filter parameter is preserved in pagination links

### Step 9: Get Message Event History

```bash
MESSAGE_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"  # Use actual ID from Step 4

curl -X GET "http://localhost:3000/v1/messages/$MESSAGE_ID/events" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):

```json
{
  "data": {
    "messageId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "subject": "Test message from quickstart",
    "recipientId": "profile-12345",
    "recipientEmail": "test.user@example.ie",
    "events": [
      {
        "eventType": "queued",
        "timestamp": "2025-11-20T14:00:10Z",
        "details": {}
      },
      {
        "eventType": "sent",
        "timestamp": "2025-11-20T14:00:15Z",
        "details": {
          "deliveryAttempts": 1
        }
      },
      {
        "eventType": "delivered",
        "timestamp": "2025-11-20T14:00:22Z",
        "details": {
          "smtpResponse": "250 OK"
        }
      }
    ]
  }
}
```

**Validation Checks**:

- ✅ Response has HTTP 200 status
- ✅ `events` array contains all events in chronological order
- ✅ Each event has `eventType`, `timestamp`, and optional `details`

### Step 10: Test Recipient Not Found (Error Case)

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test to non-existent recipient",
    "plainTextBody": "This should fail.",
    "securityLevel": "public",
    "language": "en",
    "scheduledAt": "2025-11-20T14:00:00Z",
    "recipient": {
      "type": "identity",
      "ppsn": "9999999Z",
      "dateOfBirth": "1990-01-01"
    }
  }'
```

**Expected Response** (404 Not Found):

```json
{
  "error": {
    "message": "Recipient not found in profile system",
    "statusCode": 404,
    "code": "RECIPIENT_NOT_FOUND"
  }
}
```

**Validation Checks**:

- ✅ Response has HTTP 404 status
- ✅ Error message clearly indicates recipient not found

### Step 11: Test Validation Error (Error Case)

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "",
    "plainTextBody": "Body",
    "securityLevel": "invalid",
    "language": "en",
    "scheduledAt": "2025-11-20T14:00:00Z",
    "recipient": {
      "type": "email",
      "firstName": "Test",
      "lastName": "User",
      "email": "invalid-email"
    }
  }'
```

**Expected Response** (400 Bad Request):

```json
{
  "error": {
    "message": "Validation failed: subject must have at least 1 character, securityLevel must be 'confidential' or 'public', email must be a valid email format",
    "statusCode": 400,
    "code": "VALIDATION_ERROR"
  }
}
```

**Validation Checks**:

- ✅ Response has HTTP 400 status
- ✅ Error message details all validation failures

## Running Tests

### Unit Tests

```bash
pnpm run test
```

**Expected**:

- ✅ All service unit tests pass
- ✅ All utility unit tests pass
- ✅ Code coverage >= 80%

### Integration Tests

Integration tests automatically run as part of the test suite:

```bash
pnpm run test
```

**Expected**:

- ✅ All route integration tests pass
- ✅ Authentication middleware tests pass
- ✅ Error handling tests pass

### Contract Tests

Contract tests validate that the implementation matches the OpenAPI schemas:

```bash
pnpm run test
```

**Expected**:

- ✅ All request schemas validate correctly
- ✅ All response schemas validate correctly
- ✅ All HTTP status codes match specification

## Troubleshooting

### Issue: "Downstream service temporarily unavailable" (503)

**Cause**: One of the downstream APIs (profile, messaging, upload) is not reachable.

**Solution**:

1. Check environment variables for correct API URLs
2. Verify downstream services are running
3. Check network connectivity
4. Review logs for specific service errors

### Issue: "No organization ID found in user data" (401)

**Cause**: JWT token doesn't include `organizationId` claim.

**Solution**:

1. Verify your JWT token includes the `organizationId` claim
2. Check token is not expired
3. Ensure you're using a public servant user token, not a regular user

### Issue: Multipart form parsing error

**Cause**: Incorrect Content-Type header or malformed multipart data.

**Solution**:

1. Use `-F` flag with curl (not `-d`) for multipart requests
2. Ensure recipient JSON is properly formatted
3. Verify file exists and is readable

### Issue: Tests failing

**Cause**: Various causes - missing dependencies, configuration errors, etc.

**Solution**:

1. Run `pnpm install` to ensure all dependencies are installed
2. Check `.env` file has all required variables
3. Review test output for specific errors
4. Ensure test databases/services are available

## Success Criteria

After completing all validation steps, you should have:

- ✅ Successfully sent a message without attachments
- ✅ Successfully sent a message with file attachments
- ✅ Successfully queried latest message events with pagination
- ✅ Successfully filtered message events by recipient
- ✅ Successfully retrieved complete event history for a message
- ✅ Verified error handling for non-existent recipients (404)
- ✅ Verified validation error handling (400)
- ✅ Verified authentication enforcement (401)
- ✅ All automated tests passing
- ✅ API documentation is accurate and complete

## Next Steps

Once quickstart validation is complete:

1. Review implementation against constitution principles
2. Run performance tests with concurrent requests
3. Review security audit checklist
4. Prepare for production deployment
5. Update team documentation with any learnings

## Notes

- All API responses use consistent JSON structure with `data` and optional `metadata`
- Authentication is enforced on all endpoints via the existing gateway-auth plugin
- Organization-level data isolation is handled transparently by the Building Blocks SDK
- File uploads are streamed to minimize memory usage
- Pagination uses limit/offset with HATEOAS links for easy navigation
- **Multipart-only**: The send-message endpoint currently accepts multipart/form-data only; JSON fallback is deferred.
- **Scheduling**: `scheduledAt` is forwarded unchanged; gateway does not internally queue messages.
- **Retry behavior** (FR-032, FR-039): Transient errors (502/503/504, ETIMEDOUT, ECONNRESET) are retried (max 3 attempts). 4xx errors fail immediately with original status.
- **Cleanup behavior** (FR-031, SC-008): On failure after any successful upload/share, best-effort deletion runs; success rate logged (`deleted/attempted`). Target ≥95%. Breach alerting to be added in polish phase.
- **Atomicity**: No partial message dispatch occurs if any pre-dispatch phase fails (recipient lookup, upload, share).
