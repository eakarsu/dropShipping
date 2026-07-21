# syntax=docker/dockerfile:1.7
FROM node:24.11.1-alpine3.22 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    JWT_SECRET=build-only-jwt-secret-that-is-not-used-runtime \
    ORDER_AUDIT_SIGNING_KEY=build-only-audit-key-that-is-not-used-runtime \
    npm run build

FROM deps AS migration
ENV NODE_ENV=production
COPY drizzle ./drizzle
COPY drizzle.config.ts tsconfig.json ./
COPY src/lib ./src/lib
CMD ["npm", "run", "db:migrate"]

FROM node:24.11.1-alpine3.22 AS runtime
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3001
CMD ["node", "server.js"]
