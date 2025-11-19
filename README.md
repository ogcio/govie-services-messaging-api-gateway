# OGCIO Fastify Scaffolding

A production-ready Node.js API scaffolding built with Fastify, featuring TypeScript, PostgreSQL integration, OpenAPI documentation, and comprehensive observability tooling.

## Features

- **Type Safety**: Full TypeScript support with TypeBox schema validation
- **Database Ready**: PostgreSQL integration with migration scripts
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation
- **Observability**: Integrated logging, metrics, and tracing with OpenTelemetry
- **Testing**: Complete test suite with Vitest and testcontainers
- **Code Quality**: Biome for linting and formatting, Husky for git hooks

## Prerequisites

- Node.js >= 22.0.0
- PostgreSQL database
- pnpm (recommended) or npm

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fastify-scaffolding

# Install dependencies
pnpm install
```

### Environment Configuration

Copy the `.env.sample` to `.env` file and set your values.

### Database Setup

**Please note**: if you want to enable PG integration, go to [PG plugin](./src/plugins/external/pg.ts) and uncomment the code there.

```bash
# Create database
pnpm db:create

# Run migrations
pnpm db:migrate
```

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

## Testing

The project includes comprehensive testing with:

- **Unit Tests**: Component and utility testing
- **Integration Tests**: Full API endpoint testing
- **Test Containers**: Isolated PostgreSQL testing environment
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
docker build -t fastify-scaffolding:latest --build-arg "PORT={your port}" .
```

### Running with Docker

```bash
docker run -p {your port}:{your port} --env-file .env --name fastify-scaffolding --rm fastify-scaffolding:latest
```
