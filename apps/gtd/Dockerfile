# syntax=docker/dockerfile:1

# ---- Base ----
FROM oven/bun:1 AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps

# Copy root workspace files
COPY package.json bun.lock* ./
COPY turbo.json ./

# Copy all package.json files to preserve workspace structure
COPY apps/gtd/package.json ./apps/gtd/
COPY apps/robinhood/package.json ./apps/robinhood/
COPY packages/components/package.json ./packages/components/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install all dependencies (bun hoists to root but keeps workspace symlinks)
RUN bun install --frozen-lockfile

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
COPY package.json bun.lock* turbo.json ./
COPY apps/gtd ./apps/gtd
COPY packages ./packages

# Copy the entire node_modules structure from deps (bun hoists to root)
COPY --from=deps /app/node_modules ./node_modules

# Ensure Tailwind CSS native bindings are installed for the correct platform (Linux x64)
# This fixes the @tailwindcss/oxide native binding issue that can occur when 
# node_modules are copied between build stages or platforms
RUN bun add -d @tailwindcss/oxide-linux-x64-gnu lightningcss-linux-x64-gnu --ignore-scripts

# Build the app using node to run next (bun has issues with next build)
RUN cd apps/gtd && node ../../node_modules/next/dist/bin/next build

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
