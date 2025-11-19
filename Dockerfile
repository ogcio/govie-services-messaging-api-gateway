FROM node:22-alpine AS base-deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -G nodejs
FROM base-deps AS builder

WORKDIR /app

COPY ./pnpm*.yaml /app/
COPY ./package.json /app/
COPY ./tsconfig.json /app/
COPY ./tsconfig.prod.json /app/
COPY ./src /app/src/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --no-frozen-lockfile
RUN pnpm build

FROM base-deps AS prod-deps

WORKDIR /app

COPY ./pnpm*.yaml /app/
COPY ./package.json /app/

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --prod --no-frozen-lockfile

FROM base-deps AS runner

WORKDIR /app

ARG PORT
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV PORT=${PORT}

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/pnpm*.yaml ./

EXPOSE ${PORT}

USER nodejs

CMD [ "node", "--import", "./dist/instrumentation.js", "dist/index.js" ]
