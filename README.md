# Tessera

> Prove financial worth without revealing financial life. A Solana protocol for ZK-verified income credentials, built on Umbra Privacy and the agent economy.

This repository is the **frontend** for Tessera. The product, architecture, and implementation strategy are fully specified in the two PRDs at the root of this repo. Read those before changing code.

---

## Read first (in order)

1. **[TESSERA_PRD_v2_Frontend.md](./TESSERA_PRD_v2_Frontend.md)** — design tokens, component library, all 7 page wireframes, microcopy, mobile, accessibility, file organization, open decisions. The companion document for anyone building UI.
2. **[TESSERA_PRD_v2_Engineering.md](./TESSERA_PRD_v2_Engineering.md)** — system architecture, on-chain contracts, ZK circuits, indexer, x402 adapter, day-by-day implementation order. Read this for context on the data the frontend consumes.

**The Frontend PRD is the spec. Build it exactly. Do not edit the PRD.**

Follow the [Frontend PRD](./TESSERA_PRD_v2_Frontend.md) section by section, design token by design token, wireframe by wireframe. If something doesn't match reality (a library doesn't behave the way the PRD assumes, a spec is ambiguous, a state is undefined), **don't change the PRD and don't improvise silently** — log an observation in [`gaps.md`](./gaps.md) and keep going against the closest reasonable interpretation.

---

## Two files you must keep alive

These two files are how the project stays coherent. Don't skip them.

### [`gaps.md`](./gaps.md) — observations only, never edits to the PRD

When you hit any of the following, append an entry to [`gaps.md`](./gaps.md):
- A library / SDK / API behaves differently from what the PRD assumes.
- A design spec is ambiguous, missing a state, or contradicts another section.
- A dependency version in the PRD doesn't match what npm resolves.
- A wireframe leaves something undefined (e.g., empty state for a list of zero credentials).
- You made a judgment call the PRD didn't cover.

**Rule: do not edit the PRD.** Log the observation. Tim triages and decides. The PRD is the contract — keeping it stable is what lets us trust it.

If the gap isn't in `gaps.md`, it didn't happen, and the next person will hit it again. Non-negotiable.

### [`AGENTS.md`](./AGENTS.md) — log progress at the bottom every working session

End-of-session ritual: append a one-line entry to the **Progress log** section of [`AGENTS.md`](./AGENTS.md) — date, what shipped, what's next. This is the project's heartbeat. Two days of silence and we lose context. Don't forget.

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
| Privacy SDK | `@umbra-privacy/sdk` 4.0.0 (to be added) | See [Engineering PRD §13 — Umbra SDK Integration Map](./TESSERA_PRD_v2_Engineering.md) and [§9 — System Architecture](./TESSERA_PRD_v2_Engineering.md). |

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
| `NEXT_PUBLIC_PROGRAM_ID` | client | Set after Anchor program deploy ([Engineering PRD §21 — Sprint Plan, Day 4](./TESSERA_PRD_v2_Engineering.md)) |
| `NEXT_PUBLIC_INDEXER_URL` | client | `https://indexer.umbraprivacy.com` (or our own) |
| `AGENT_PRIVATE_KEY` | server only | For `/agent` demo mode. **Never** prefix with `NEXT_PUBLIC_`. |

---

## Project conventions

See [`AGENTS.md`](./AGENTS.md) for the rules every contributor — human or AI — must follow when editing this repo.

---

## Status

**Pre-implementation.** The frontend scaffold is fresh from `create-next-app`. The PRDs are the source of truth. Pages, components, and wallet integration are still to be built per [Frontend PRD §20 — Implementation Order](./TESSERA_PRD_v2_Frontend.md).
