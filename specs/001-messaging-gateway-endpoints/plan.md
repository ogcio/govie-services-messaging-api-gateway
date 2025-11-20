# Implementation Plan: Messaging Gateway Endpoints

**Branch**: `001-messaging-gateway-endpoints` | **Date**: 2025-11-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-messaging-gateway-endpoints/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature implements a secure API gateway enabling authenticated public servants (users with organizationId) to interact with downstream services (profile-api, messaging-api, upload-api) through a unified entry point. The gateway provides three core capabilities: (1) sending messages with file attachments to citizens after verifying profile relationships, (2) querying latest message events with filtering and pagination, and (3) retrieving complete event history for specific messages. The technical approach leverages Fastify's plugin architecture with strict TypeScript, TypeBox schema validation, OpenAPI documentation generation, and the Building Blocks SDK for downstream service communication with token forwarding.

## Technical Context

**Language/Version**: TypeScript 5.9+ with Node.js >= 22.0.0 and strict mode enabled  
**Primary Dependencies**: Fastify 5.6+, @ogcio/building-blocks-sdk 0.2.67+, @fastify/type-provider-typebox 6.1+, @fastify/multipart (for file uploads), TypeBox 1.0.55+  
**Storage**: N/A (gateway delegates persistence to downstream APIs)  
**Testing**: Vitest 4.0+ with @vitest/coverage-v8, contract tests for schemas, integration tests for endpoints  
**Target Platform**: Linux server (Docker container on Alpine Node 22)
**Project Type**: Single project (API gateway service)  
**Performance Goals**: <200ms p95 latency for typical requests, handle parallel downstream API calls, support 1000+ concurrent authenticated users  
**Constraints**: <200ms p95 response time, maintain 99.9% uptime during business hours, zero tolerance for authentication bypasses, all responses must be valid OpenAPI-documented JSON  
**Scale/Scope**: 3 routes (POST /v1/messages, GET /v1/messages/events, GET /v1/messages/:messageId/events), 3 downstream service integrations, multipart form-data support for attachments

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gate 1: TypeScript Strictness ✅

- **Requirement**: strict: true in tsconfig.json, no any types without justification
- **Status**: PASS - Project already configured with strict TypeScript
- **Evidence**: tsconfig.json has `"strict": true`, existing codebase follows explicit typing

### Gate 2: ES Module Architecture ✅

- **Requirement**: "type": "module" in package.json, import/export only
- **Status**: PASS - Project already uses ES modules
- **Evidence**: package.json has `"type": "module"`, moduleResolution: "NodeNext"

### Gate 3: Fastify Best Practices ✅

- **Requirement**: fastify-plugin, TypeBox schemas, @fastify/autoload, proper error handling
- **Status**: PASS - Project infrastructure already in place
- **Evidence**: Existing plugins use fastify-plugin, TypeBox provider configured, autoload in use, @ogcio/fastify-error-handler integrated

### Gate 4: Code Readability & Safety ✅

- **Requirement**: Descriptive names, single responsibility, guard clauses, max 50 lines per function, max 300 lines per file
- **Status**: PASS - Will be enforced in implementation, existing code follows patterns
- **Evidence**: Route handlers delegate to services, existing files are modular and focused

### Gate 5: Biome Formatting & Linting ✅

- **Requirement**: All code passes Biome checks, husky pre-commit hooks
- **Status**: PASS - Infrastructure already configured
- **Evidence**: biome.jsonc configured, husky installed, lint/format scripts in package.json

### Gate 6: Test-Driven Development ✅

- **Requirement**: 80%+ coverage, unit + integration + contract tests, Vitest
- **Status**: PASS - Testing framework in place, will implement TDD workflow
- **Evidence**: Vitest configured with coverage, existing test structure under src/test/

### Gate 7: Performance & Parallelization ✅

- **Requirement**: Promise.all() for independent operations, no await in loops, caching, <200ms p95
- **Status**: PASS - Will implement parallel downstream calls (profile + upload + messaging)
- **Evidence**: Spec requires orchestrating multiple API calls that can be parallelized where dependencies allow

**Overall Constitution Check**: ✅ **PASS** - All 7 core principles satisfied. No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/001-messaging-gateway-endpoints/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (already created)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── send-message.yaml        # POST /v1/messages
│   ├── get-message-events.yaml  # GET /v1/messages/events
│   └── get-message-history.yaml # GET /v1/messages/:messageId/events
└── checklists/
    └── requirements.md  # Requirements quality checklist (already created)
```

### Source Code (repository root)

```text
src/
├── routes/
│   └── messages/
│       ├── index.ts                    # Route registration and prefix
│       ├── send-message.ts             # POST /v1/messages handler
│       ├── get-message-events.ts       # GET /v1/messages/events handler
│       ├── get-message-history.ts      # GET /v1/messages/:messageId/events handler
│       └── schema.ts                   # TypeBox schemas for all message routes
├── services/
│   ├── message-orchestration.ts        # Orchestrates profile, messaging, upload calls
│   ├── profile-service.ts              # Profile API operations (lookup, relationship mgmt)
│   ├── messaging-service.ts            # Messaging API operations (send, query events)
│   └── upload-service.ts               # Upload API operations (upload, share)
├── schemas/
│   ├── message.ts                      # Message-related TypeBox schemas
│   ├── recipient.ts                    # Recipient identification schemas
│   ├── attachment.ts                   # Attachment schemas
│   └── pagination.ts                   # Already exists, may need extension
├── utils/
│   ├── token-forwarding.ts             # Extract and forward auth tokens to SDK
│   ├── multipart-handler.ts            # Handle multipart form-data parsing
│   └── pagination.ts                   # Already exists, pagination utilities
├── types/
│   ├── fastify.d.ts                    # Already exists, may need extension
│   └── building-blocks-sdk.d.ts        # Type definitions for SDK responses
└── plugins/
    └── internal/
        └── gateway-auth.ts              # Already exists, verify organizationId

src/test/
├── routes/
│   └── messages/
│       ├── send-message.test.ts        # Integration tests for sending
│       ├── get-message-events.test.ts  # Integration tests for events query
│       └── get-message-history.test.ts # Integration tests for message history
├── services/
│   ├── message-orchestration.test.ts   # Unit tests for orchestration logic
│   ├── profile-service.test.ts         # Unit tests for profile operations
│   ├── messaging-service.test.ts       # Unit tests for messaging operations
│   └── upload-service.test.ts          # Unit tests for upload operations
└── contracts/
    └── message-routes.test.ts          # Contract tests validating OpenAPI schemas
```

**Structure Decision**: Using the existing **single project** structure (Option 1 from template). This is a pure API gateway with no frontend or mobile components. The structure follows established Fastify conventions: routes for HTTP handlers, services for business logic, schemas for validation, utils for cross-cutting concerns, and types for TypeScript definitions. The test directory mirrors the source structure for easy navigation.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations identified. All constitution gates pass without exceptions.
