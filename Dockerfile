# syntax=docker/dockerfile:1.7-labs
# Multi-stage Next.js standalone build for Railway (long-running Node service —
# the agent runtime's in-memory registry + SSE feed need a persistent process,
# which Vercel serverless can't provide). The same image also serves the rest
# of the app, so /api/agent/{spawn,feed,command} and /api/x402/charge all run
# from one Node process here.

# ── Stage 1: deps ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: build ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js needs NEXT_PUBLIC_* available at build time for client bundles.
# Railway passes them in via build args; defaults below match devnet.
ARG NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
ARG NEXT_PUBLIC_SOLANA_WSS=wss://api.devnet.solana.com
ARG NEXT_PUBLIC_INDEXER_URL=https://utxo-indexer.api-devnet.umbraprivacy.com
ARG NEXT_PUBLIC_USDC_MINT=4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7
ARG NEXT_PUBLIC_PROGRAM_ID=9jCxFKjcwt7uYZtPwfEh2gPt7BdKxW6qEwuwbFStWCKd
ARG NEXT_PUBLIC_AGENT_API_BASE=
ENV NEXT_PUBLIC_SOLANA_RPC=$NEXT_PUBLIC_SOLANA_RPC \
    NEXT_PUBLIC_SOLANA_WSS=$NEXT_PUBLIC_SOLANA_WSS \
    NEXT_PUBLIC_INDEXER_URL=$NEXT_PUBLIC_INDEXER_URL \
    NEXT_PUBLIC_USDC_MINT=$NEXT_PUBLIC_USDC_MINT \
    NEXT_PUBLIC_PROGRAM_ID=$NEXT_PUBLIC_PROGRAM_ID \
    NEXT_PUBLIC_AGENT_API_BASE=$NEXT_PUBLIC_AGENT_API_BASE

RUN pnpm build

# ── Stage 3: runtime ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
# HOSTNAME=0.0.0.0 is required so the container listens on all interfaces
# (Next.js standalone defaults to localhost). PORT is intentionally NOT
# hardcoded — Railway injects $PORT at runtime, and Next.js standalone
# respects it.
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0

# Standalone output bundles only what's needed at runtime + symlinks.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# The Day 0 keypair file is intentionally NOT copied — Railway holds the
# secret as `AGENT_DAY0_KEYPAIR_BASE64` env var. The spawn route falls back
# to the file path only if that env var is unset (e.g. local dev).

EXPOSE 3000
CMD ["node", "server.js"]
