<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repo runs **Next.js 16.2.4**. APIs, conventions, and file structure differ from older versions you may have seen in training data. Read the relevant guide in `node_modules/next/dist/docs/` or [the Next 16 release notes](https://nextjs.org/blog/next-16) before writing any code. Heed deprecation notices.

**Critical Next 16 differences to remember:**
- `middleware.ts` is renamed to `proxy.ts`. Runtime is **Node.js only** (not Edge).
- Turbopack is the default bundler — no opt-in needed.
- `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are now **async**. Always `await` them.
- `next/image` `images.qualities` defaults to `[75]`, not `[1..100]`.
- `revalidateTag()` requires a `cacheLife` profile as its second argument.
- `next lint` is removed; use `eslint` directly.
<!-- END:nextjs-agent-rules -->

---

# Tessera — Project Conventions

These rules apply to every contributor (human or AI) editing this repo.

## Source of truth

The PRDs at the root of this repo are the source of truth:

- **[TESSERA_PRD_v2_Frontend.md](./TESSERA_PRD_v2_Frontend.md)** — UI/UX, design tokens, components, pages, microcopy.
- **[TESSERA_PRD_v2_Engineering.md](./TESSERA_PRD_v2_Engineering.md)** — architecture, contracts, circuits, data flow.

**Build exactly what the Frontend PRD specifies. Do not edit the PRD.** When reality contradicts the PRD or the spec is unclear, log an observation in [`gaps.md`](./gaps.md). Tim triages and decides whether to update the PRD. The PRD's stability is what makes it trustworthy.

## Aesthetic & UX rules

- **No demo data unless wired.** Don't ship hardcoded mock numbers in production routes. Use empty states from [Frontend PRD §11](./TESSERA_PRD_v2_Frontend.md) until real data is connected.
- **No generic AI-styled UI.** No purple gradients, no rounded-3xl mega-cards, no "AI shimmer". Tessera's aesthetic is parchment + wax-seal + cipher cyan, defined in [§3 BRAND CONCEPT](./TESSERA_PRD_v2_Frontend.md) and [§4 COLOR SYSTEM](./TESSERA_PRD_v2_Frontend.md).
- **The credential mint moment must feel earned.** It's the demo's J1 moment. See [§7 MOTION](./TESSERA_PRD_v2_Frontend.md). Don't water it down with a generic toast.

## Code rules

- **Never suppress type errors** with `as any`, `@ts-ignore`, or `@ts-expect-error`.
- **No commented-out code.** Delete it.
- **No comments that repeat what the code does.** Comment only the non-obvious *why*.
- **Match existing patterns.** If unsure, search the codebase before inventing a new convention.
- **Pin versions exactly** for `next`, `react`, `@umbra-privacy/sdk`. No carets on those three.

## Wallet & privacy rules

- **Solana addresses and Umbra stealth addresses are visually distinguished.** See [Frontend PRD §21.4](./TESSERA_PRD_v2_Frontend.md). Mixing them is a UX bug.
- **Never log private keys, witnesses, or seed phrases.** Not in console, not in error messages, not in toasts.
- **`AGENT_PRIVATE_KEY` is server-only.** Never expose it through `NEXT_PUBLIC_*`.

## Workflow rules

- **Branch from `main`. PRs only.** No direct pushes to `main` once a teammate joins.
- **Vercel preview deploys** are required reading before merge.
- **Lint clean before commit:** `pnpm lint`.
- **Type-check clean before commit:** `pnpm build` should succeed.

## Open decisions

[Frontend PRD §21](./TESSERA_PRD_v2_Frontend.md) documents the five intentionally-open design questions (form validation timing, wallet adapter scope, toast collision, address visual distinction, theme on first load). When you implement code touching any of them, follow §21's recommendation.

## Drift & gaps

**Never edit the PRD.** When the spec doesn't match reality (library behavior, missing state, ambiguous wording, version mismatch), log an observation in [`gaps.md`](./gaps.md) and continue building against the closest reasonable interpretation. Tim triages and decides whether the PRD itself needs to change.

Format:

```
## YYYY-MM-DD — short title
- PRD section: §X.Y of Frontend PRD (or Engineering PRD)
- Observation: what reality looks like vs. what the PRD says
- Interim build choice: how you proceeded
- Status: open / triaged by Tim / closed
```

If the gap isn't logged, the next person hits it again. Non-negotiable.

---

## Progress log

End-of-session ritual: **append one line below.** Date, what shipped, what's next. Keep it terse — this is the project heartbeat, not a journal.

Format:
```
- YYYY-MM-DD — <what shipped>. Next: <what's next>.
```

### Entries

- 2026-04-30 — repo initialized: Next.js 16.2.4 scaffold, Engineering + Frontend PRDs, AGENTS.md, gaps.md, Vercel-ready. Next: friend reads PRDs, runs `pnpm install && pnpm dev`, starts Frontend PRD §20 implementation order at item 1 (landing page).
