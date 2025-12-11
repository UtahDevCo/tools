# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:20-slim AS base
WORKDIR /app
RUN npm install -g bun

# ---- Dependencies ----
FROM base AS deps

# Copy root workspace files
COPY package.json bun.lock turbo.json ./

# Copy all package.json files to preserve workspace structure
COPY apps/gtd/package.json ./apps/gtd/
COPY apps/robinhood/package.json ./apps/robinhood/
COPY apps/wkt/package.json ./apps/wkt/
COPY packages/components/package.json ./packages/components/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install all dependencies (bun hoists to root but keeps workspace symlinks)
RUN rm bun.lock
RUN bun install

# ---- Builder ----
FROM base AS builder
WORKDIR /app

# Firebase config build args (NEXT_PUBLIC_* vars are embedded in client bundle at build time)
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

# Set as environment variables for the build
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

# Copy source code first
COPY package.json bun.lock turbo.json ./
COPY apps/gtd ./apps/gtd
COPY packages ./packages

# Copy bun cache to ensure symlinks work
COPY --from=deps /root/.bun /root/.bun
# Copy the entire node_modules structure from deps (bun hoists to root)
COPY --from=deps /app/node_modules ./node_modules
# Copy the app's node_modules (bun installs some deps here)
COPY --from=deps /app/apps/gtd/node_modules ./apps/gtd/node_modules
# Copy the component package's node_modules (bun installs some deps here)
COPY --from=deps /app/packages/components/node_modules ./packages/components/node_modules

# Build the app using bun run build
RUN cd apps/gtd && bun run build

# ---- Runner ----
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/apps/gtd/.next/standalone ./
COPY --from=builder /app/apps/gtd/.next/static ./apps/gtd/.next/static

# Create public directory (may be empty)
RUN mkdir -p ./apps/gtd/public

USER nextjs

EXPOSE 8080

CMD ["node", "apps/gtd/server.js"]
