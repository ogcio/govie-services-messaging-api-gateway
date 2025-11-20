# Data Model: Messaging Gateway Endpoints

**Created**: 2025-11-20  
**Phase**: 1 (Design & Contracts)  
**Purpose**: Define entities, relationships, and validation rules

## Overview

This gateway does not persist data - it orchestrates calls to downstream APIs. The data model describes the logical entities that flow through the gateway and their relationships, which inform the TypeBox schemas and API contracts.

## Entities

### Message

Represents a communication from a public servant to a citizen.

**Properties**:

- `subject` (string, required): Subject line of the message (1-200 characters)
- `plainTextBody` (string, required): Plain text body content (1-10000 characters)
- `htmlBody` (string, optional): HTML formatted body content (1-50000 characters)
- `securityLevel` (enum, required): 'confidential' | 'public'
- `language` (enum, required): 'en' | 'ga'
- `scheduledAt` (ISO 8601 datetime, required): When to send the message
  - If in the past or present: send immediately
  - If in the future: schedule for that time
- `senderOrganizationId` (string, required): Derived from authenticated user's organizationId
- `recipientId` (string, required): Profile ID of the recipient (obtained from profile-api)
- `attachmentIds` (array of strings, optional): IDs of uploaded attachments

**Validation Rules**:

- `scheduledAt` must be valid ISO 8601 format
- `securityLevel` must be exactly 'confidential' or 'public'
- `language` must be exactly 'en' or 'ga'
- If `htmlBody` provided, `plainTextBody` still required
- At least one of `plainTextBody` or `htmlBody` must be non-empty after trimming

**State Transitions**: N/A (gateway does not track state, messaging-api owns this)

**Source**: User input (request body) + derived fields (organizationId from auth)

### Recipient

Represents a citizen receiving a message. Can be identified by two methods.

**Identification Method 1: Email-based** (with optional identity verification)

- `firstName` (string, required): 1-100 characters
- `lastName` (string, required): 1-100 characters
- `email` (string, required): Valid email format
- `ppsn` (string, optional): 7 digits + 1-2 letters (e.g., 1234567A)
- `dateOfBirth` (string, optional): ISO 8601 date format (YYYY-MM-DD)

#### Identification Method 2: Identity-based

- `ppsn` (string, required): 7 digits + 1-2 letters
- `dateOfBirth` (string, required): ISO 8601 date format (YYYY-MM-DD)

**Validation Rules**:

- PPSN regex: `^[0-9]{7}[A-Z]{1,2}$`
- Email must be valid email format
- dateOfBirth must be in the past
- dateOfBirth cannot be more than 120 years ago
- Must provide either Method 1 or Method 2 (enforced via TypeBox Union)

**Relationships**:

- **Has Profile** (1:1 required): Recipient must exist in profile-api
- **Has Organization Relationship** (1:1 required): Recipient must have relationship with sender's organization
  - If relationship doesn't exist and Method 1 data provided: create it
  - If relationship doesn't exist and only Method 2 provided: return 400 (insufficient data to create)

**Source**: User input (request body)

### Attachment

Represents a file attached to a message.

**Properties**:

- `id` (string, required): UUID from upload-api
- `filename` (string, required): Original filename
- `contentType` (string, required): MIME type
- `size` (number, required): File size in bytes
- `uploadedAt` (ISO 8601 datetime, required): When file was uploaded

**Validation Rules**:

- File size must be ≤ 50MB (enforced at multipart parsing)
- Maximum 10 files per message
- Allowed content types: (defer to upload-api for enforcement)

**Relationships**:

- **Belongs to Message** (N:1): Multiple attachments can belong to one message
- **Shared with Recipient** (N:1): Each attachment must be shared with the recipient

**Workflow**:

1. Gateway receives file in multipart request
2. Gateway uploads to upload-api → receives attachment ID
3. Gateway shares attachment with recipient via upload-api
4. Gateway includes attachment IDs in message payload to messaging-api

**Source**: User upload (multipart form-data)

### MessageEvent

Represents a status change in a message's lifecycle.

**Properties**:

- `messageId` (string, required): ID of the message
- `eventType` (string, required): Type of event (e.g., 'sent', 'delivered', 'read', 'failed')
- `timestamp` (ISO 8601 datetime, required): When the event occurred
- `details` (object, optional): Additional event-specific information

**Validation Rules**: N/A (read-only from messaging-api)

**Relationships**:

- **Belongs to Message** (N:1): Multiple events can exist for one message
- **Latest Event** (1:1): Each message has one "latest" event

**Queries Supported**:

- Get latest event for each message (paginated, filtered)
- Get all events for a specific message (chronological order)

**Filters** (for latest events query):

- `recipientId` (string, optional): Filter by recipient
- `subject` (string, optional): Filter by subject substring
- `startDate` (ISO 8601 date, optional): Events after this date
- `endDate` (ISO 8601 date, optional): Events before this date
- `recipientEmail` (string, optional): Filter by recipient email

**Source**: messaging-api (read-only)

### OrganizationRelationship

Represents the connection between a citizen (profile) and a public service organization.

**Properties**:

- `profileId` (string, required): The citizen's profile ID
- `organizationId` (string, required): The organization ID
- `firstName` (string, required): Citizen's first name
- `lastName` (string, required): Citizen's last name
- `email` (string, required): Citizen's email
- `ppsn` (string, optional): Citizen's PPSN
- `dateOfBirth` (string, optional): Citizen's date of birth
- `createdAt` (ISO 8601 datetime, required): When relationship was created

**Validation Rules**:

- Organization ID must match authenticated user's organizationId
- Email must be valid
- PPSN must match pattern if provided

**Operations**:

- **Lookup**: Check if relationship exists
- **Create**: Establish new relationship (when recipient exists but no relationship)

**Source**: profile-api (managed by gateway when needed)

## Entity Relationships Diagram

```text
┌──────────────────┐
│ Authenticated    │
│ User             │
│                  │
│ - organizationId │───┐
└──────────────────┘   │
                       │
                       │ sends
                       ▼
                ┌──────────────┐         ┌──────────────────┐
                │   Message    │◄────────│   Attachment     │
                │              │  has    │                  │
                │ - subject    │  many   │ - id             │
                │ - body       │         │ - filename       │
                │ - security   │         │ - size           │
                │ - language   │         └──────────────────┘
                │ - scheduledAt│                 │
                └──────────────┘                 │
                       │                         │ shared
                       │ sent to                 │ with
                       ▼                         ▼
                ┌──────────────┐         ┌──────────────────┐
                │  Recipient   │◄────────│ Organization     │
                │              │  has    │ Relationship     │
                │ - email      │         │                  │
                │ - firstName  │         │ - profileId      │
                │ - lastName   │         │ - orgId          │
                │ - ppsn       │         └──────────────────┘
                │ - dob        │
                └──────────────┘
                       │
                       │ has events
                       ▼
                ┌──────────────┐
                │ MessageEvent │
                │              │
                │ - eventType  │
                │ - timestamp  │
                │ - details    │
                └──────────────┘
```

## Validation Summary

| Entity | Key Validations |
|--------|----------------|
| Message | subject 1-200 chars, plainTextBody required, securityLevel enum, language enum, valid ISO datetime |
| Recipient | One of two identification methods required, PPSN pattern if provided, valid email, dob in past |
| Attachment | Max 50MB per file, max 10 files per message, valid content type |
| MessageEvent | Read-only from downstream API |
| OrganizationRelationship | Must match user's orgId, valid email format |

## Data Flow Through Gateway

### Send Message Flow

```text
User Request
    ↓
[Authenticate & verify organizationId]
    ↓
[Parse multipart: extract message data + files]
    ↓
[Validate request against schema]
    ↓
┌─────────────────────────────────────┐
│ Parallel Phase 1:                   │
│ - Lookup recipient in profile-api   │
│ - Buffer file streams               │
└─────────────────────────────────────┘
    ↓
[Check organization relationship]
    ↓
[Create relationship if needed & possible]
    ↓
┌─────────────────────────────────────┐
│ Parallel Phase 2:                   │
│ - Upload all files to upload-api    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Parallel Phase 3:                   │
│ - Share all files with recipient    │
└─────────────────────────────────────┘
    ↓
[Send message to messaging-api with attachment refs]
    ↓
[Return messageId + recipientId + attachmentIds]
    ↓
User Response
```

### Query Events Flow

```text
User Request
    ↓
[Authenticate & verify organizationId]
    ↓
[Validate query parameters]
    ↓
[Call messaging-api with filters + pagination]
    ↓ (SDK auto-filters by organizationId)
[Transform results to standard response format]
    ↓
[Generate pagination links]
    ↓
[Return data + metadata]
    ↓
User Response
```

### Get Message History Flow

```text
User Request
    ↓
[Authenticate & verify organizationId]
    ↓
[Validate messageId parameter]
    ↓
[Call messaging-api to get all events for messageId]
    ↓ (SDK auto-filters by organizationId)
[Transform results to standard response format]
    ↓
[Return data]
    ↓
User Response
```

## Notes

- Gateway is stateless - all data persistence is in downstream APIs
- OrganizationId filtering is transparent (handled by SDK)
- Error states (4xx, 5xx) are documented in contracts/
- All datetime fields use ISO 8601 format
- All IDs are UUIDs or opaque strings from downstream systems
