# Tessera

> Prove financial worth without revealing financial life. A Solana protocol for ZK-verified income credentials, built on Umbra Privacy and the agent economy.

This repository is the **frontend** for Tessera. The product, architecture, and implementation strategy are fully specified in the two PRDs at the root of this repo. Read those before changing code.

---

## Read first (in order)

1. **[TESSERA_PRD_v2_Frontend.md](./TESSERA_PRD_v2_Frontend.md)** — design tokens, component library, all 7 page wireframes, microcopy, mobile, accessibility, file organization, open decisions. The companion document for anyone building UI.
2. **[TESSERA_PRD_v2_Engineering.md](./TESSERA_PRD_v2_Engineering.md)** — system architecture, on-chain contracts, ZK circuits, indexer, x402 adapter, day-by-day implementation order. Read this for context on the data the frontend consumes.

If something contradicts between PRD and code, the **PRD wins**. Update the PRD or change the code — do not let them drift.

---

## Stack

Pinned in [`package.json`](./package.json). Do not bump versions casually.

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.2.4** | App Router, Turbopack default. `middleware.ts` is now `proxy.ts` in v16. Edge runtime is **not** supported in `proxy`; runtime is Node.js. |
| Runtime | Node.js ≥ 20.9 | Hard requirement of Next 16. |
| React | 19.2 | View Transitions, `useEffectEvent`, `<Activity/>` available. |
| Styling | Tailwind CSS 4 | Design tokens in [`app/globals.css`](./app/globals.css). |
| Components | shadcn/ui (to be added) | See [Frontend PRD §9](./TESSERA_PRD_v2_Frontend.md). |
| Wallet | `@solana/wallet-adapter-react` (to be added) | Phantom + Backpack + Solflare. See [Frontend PRD §21.2](./TESSERA_PRD_v2_Frontend.md). |
| Privacy SDK | `@umbra-privacy/sdk` 4.0.0 (to be added) | See [Engineering PRD §5](./TESSERA_PRD_v2_Engineering.md). |

---

## Local development

```bash
# Install deps (pnpm required — repo uses pnpm-lock.yaml)
pnpm install

# Start dev server (Turbopack)
pnpm dev
# → http://localhost:3000

# Production build
pnpm build

# Lint
pnpm lint
```

---

## Deployment

Auto-deploys to **Vercel** on every push to `main`. Pull requests get unique preview URLs.

Environment variables (set in Vercel dashboard, not committed):

| Variable | Scope | Source |
|---|---|---|
| `NEXT_PUBLIC_SOLANA_RPC` | client | Helius / Triton devnet URL |
| `NEXT_PUBLIC_PROGRAM_ID` | client | Set after on-chain deploy (Engineering PRD Day 4) |
| `NEXT_PUBLIC_INDEXER_URL` | client | `https://indexer.umbraprivacy.com` (or our own) |
| `AGENT_PRIVATE_KEY` | server only | For `/agent` demo mode. **Never** prefix with `NEXT_PUBLIC_`. |

---

## Project conventions

See [`AGENTS.md`](./AGENTS.md) for the rules every contributor — human or AI — must follow when editing this repo.

---

## Status

**Pre-implementation.** The frontend scaffold is fresh from `create-next-app`. The PRDs are the source of truth. Pages, components, and wallet integration are still to be built per [Frontend PRD §20 — Implementation Order](./TESSERA_PRD_v2_Frontend.md).
