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

If the PRD and code disagree, the PRD wins. Either update the PRD intentionally or align the code — never let them drift silently.

## Aesthetic & UX rules

- **No demo data unless wired.** Don't ship hardcoded mock numbers in production routes. Use empty states from [Frontend PRD §11](./TESSERA_PRD_v2_Frontend.md) until real data is connected.
- **No generic AI-styled UI.** No purple gradients, no rounded-3xl mega-cards, no "AI shimmer". Tessera's aesthetic is parchment + wax-seal + cipher cyan, defined in [§3 BRAND CONCEPT](./TESSERA_PRD_v2_Frontend.md) and [§4 COLOR SYSTEM](./TESSERA_PRD_v2_Frontend.md).
- **The credential mint moment must feel earned.** It's the demo's J1 moment. See [§7 MOTION](./TESSERA_PRD_v2_Frontend.md). Don't water it down with a generic toast.

## Code rules

- **Never suppress type errors** with `as any`, `@ts-ignore`, or `@ts-expect-error`.
- **No commented-out code.** Delete it.
- **No comments that repeat what the code does.** Comment only the non-obvious _why_.
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

---

# Progress Log

## 2026-04-30: Initial Frontend Scaffold & Page Shells

Completed the end-to-end scaffolding of the TESSERA frontend per §20 of the PRD.

- **Infrastructure:**
  - Configured Next.js 16.2.4 with Turbopack and async data access patterns.
  - Implemented Tailwind CSS 4 theme tokens and global design system (parchment/cyan).
  - Integrated `next-themes` and `ThemeProvider`.
- **Components:**
  - Built atomic primitives (Button, Input, Badge, etc.) and composites (SealCard, AddressDisplay, LiveFeedItem).
  - Implemented `OnboardingModal` for Umbra identity registration flow.
- **Pages:**
  - **Landing (`/`):** Implemented marketing narrative and CTAs.
  - **Employer (`/employer`):** Built shielded payment submission flow with MPC simulation.
  - **Employee (`/employee`):** Implemented 3-step credential generator (Scan/Configure/Prove).
  - **Agent (`/agent`):** Created autonomous control panel with live terminal feed.
  - **Verifier (`/verify`):** Developed simulated lending protocol integration demo.
  - **Credential (`/credential/[address]`):** Built public credential viewer with SealCard.
- **Quality:**
  - Build successful (`pnpm build` passed).
  - Responsive polish for mobile viewports.
  - Accessibility audit (ARIA roles, focus rings).

## 2026-04-30: Visual & Atmospheric Refinement

- **Atmosphere:** Implemented a global noise texture overlay and radial gradient backgrounds in `globals.css` to move away from flat near-black to a textured, premium aesthetic.
- **Hero Redesign:** Refined the Landing Page hero with typographic hierarchy improvements, drop-shadow depth, and ceremonial horizontal rules. Established a clear CTA hierarchy (Primary vs. Outline).
- **Architectural Plaques:** Redesigned 'How It Works' section using architectural plaque styling with ghosted mono-labels, top-accent borders, and absolute-positioned iconography.
- **Segment Differentiation:** Specialized the 'Humans' and 'Agents' cards with unique visual signatures (parchment neutral vs. cipher-tinted ink) and SVG watermarks.
- **CTA Infrastructure:** Transformed the 'Get Started' section into a designed architectural block with seal-red accents and lifting card interactions.
- **Component System:** Updated the Card depth and shadow system across the library. Professionalized the Status Banner iconography (Activity vs. Sparkles).
- **Footer Expansion:** Built out a multi-column, detailed footer with ecosystem navigation, protocol trust signals, and network status indicators.
- **Verification:** Verified all changes with a successful `pnpm build`.
