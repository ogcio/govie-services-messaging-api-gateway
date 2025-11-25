<!--
SYNC IMPACT REPORT
==================
Version Change: [INITIAL] → 1.0.0
Action: Initial constitution ratification
Modified Principles: N/A (all new)
Added Sections:
  - Core Principles (7 principles)
  - Technical Standards
  - Development Workflow
  - Governance
Templates Status:
  ✅ plan-template.md - Aligned with TypeScript/Fastify/ES Module requirements
  ✅ spec-template.md - Aligned with test-driven approach and user story independence
  ✅ tasks-template.md - Aligned with parallel execution and testing requirements
  ✅ checklist-template.md - Compatible with quality standards
  ✅ agent-file-template.md - Compatible with project structure
Follow-up TODOs: None
-->

# GovIE MessagingIE API Gateway Constitution

## Core Principles

### I. TypeScript Strictness (NON-NEGOTIABLE)

All code MUST use TypeScript with strict mode enabled. Type safety is paramount and non-negotiable.

**Rules**:

- `strict: true` in tsconfig.json is mandatory
- No `any` types unless absolutely necessary and explicitly justified in code comments
- All function parameters and return types MUST be explicitly typed
- Type assertions (`as`) require justification comments explaining why they are safe
- Prefer type inference only when the type is obvious from the immediate context

**Rationale**: TypeScript's strict mode catches entire classes of runtime errors at compile time, making the codebase more maintainable and reducing production issues. Explicit typing serves as living documentation and prevents silent type coercion bugs.

### II. ES Module Architecture (NON-NEGOTIABLE)

All code MUST use ES modules with `"type": "module"` in package.json. CommonJS is prohibited.

**Rules**:

- Use `import`/`export` syntax exclusively
- File extensions MUST be included in import statements (`.js` for compiled output)
- `moduleResolution: "NodeNext"` and `module: "NodeNext"` in TypeScript configuration
- No `require()` or `module.exports` permitted
- Dynamic imports `await import()` for conditional loading only

**Rationale**: ES modules are the JavaScript standard, provide better tree-shaking, enable top-level await, and ensure forward compatibility with the evolving Node.js ecosystem.

### III. Fastify Best Practices (NON-NEGOTIABLE)

All server code MUST follow Fastify conventions and leverage its plugin architecture.

**Rules**:

- Use `fastify-plugin` for encapsulation control
- Leverage TypeBox with `@fastify/type-provider-typebox` for schema validation
- Register all plugins via `@fastify/autoload` for consistent structure
- Implement proper error handling with `@fastify/sensible` and custom error handlers
- Use Fastify lifecycle hooks appropriately (`onRequest`, `preHandler`, `onResponse`)
- Separate route definitions from business logic (routes call services)
- Never bypass Fastify's validation layer

**Rationale**: Fastify's plugin system provides excellent encapsulation, its schema-based approach ensures request/response validation, and following conventions makes the codebase predictable and maintainable.

### IV. Code Readability & Safety (NON-NEGOTIABLE)

Code MUST prioritize readability and safety over cleverness or brevity.

**Rules**:

- Descriptive variable and function names that reveal intent
- Functions MUST have a single, clear responsibility
- Prefer explicit conditionals over implicit truthy/falsy checks
- Use guard clauses to reduce nesting
- Maximum function length: 50 lines (excluding types/comments)
- Maximum file length: 300 lines
- Complex logic MUST have explanatory comments
- Avoid nested callbacks; use async/await
- No side effects in pure functions

**Rationale**: Readable code reduces cognitive load, prevents bugs during maintenance, and enables faster onboarding. Safety-first approach prevents entire categories of runtime errors.

### V. Biome Formatting & Linting (NON-NEGOTIABLE)

All code MUST pass Biome formatting and linting checks before commit.

**Rules**:

- Run `pnpm run lint` and `pnpm run format` before every commit
- No linting errors or warnings permitted in main/dev branches
- Biome configuration in `biome.jsonc` is the single source of truth
- Use `biome-ignore` comments sparingly and only with justification
- Husky pre-commit hooks enforce formatting/linting
- Double quotes for strings (as configured)
- 2-space indentation (as configured)

**Rationale**: Consistent formatting eliminates style debates, reduces diff noise, and makes code reviews focus on logic. Biome's performance ensures fast feedback cycles.

### VI. Test-Driven Development (REQUIRED)

Comprehensive testing is mandatory; tests MUST be written before implementation for new features.

**Rules**:

- Test coverage MUST be maintained above 80% for new code
- Unit tests for business logic and utilities
- Integration tests for API endpoints and external service interactions
- Contract tests for API schemas and Breaking changes
- Tests MUST be run before merge to main/dev
- Use Vitest for all testing
- Test files MUST follow pattern: `*.test.ts`
- Mock external dependencies appropriately
- Tests MUST be deterministic and parallelizable

**Rationale**: Tests serve as executable specifications, catch regressions early, and enable confident refactoring. Writing tests first ensures testable design and complete coverage.

### VII. Performance & Parallelization

Requests and operations MUST be parallelized wherever dependencies allow.

**Rules**:

- Use `Promise.all()` for independent async operations
- Never await in loops when operations can run in parallel
- Implement proper caching strategies (using `@cacheable/node-cache`)
- Database queries MUST use connection pooling
- Monitor and optimize slow endpoints (target: <200ms p95 for typical requests)
- Use streaming for large payloads
- Implement proper pagination for list endpoints
- Profile and optimize hot paths

**Rationale**: Performance directly impacts user experience and operational costs. Parallel execution maximizes throughput and reduces latency.

## Technical Standards

### Docker Readiness

All applications MUST be containerized and production-ready via Docker.

**Requirements**:

- Multi-stage Dockerfile for optimized image size
- Use Alpine-based Node.js images
- Non-root user for container execution
- Proper signal handling with `close-with-grace`
- Environment-based configuration (no hardcoded values)
- Health check endpoint (`/health`) for orchestration
- Build arguments for configurable ports

### Observability

Production systems MUST be observable through logging, metrics, and tracing.

**Requirements**:

- Structured logging via `@ogcio/fastify-logging-wrapper`
- OpenTelemetry instrumentation for distributed tracing
- Request/response logging with sanitization of sensitive data
- Error tracking with stack traces and context
- Performance metrics collection
- Health and readiness endpoints
- Correlation IDs for request tracking

### Security

Security MUST be built-in, not bolted-on.

**Requirements**:

- Authentication and authorization via `@ogcio/api-auth`
- Input validation on all endpoints (TypeBox schemas)
- Rate limiting and backpressure handling (`@fastify/under-pressure`)
- No sensitive data in logs or error messages
- Dependency vulnerability scanning in CI/CD
- Secure HTTP headers
- Environment variable validation at startup

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `dev`: Integration branch for features
- Feature branches: `feature/###-description` or `chore/###-description`
- All changes via pull requests to `dev`

### Commit Standards

- Follow Conventional Commits specification
- Use `commitlint` to enforce format
- Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`
- Reference issue numbers when applicable

### Code Review

- All code MUST be reviewed before merge
- Automated checks MUST pass (linting, formatting, tests, build)
- Reviewers verify constitution compliance
- No direct commits to `main` or `dev`

### Documentation

- README.md MUST be kept up-to-date
- OpenAPI documentation auto-generated from schemas
- Complex logic MUST have inline comments
- API changes MUST be documented in CHANGELOG

## Governance

This constitution supersedes all other development practices and guidelines. All code, features, and changes MUST comply with these principles.

### Amendment Process

1. Propose changes via pull request to this document
2. Justify changes with clear rationale
3. Update affected templates and documentation
4. Version bump according to semantic versioning:
   - **MAJOR**: Backward-incompatible principle changes or removals
   - **MINOR**: New principles or significant expansions
   - **PATCH**: Clarifications, wording improvements, typo fixes
5. Obtain approval from project maintainers
6. Update constitution version and last amended date

### Compliance

- All pull requests MUST be verified against these principles
- Violations MUST be justified in writing or corrected
- Technical debt that violates principles MUST have a remediation plan
- Templates in `.specify/templates/` MUST align with constitution requirements

### Living Document

This constitution is a living document. As the project evolves, principles may be refined, but the core values of type safety, readability, testing, performance, and Docker readiness remain fundamental.

**Version**: 1.0.0 | **Ratified**: 2025-11-20 | **Last Amended**: 2025-11-20
