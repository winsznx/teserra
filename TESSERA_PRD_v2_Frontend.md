# TESSERA — Master PRD v2 (Frontend)
### Author: Tim | Status: SOURCE OF TRUTH — UI/UX | Companion: TESSERA_PRD_v2_Engineering.md

This document is a complete handoff. Anyone reading this — frontend engineer, design agent, or solo dev — can build the entire TESSERA UI without reading the engineering doc. Engineering decisions only appear here when they directly affect UI behavior.

---

## TABLE OF CONTENTS

1. Product Context
2. Design Philosophy
3. Brand Concept: TESSERA
4. Color System
5. Typography
6. Spacing Scale
7. Motion & Animation
8. Icon System
9. Component Library
10. Layout System
11. Page Specifications
    - 11.1 Landing `/`
    - 11.2 Onboarding (modal flow)
    - 11.3 Employer `/employer`
    - 11.4 Employee `/employee`
    - 11.5 Agent `/agent`
    - 11.6 Credential Viewer `/credential/[address]`
    - 11.7 Verifier Demo `/verify`
12. Cross-Cutting Patterns
13. Microcopy Library
14. Mobile & Responsive Strategy
15. Accessibility Baseline
16. Tech Stack & Dependencies
17. File Organization
18. Asset Requirements
19. Data Visualization
20. Implementation Order
21. Open Decisions

---

## 1. PRODUCT CONTEXT

TESSERA is a Solana protocol that proves financial worth without revealing financial life. Three audiences:

**Employers** shield salary payments via Umbra's SDK so amounts and recipients are encrypted on-chain.
**Employees** scan their own income with a viewing key, generate a Groth16 ZK proof that aggregated income exceeds a threshold over a date range, and mint a compressed NFT credential carrying only public signals.
**Verifiers** (DeFi protocols, landlords, DAOs) read the credential through one CPI call. They never see income.
**Agents** (autonomous AI/MCP servers) operate the same flow headlessly and additionally use TESSERA's x402 private payment rail for machine-to-machine confidential payments.

The product is dual-mode: same protocol, two distinct UI surfaces — human and agent.

---

## 2. DESIGN PHILOSOPHY

Three principles drive every decision.

**Cryptographic clarity.** This is a serious financial primitive. The interface must feel institution-grade. Mono-spaced numerics, hex addresses treated as artifacts, no playful icons in the financial flow.

**Concealed depth.** A user sees a clean three-step flow. Underneath: Arcium MPC, ZK circuits, on-chain verification. The interface should feel calm and uncluttered while the work happens. Loading states explain what's happening without overwhelming.

**Distinctive metaphor.** A *tessera* in ancient Rome was a small token granting access — a credential. The interface borrows that visual language: a wax-seal accent, parchment texture suggestions, formal serif display type, treating each minted credential as a document worth honoring.

What this is NOT: generic crypto purple-and-cyan dark mode. Not a Web3 dashboard. Not a gamified DeFi app. The aesthetic should feel closer to a private bank's modern interface than to a token launchpad.

---

## 3. BRAND CONCEPT: TESSERA

The name carries the metaphor. Type treatment uses a serif for the wordmark to evoke ancient credential plaques while keeping body copy in clean sans-serif for legibility.

### Wordmark
```
TESSERA
```
Set in Fraunces, weight 400, letter-spacing 0.08em, lowercase or uppercase both acceptable. When small (nav bar, footer): all uppercase, tracking 0.16em.

### Tagline
**Primary:** "Prove your income. Reveal nothing."
**Secondary (technical):** "Cryptographic creditworthiness on Solana."
**Agent-facing:** "Private payments for autonomous economies."

### Voice
- Direct. No hedging.
- Technical but unpretentious.
- Confident in privacy claims because they're cryptographically grounded.
- Never marketing-fluffy. Never "revolutionary," "game-changing."
- When something fails, the copy is clear and unapologetic.

---

## 4. COLOR SYSTEM

Two themes. Dark is primary (default). Light is secondary (system preference toggle).

### Dark Theme Tokens

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#0B0D10` | Page background |
| `--bg-elevated` | `#15181C` | Section backgrounds, navbar |
| `--bg-surface` | `#1C2025` | Cards, inputs |
| `--bg-overlay` | `#0B0D10E6` | Modal/drawer backdrops (90% alpha) |
| `--border-subtle` | `#2A2E34` | Default borders |
| `--border-strong` | `#3A3F47` | Active inputs, focus rings |
| `--border-emphasis` | `#5A6068` | Hover states, prominent dividers |
| `--text-primary` | `#F5EFE0` | Body, headings — distinctive parchment cream |
| `--text-secondary` | `#A8A199` | Supporting text |
| `--text-muted` | `#6E6960` | Captions, placeholders, disabled |
| `--text-inverse` | `#0B0D10` | Text on light backgrounds |

### Accent Tokens (theme-stable — same in dark and light)

| Token | Hex | Usage |
|---|---|---|
| `--seal` | `#A23B2C` | Verified/active state — wax seal red. Use sparingly, only for verification moments |
| `--seal-hover` | `#B84634` | Hover state of seal accent |
| `--seal-muted` | `#A23B2C26` | Background tint (15% alpha) for verified pills |
| `--cipher` | `#4ECDC4` | Cryptographic/proof actions |
| `--cipher-hover` | `#5DD4CC` | |
| `--cipher-muted` | `#4ECDC426` | |
| `--ink` | `#1A1F2E` | Deep navy — secondary depth |
| `--success` | `#5A8C5A` | Confirmations, but desaturated. Not crypto-green. |
| `--warning` | `#E0A458` | Cautions |
| `--error` | `#C3553F` | Errors |

### Light Theme Tokens

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#F5EFE0` | Parchment background |
| `--bg-elevated` | `#FAF6EB` | |
| `--bg-surface` | `#FFFFFF` | Cards |
| `--bg-overlay` | `#1A1A1AE6` | |
| `--border-subtle` | `#E0D9C7` | |
| `--border-strong` | `#C7BFA8` | |
| `--border-emphasis` | `#9A9281` | |
| `--text-primary` | `#1A1A1A` | |
| `--text-secondary` | `#4A4A4A` | |
| `--text-muted` | `#7A7A7A` | |

### Semantic Pairing Rules
- Default state: text-primary on bg-base or bg-surface
- Verified credential: text-primary + seal accent (wax stamp)
- Proof generating: cipher accent
- Disabled / pending: text-muted + bg-elevated

### Tailwind Config Mapping

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--bg-base)',
          elevated: 'var(--bg-elevated)',
          surface: 'var(--bg-surface)',
          overlay: 'var(--bg-overlay)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          emphasis: 'var(--border-emphasis)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        seal: { DEFAULT: 'var(--seal)', hover: 'var(--seal-hover)', muted: 'var(--seal-muted)' },
        cipher: { DEFAULT: 'var(--cipher)', hover: 'var(--cipher-hover)', muted: 'var(--cipher-muted)' },
        ink: 'var(--ink)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
      }
    }
  }
}
```

CSS variables defined in `app/globals.css` under `:root` (dark) and `.light` class (light).

---

## 5. TYPOGRAPHY

### Font Families
- **Display:** Fraunces (Google Fonts). Variable axes: `wght 100..900`, `opsz 9..144`, `SOFT 0..100`, `WONK 0..1`. Use `wght 500-600`, `opsz 144`, `SOFT 50`, `WONK 0` for headings — gives a refined classical serif character without being austere.
- **Sans:** Inter (Google Fonts). Variable. Default body, UI, headings outside hero.
- **Mono:** JetBrains Mono (Google Fonts). For all addresses, hashes, amounts, technical values.

Load via `next/font/google` in `app/layout.tsx` for performance.

### Scale

| Token | Size | Line | Family | Use |
|---|---|---|---|---|
| `display-1` | 4rem (64px) | 1.05 | Fraunces 500 | Landing hero only |
| `display-2` | 3rem (48px) | 1.1 | Fraunces 500 | Page titles |
| `h1` | 2.25rem (36px) | 1.2 | Inter 600 | Section heads |
| `h2` | 1.875rem (30px) | 1.25 | Inter 600 | |
| `h3` | 1.5rem (24px) | 1.3 | Inter 600 | |
| `h4` | 1.25rem (20px) | 1.4 | Inter 600 | |
| `body-lg` | 1.125rem (18px) | 1.6 | Inter 400 | Lead paragraphs |
| `body` | 1rem (16px) | 1.6 | Inter 400 | Default |
| `body-sm` | 0.875rem (14px) | 1.5 | Inter 400 | Supporting |
| `caption` | 0.75rem (12px) | 1.4 | Inter 500 | Labels, badges |
| `overline` | 0.75rem (12px) | 1.2 | Inter 600, tracking 0.12em, uppercase | Section labels |
| `mono-lg` | 1rem (16px) | 1.5 | JetBrains Mono 400 | Headline amounts |
| `mono` | 0.875rem (14px) | 1.5 | JetBrains Mono 400 | Default mono |
| `mono-sm` | 0.75rem (12px) | 1.4 | JetBrains Mono 400 | Compact technical |

### Pairing Rules
- Hero section: display-1 (Fraunces) + body-lg (Inter)
- Page heads: display-2 (Fraunces) when ceremonial (credential pages); h1 (Inter) for tool pages
- Numerics that represent amounts, hashes, or addresses: ALWAYS mono. Never Inter.
- Mixing mono inline with body text: same line-height as body, weight 500, color slightly emphasized.

---

## 6. SPACING SCALE

4px base. Tailwind 4 defaults work. Used tokens:

| Tailwind | Pixels | Use |
|---|---|---|
| `0.5` | 2 | Hairline gaps |
| `1` | 4 | Tightly grouped icons + text |
| `2` | 8 | Dense form spacing |
| `3` | 12 | Default form spacing |
| `4` | 16 | Card inner padding (small) |
| `5` | 20 | Section gaps |
| `6` | 24 | Card inner padding (default) |
| `8` | 32 | Section padding (vertical) |
| `10` | 40 | Major section gaps |
| `12` | 48 | Hero vertical rhythm |
| `16` | 64 | Hero outer spacing (mobile) |
| `20` | 80 | Hero outer spacing (desktop) |
| `24` | 96 | Page-level vertical rhythm |

### Layout Containers
- Max content width: 1200px (`max-w-screen-xl`)
- Form / focused content: 640px (`max-w-2xl`)
- Reading prose: 720px (`max-w-3xl`)
- Side margins (mobile): 16px (`px-4`)
- Side margins (tablet+): 32px (`px-8`)
- Side margins (desktop): 48px (`px-12`)

---

## 7. MOTION & ANIMATION

Restraint over flair. Motion communicates state, never decorates.

### Durations
| Token | ms | Use |
|---|---|---|
| `duration-instant` | 80 | Hover color change, focus ring |
| `duration-fast` | 160 | Most UI transitions |
| `duration-base` | 240 | Default |
| `duration-slow` | 400 | Theme switch, page section reveals |
| `duration-deliberate` | 700 | Credential mint reveal — earned moment |

### Easing
- `ease-standard`: `cubic-bezier(0.4, 0, 0.2, 1)` — default
- `ease-accelerate`: `cubic-bezier(0.4, 0, 1, 1)` — exit
- `ease-decelerate`: `cubic-bezier(0, 0, 0.2, 1)` — enter

### Specific Animations
- **Button hover:** color transition 80ms ease-standard
- **Card hover:** subtle border lift `border-subtle → border-strong` 160ms
- **Modal enter:** opacity 0→1 + translate-y 4px → 0, 240ms ease-decelerate
- **Modal exit:** opacity 1→0, 160ms ease-accelerate
- **Toast:** slide in from bottom-right, 240ms ease-decelerate
- **Progress bar fill:** width transition 400ms ease-standard
- **Skeleton shimmer:** linear-gradient slide, 1.6s loop, ease-in-out
- **Credential mint reveal:** fade in + scale 0.96 → 1 + subtle glow (seal color), 700ms ease-decelerate. This is the only "celebratory" animation.
- **Proof progress:** stepped reveal — each step 200ms apart, fade in + height auto

### Reduced Motion
Respect `prefers-reduced-motion`. Replace transitions with instant state changes. Keep only opacity changes, no transforms or scale.

---

## 8. ICON SYSTEM

**Library:** Lucide React. Already in stack. No custom icons except logo.

### Sizes
- `12` — inline with caption text
- `16` — inline with body text, button leading icons
- `20` — default, navigation, large buttons
- `24` — section icons, primary actions
- `32` — feature blocks
- `48` — empty state illustrations

### Stroke
Default 1.5. For 12px size, stroke 1.25. Heavier stroke on small icons reads as bold/cluttered.

### Mapping (semantic → icon)

| Concept | Lucide |
|---|---|
| Privacy / shield | `ShieldCheck` (verified privacy), `Eye` / `EyeOff` |
| Wallet | `Wallet` |
| Connect | `Plug`, `Link2` |
| Income / payment | `BanknoteArrowUp`, `CircleDollarSign` |
| Credential / seal | `Award` for primary, `Stamp` for "verified" |
| Proof / cryptography | `KeyRound`, `Fingerprint`, `Sparkles` (for cipher accent) |
| Time / date | `Calendar`, `CalendarRange`, `Clock` |
| Threshold / target | `Target` |
| Agent | `Bot`, `Cpu` |
| Copy | `Copy`, `Check` (success) |
| External link | `ExternalLink` |
| Solana Explorer | `ExternalLink` (no special icon) |
| Loading | `Loader2` (with `animate-spin`) |
| Error | `CircleAlert` |
| Warning | `TriangleAlert` |
| Success | `CircleCheck` |
| Info | `CircleHelp`, `Info` |
| Status: live | `Radio` (animate pulse on dot) |
| Theme toggle | `Sun` / `MoonStar` |
| Menu / nav | `Menu`, `X` |

### Custom: TESSERA Logomark
SVG file at `public/logo.svg` and `public/logo-mark.svg`. The mark is a minimalist tessera token: small octagon with an inner cipher rune. Render at sizes 16, 20, 24, 32, 48. Always uses `currentColor` so it adapts to theme.

---

## 9. COMPONENT LIBRARY

Built on shadcn/ui where possible. Custom variants overlay.

### 9.1 Button
**Variants:** `primary`, `secondary`, `ghost`, `destructive`, `outline`
**Sizes:** `sm` (32px), `md` (40px, default), `lg` (48px)

```
primary: bg-text-primary text-bg-base hover:bg-text-secondary
secondary: bg-bg-surface border-border-strong text-text-primary
ghost: text-text-secondary hover:bg-bg-elevated hover:text-text-primary
destructive: bg-error text-text-inverse hover:bg-error/90
outline: border-border-strong text-text-primary hover:bg-bg-elevated
```

Loading state: replace label with `<Loader2 className="animate-spin" />` + retain width via `min-w-[original]`.

### 9.2 Input
**Default:** `bg-bg-surface border-border-subtle h-10 px-3 text-body rounded-md focus:border-cipher focus:ring-2 focus:ring-cipher/30`

**Specialized inputs:**
- `AmountInput` — right-aligned, mono font, token symbol postfix
- `AddressInput` — mono font, full-width, with paste button
- `DateRangeInput` — two date pickers with "to" connector
- `ThresholdInput` — number with USDC suffix, scrubbing on hover

### 9.3 Card
```
default: bg-bg-surface border border-border-subtle rounded-lg p-6
elevated: bg-bg-surface border border-border-subtle rounded-lg p-6 shadow-[0_8px_24px_rgba(0,0,0,0.32)]
outlined: bg-transparent border border-border-strong rounded-lg p-6
seal: bg-bg-surface border-2 border-seal/30 rounded-lg p-6 (used for verified credentials only)
```

### 9.4 Pill / Badge
```
default: bg-bg-elevated text-text-secondary border border-border-subtle px-2 py-0.5 rounded-full text-caption
seal: bg-seal-muted text-seal border border-seal/30 (verified)
cipher: bg-cipher-muted text-cipher border border-cipher/30 (proof-related)
warning: bg-warning/15 text-warning border border-warning/30
error: bg-error/15 text-error border border-error/30
success: bg-success/15 text-success border border-success/30
```

### 9.5 Toast
Bottom-right, stacks upward. Each toast: `bg-bg-elevated border-l-4 border-{semantic} pl-4 pr-6 py-3 rounded-md shadow-lg`. Includes icon, title, optional description, dismiss X. Auto-dismiss 5s for success/info, persistent for errors until user dismisses.

### 9.6 Modal / Dialog
Centered, max-width 480px (small) or 640px (large). Backdrop `bg-bg-overlay`. Animation per §7. Esc to close. Click-outside to close (except destructive flows — require explicit cancel).

### 9.7 Drawer
Right side on desktop, bottom on mobile. Used for: credential detail expanded view, agent live feed when triggered from another page.

### 9.8 Progress
**Linear:** `h-1 bg-bg-elevated overflow-hidden rounded-full` with inner `bg-cipher` width-animated.
**With status:** progress bar + status text below in `caption text-text-secondary`. Status text changes per stage: "Initializing... → Building witness... → Generating proof... → Verifying..."
**Stepper:** Horizontal numbered steps with connecting line. Active step in `cipher`, completed in `success`, upcoming in `text-muted`.

### 9.9 Skeleton
`bg-bg-elevated relative overflow-hidden rounded-md` with shimmer pseudo-element animating across.

```
.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, var(--border-subtle), transparent);
  animation: shimmer 1.6s infinite;
}
```

### 9.10 AddressDisplay
```tsx
<AddressDisplay address="9xQe...4Hp2" full="9xQeRy...4Hp2" />
```
- Mono font, body-sm size
- Format: `${first6}...${last4}`
- Hover: shows full address as tooltip
- Click: copies to clipboard, swaps icon to `Check` for 1.4s, toast "Address copied"
- Optional explorer link icon (`ExternalLink`) opens Solana Explorer in new tab

### 9.11 TxHashDisplay
Same as AddressDisplay but with `mono-sm`, format `${first8}...${last8}`, always shows ExternalLink to Explorer.

### 9.12 AmountDisplay
```tsx
<AmountDisplay amount={1500000n} token="USDC" decimals={6} />
```
- Mono font
- Format: `1,500.00 USDC` (commas, fixed decimals based on token)
- Token symbol in `text-secondary`, value in `text-primary`
- Hidden state for private amounts: `•••• USDC` (used in scan results before reveal)

### 9.13 StatusBanner
Top-of-page strip when system has degraded service.
```
indexer offline → warning banner: "Umbra indexer temporarily slow. Operations may take longer."
relayer offline → info banner: "Gasless mode unavailable. A small SOL fee applies to withdrawals."
demo mode → cipher banner: "You're on devnet. Mainnet launch coming soon."
```
Dismissible with X. Reappears on page refresh if condition persists.

### 9.14 SealCard (custom — credential card)
Larger, more ceremonial card used only for displaying minted credentials.

```
Card outer: bg-bg-surface border-2 border-seal/30 rounded-xl p-8
Header row: Fraunces display-2 "VERIFIED CREDENTIAL" + seal Stamp icon top-right
Divider: 1px border-seal/20 my-6
Public signals section: grid-cols-2 gap-4 with mono values
Footer: Issued at + expires at, body-sm text-secondary
Optional decorative element: subtle parchment texture or border filigree (CSS only)
```

The seal accent is reserved for this component and its hover variants — keeps the wax-seal moment scarce and meaningful.

### 9.15 Stepper (Onboarding)
Horizontal: `[1] Connect → [2] Register → [3] Done`. Active step has cipher fill, completed has success check, upcoming has muted dot.

### 9.16 LiveFeedItem (Agent page)
Terminal-style row in agent feed:
```
[14:32:08] payment.received  amount=1.00 USDC  from=9xQe...4Hp2  status=confirmed
[14:32:11] proof.generating  range=2026-01..2026-04  threshold=3000
[14:32:14] proof.complete    duration=842ms       ✓
[14:32:17] credential.minted tx=4Vt8...nP2k  ✓
```
Mono-sm, color-coded status (success in `success`, in-progress in `cipher`, errors in `error`).

---

## 10. LAYOUT SYSTEM

### Grid
12-column grid on desktop (`grid-cols-12`). Gutter 24px (`gap-6`).
4-column on mobile.

### Page Frame
Every page wraps in:
```tsx
<div className="min-h-screen bg-bg-base text-text-primary">
  <StatusBanner />  {/* conditional */}
  <Header />
  <main className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 max-w-screen-xl">
    {/* page content */}
  </main>
  <Footer />
</div>
```

### Header
Sticky top, height 64px.
- Left: TESSERA wordmark (links to /)
- Center (desktop only): nav links — Employer, Employee, Agent, Verify
- Right: theme toggle, wallet button (or "Connect" if disconnected)
- Mobile: hamburger replaces center nav

### Footer
Minimal: TESSERA wordmark, "Built with Umbra · Powered by Solana", GitHub icon, Discord icon. Border-subtle top border. py-8.

---

## 11. PAGE SPECIFICATIONS

Every page must specify: layout wireframe, empty state, loading state, error state(s), success state, full microcopy.

---

### 11.1 Landing `/`

**Purpose:** Communicate the protocol's value to a new visitor in under 8 seconds. Drive to either /employer or /employee.

**Wireframe (desktop, top-to-bottom):**

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER  [TESSERA]   Employer  Employee  Agent  Verify  [Connect]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│            P R O V E   Y O U R   I N C O M E                    │
│                R E V E A L   N O T H I N G                      │
│                                                                 │
│            (display-1 Fraunces, centered)                       │
│                                                                 │
│   Cryptographic creditworthiness on Solana. Built on Umbra.    │
│            (body-lg, text-secondary, centered)                  │
│                                                                 │
│           [I'm an Employer]  [I'm an Employee]                  │
│              (lg buttons, side by side)                         │
│                                                                 │
│                  ↓                                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  HOW IT WORKS (3 columns)                                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ 01           │  │ 02           │  │ 03           │           │
│  │ SHIELD       │  │ PROVE        │  │ MINT         │           │
│  │              │  │              │  │              │           │
│  │ Employer pays│  │ Employee     │  │ Compressed   │           │
│  │ via Umbra.   │  │ generates ZK │  │ NFT credential│          │
│  │ Amounts hide.│  │ proof of inc.│  │ on Solana.   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│  FOR HUMANS AND AGENTS  (split content area)                    │
│                                                                 │
│  Left column: Human flow description + small illustration       │
│  Right column: Agent flow description + small illustration      │
├─────────────────────────────────────────────────────────────────┤
│  WHO BUILDS ON TESSERA                                          │
│                                                                 │
│  Logos / use case grid: Lending · Rentals · DAOs · Visa · Agents│
├─────────────────────────────────────────────────────────────────┤
│  CTA SECTION                                                    │
│                                                                 │
│  Get started — pick your path:                                  │
│  [Shield Salaries (Employer)] [Generate Proof (Employee)]       │
│  [Build Agent Integration]    [Verify Credential]               │
├─────────────────────────────────────────────────────────────────┤
│  FOOTER                                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Hero design notes:**
- Display-1 with character spacing — letters set far apart for ceremonial feel: `tracking-[0.04em]`
- "P R O V E" stylized with letter-spacing 0.4em on first line, normal on second — emphasizes the imperative
- Subtle SVG ornament behind hero: faint geometric pattern evoking ancient mosaic, opacity 8%

**States:**
- Default: as wireframed
- Loading: not applicable — static page
- Error: not applicable — fallback to /

**Microcopy:**
- Hero headline: "Prove your income."
- Hero sub-headline: "Reveal nothing."
- Lead body: "Cryptographic creditworthiness on Solana. Built on Umbra."
- Primary CTAs: "I'm an Employer", "I'm an Employee"
- Section overline 1: "How it works"
- Step 1 title: "Shield"
- Step 1 body: "Employers pay salaries through Umbra's confidential transfers. Amounts and recipients are encrypted on-chain."
- Step 2 title: "Prove"
- Step 2 body: "Employees scan their own income with a viewing key. A Groth16 ZK proof attests their income exceeds a threshold — without revealing it."
- Step 3 title: "Mint"
- Step 3 body: "The proof verifies on-chain in under 200,000 compute units. A compressed NFT credential is minted. Composable. Reusable. Private."
- Section overline 2: "For humans and agents"
- Human column: "A developer in Lagos, paid in USDC by a global DAO, can finally prove their income to a bank without exposing their wallet."
- Agent column: "An autonomous agent can receive payments, mint credentials, and pay downstream services — all through a private x402 rail."
- Footer copy: "Built with Umbra · Powered by Solana · Open source"

---

### 11.2 Onboarding (Modal Flow)

**Purpose:** First-time users (no Umbra registration detected) see a three-step modal flow: Connect → Register → Set up complete.

**Trigger:** When wallet connects on `/employer`, `/employee`, or `/agent` AND `client.isRegistered === false`.

**Wireframe (modal):**

```
┌────────────────────────────────────────┐
│                                    [X] │
│                                        │
│  ●─────○─────○                         │
│  Connect Register Done                 │
│                                        │
│  Welcome to TESSERA                    │
│  (h2 Inter)                            │
│                                        │
│  Set up your private identity.         │
│  This takes about 30 seconds.          │
│                                        │
│  [Step content varies]                 │
│                                        │
│  [Continue →]                          │
│                                        │
└────────────────────────────────────────┘
```

**Step 1 — Connect (already done if reaching this):** verifies wallet connected.
**Step 2 — Register:** explains what registration does + signature prompt.
- Title: "Create your Umbra identity"
- Body: "Your wallet will sign a one-time message. This generates your private master seed — used to derive your Umbra address. The signature is deterministic: same wallet, same identity, every time."
- Action: "Sign and register"
- After click: button shows loading; on success → step 3.

**Step 3 — Done:**
- Title: "You're set up"
- Body: "Your Umbra address is `9xQe...4Hp2` (mono, copy button). Save it — this is where you'll receive shielded payments."
- Action: "Continue to [Employee/Employer/Agent]"

**States:**
- Loading (during sign): show spinner + "Waiting for wallet signature..."
- User rejected: error toast "Signature cancelled. Try again to register."
- Network error: error toast "Couldn't reach Umbra network. Retry."

**Microcopy:**
- Modal title (step 1): "Welcome to TESSERA"
- Modal title (step 2): "Create your Umbra identity"
- Modal title (step 3): "You're set up"
- Step descriptions: as above
- Skip option: NOT offered. Registration is required.

---

### 11.3 Employer `/employer`

**Purpose:** Pay one or more recipients (humans or agents) with shielded salary payments via Umbra.

**Wireframe:**

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER                                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  EMPLOYER DASHBOARD                                            │
│  (display-2 Fraunces)                                          │
│                                                                │
│  Pay salaries privately. Recipients see amounts; the world     │
│  doesn't.                                                      │
│  (body-lg text-secondary)                                      │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ NEW SHIELDED PAYMENT                                   │   │
│  │ (h3 Inter)                                             │   │
│  │                                                        │   │
│  │  Recipient Umbra Address                               │   │
│  │  [9xQe...4Hp2                              ] [Paste]  │   │
│  │  (caption: where to send the payment)                  │   │
│  │                                                        │   │
│  │  Amount                            Token              │   │
│  │  [1,000.00            ]  [USDC ▾]                     │   │
│  │                                                        │   │
│  │  Reference (optional, off-chain note)                  │   │
│  │  [March salary                              ]          │   │
│  │                                                        │   │
│  │  [Shield Payment →]   (primary lg, full width on mobile)│  │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  RECENT PAYMENTS                                               │
│  (overline)                                                    │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Recipient        Amount     When     Status      Tx    │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ 9xQe...4Hp2   1,000.00 USDC  2h ago   ✓ Shielded  ↗   │   │
│  │ Bk7n...91Mz     500.00 USDC  1d ago   ✓ Shielded  ↗   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**States:**

*Empty state* (no recent payments):
```
┌──────────────────────────────────┐
│           ⊞ (BanknoteArrowUp)    │
│                                  │
│   No payments yet                │
│   (h3)                           │
│                                  │
│   When you shield a payment,     │
│   it'll show up here.            │
│   (body-sm text-secondary)       │
└──────────────────────────────────┘
```

*Loading state* (fetching history):
3 skeleton rows in the recent payments table.

*Submitting state* (after user clicks Shield Payment):
- Button label changes to "Shielding..."
- Progress beneath form:
  - "1. Submitted to Solana ✓ (tx: 4Vt8...nP2k)"
  - "2. Encrypting via Arcium MPC..."  ← in-progress, animated
  - "3. UTXO committed"   ← waiting

The progress takes 8–30s on mainnet. Don't fake it. Voice-over copy below progress: "MPC computation can take up to 30 seconds — your payment is being encrypted off-chain before commitment."

*Success state:*
- Toast: "Payment shielded ✓"
- Form resets
- New entry slides into top of recent payments table
- Brief seal-glow on new row (700ms)

*Error states:*
- Invalid Umbra address: red border on input, caption "Not a valid Umbra address"
- Insufficient balance: caption "Your wallet has X USDC. Enter a smaller amount or fund your wallet."
- MPC timeout: toast "Encryption is taking longer than expected. Your payment will appear shortly. [View on Solana Explorer]"
- Rejected by wallet: toast "Transaction cancelled."
- RPC error: toast "Couldn't reach Solana. Retry in a moment."

**Microcopy:**
- Page title: "Employer Dashboard"
- Page subtitle: "Pay salaries privately. Recipients see amounts; the world doesn't."
- Form section: "New Shielded Payment"
- Label — recipient: "Recipient Umbra Address"
- Helper — recipient: "where to send the payment"
- Label — amount: "Amount"
- Label — token: "Token"
- Label — reference: "Reference (optional, off-chain note)"
- Helper — reference: "Visible only to the recipient when they decrypt"
- Primary action: "Shield Payment"
- Recent payments header: "Recent Payments"
- Recent table columns: "Recipient" "Amount" "When" "Status" (no header word for tx link)
- Empty state title: "No payments yet"
- Empty state body: "When you shield a payment, it'll show up here."

---

### 11.4 Employee `/employee`

**Purpose:** Scan own income, build witness, generate ZK proof, mint credential.

**Wireframe (after onboarding):**

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER                                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  EMPLOYEE DASHBOARD                                            │
│  (display-2 Fraunces)                                          │
│                                                                │
│  Generate a credential proving your income — without revealing │
│  it.                                                           │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  YOUR UMBRA ADDRESS                                    │   │
│  │  9xQe...4Hp2                            [Copy]         │   │
│  │  Share with your employer.                             │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  GENERATE CREDENTIAL  (h2)                                     │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  ●─────○─────○                                         │   │
│  │  Scan  Configure  Prove                                │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │  [Step 1: Scan your income]                            │   │
│  │                                                        │   │
│  │  Scan your Umbra UTXOs to find shielded salary         │   │
│  │  payments. Your viewing key never leaves your device.  │   │
│  │                                                        │   │
│  │  [Scan UTXOs →]                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  YOUR CREDENTIALS  (overline)                                  │
│                                                                │
│  [Empty or list of credential cards — see SealCard]            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Step 1 — Scan:**

```
[Step 1: Scan your income]
[Scan UTXOs →]
```

After click — loading state:
```
[Scanning your shielded UTXOs...]
[progress bar with text below: "Found 0 deposits..." → "Found 12 deposits..."]
```

After scan — results:
```
Found 14 shielded deposits
Total period: Jan 12 2026 — Apr 28 2026
[Continue →]
```

(Amounts not displayed at this stage — user hasn't asked for the proof yet.)

If 0 results:
```
No shielded deposits found
You haven't received any payments through Umbra yet. Share your Umbra address with your employer, then come back here.
[Copy address]
```

**Step 2 — Configure:**

```
[Step 2: Configure your proof]

What income are you proving?

  Date range
  ┌────────────┐    ┌────────────┐
  │ Jan 1 2026 │ to │ Jul 1 2026 │
  └────────────┘    └────────────┘

  Threshold (minimum income for this period)
  ┌────────────────────┐
  │  3,000          USDC │
  └────────────────────┘
  
  Your selection includes 6 deposits in this range.

  [Generate Proof →]
```

**Step 3 — Prove:**

Multi-stage progress display.

```
[Generating your proof...]

  ✓ 1. Decrypting your UTXOs        842ms
  ✓ 2. Building witness             103ms
  ⋯ 3. Generating ZK proof          (running)
  ○ 4. Verifying on-chain           
  ○ 5. Minting credential

  [progress bar across all 5 stages]
  
  This usually takes 3–5 seconds. The proof is being
  generated in your browser — your data never leaves
  your device.
```

After all 5 complete:

```
✓ 1. Decrypting your UTXOs        842ms
✓ 2. Building witness             103ms
✓ 3. Generating ZK proof        2,134ms
✓ 4. Verifying on-chain         1,082ms
✓ 5. Minting credential        18,432ms

[View Credential →]
```

The credential card slides in below with the seal animation (per §7).

**States:**

*Empty state* (no credentials yet):
- Show only "Generate Credential" section, no "Your Credentials" listing.

*Loading states:*
- Each step in the prove flow has its own animated state
- Web Worker handles snarkjs to keep UI responsive

*Error states:*
- Sum below threshold: "Your income in this period is below the threshold. Try a wider date range or a lower threshold." — keep stepper visible, allow retry
- Proof generation fails: "Proof generation failed. This is unusual. Refresh and try again. If it persists, contact support." (error toast)
- On-chain verification fails: "Your proof was rejected on-chain. Regenerate from a fresh scan." (error toast)
- Mint fails: "Credential mint failed. Your proof is valid — retry." (error toast, retry button keeps proof)
- Devnet relayer offline: warning banner "Gasless mode unavailable. A small SOL fee will apply."

**Microcopy:**
- Page title: "Employee Dashboard"
- Page subtitle: "Generate a credential proving your income — without revealing it."
- Address card label: "Your Umbra Address"
- Address card helper: "Share with your employer."
- Section title: "Generate Credential"
- Step 1 title: "Scan your income"
- Step 1 body: "Scan your Umbra UTXOs to find shielded salary payments. Your viewing key never leaves your device."
- Step 1 action: "Scan UTXOs"
- Step 2 title: "Configure your proof"
- Step 2 prompt: "What income are you proving?"
- Step 2 helper: "Your selection includes {N} deposits in this range."
- Step 2 action: "Generate Proof"
- Step 3 title: "Generating your proof..."
- Step 3 stages: "Decrypting your UTXOs", "Building witness", "Generating ZK proof", "Verifying on-chain", "Minting credential"
- Step 3 reassurance: "This usually takes 3–5 seconds. The proof is being generated in your browser — your data never leaves your device."
- Final action: "View Credential"
- Section: "Your Credentials"

---

### 11.5 Agent `/agent`

**Purpose:** Live demonstration of agent-mode TESSERA. Shows a running agent receiving payments, generating proofs, paying downstream services.

**Wireframe (split layout):**

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER                                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  AGENT MODE                                                    │
│                                                                │
│  Same protocol. No browser. No human. Autonomous.              │
│                                                                │
│  ┌─────────────────────┐  ┌─────────────────────────────┐    │
│  │  AGENT CONTROL      │  │  LIVE FEED                  │    │
│  │  (h3)               │  │  (h3)                       │    │
│  │                     │  │                             │    │
│  │  Status: ● Running  │  │  [terminal-style log feed]  │    │
│  │  Pubkey:            │  │                             │    │
│  │    Agent7...91Kz    │  │  [14:32:08] payment.received│    │
│  │                     │  │  [14:32:11] proof.generating│    │
│  │  Umbra address:     │  │  [14:32:14] proof.complete  │    │
│  │    9xQe...4Hp2      │  │  [14:32:17] credential.minted│   │
│  │                     │  │  [14:32:21] x402.outbound   │    │
│  │  Balance (shielded):│  │                             │    │
│  │    •••• USDC        │  │                             │    │
│  │                     │  │                             │    │
│  │  Actions:           │  │                             │    │
│  │  [Trigger payment]  │  │                             │    │
│  │  [Mint credential]  │  │                             │    │
│  │  [Pay x402 service] │  │                             │    │
│  │                     │  │                             │    │
│  │  [Stop agent]       │  │                             │    │
│  └─────────────────────┘  └─────────────────────────────┘    │
│                                                                │
│  WHAT THIS DEMONSTRATES                                        │
│  3-column block:                                               │
│  • Headless Umbra identity (no browser needed)                 │
│  • Same ZK proof generation, in Node.js                        │
│  • Private x402 payment rail (machine-to-machine)              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Initial state (no agent running):**

```
┌─────────────────────────────────────────┐
│  ⌬ (Bot icon, 48px, text-muted)         │
│                                         │
│  No agent running                       │
│  (h3 centered)                          │
│                                         │
│  Spawn a demo agent to see TESSERA in   │
│  agent mode.                            │
│                                         │
│  [Spawn Demo Agent]                     │
└─────────────────────────────────────────┘
```

**After spawn:** Layout above appears. Live feed begins streaming via SSE.

**Live feed item rendering:** monospace, color-coded by status keyword (per §9.16).

**Trigger payment action:** Calls /api/agent/spawn and simulates an upstream service paying the agent. Live feed picks up the event in real time.

**Mint credential action:** Triggers full proof + mint flow on the running agent's side. Live feed shows step-by-step in mono.

**Pay x402 service action:** Calls /api/x402/charge — a demo paid endpoint. Agent pays via x402UmbraAdapter; live feed shows payment outbound + service response.

**States:**
- Empty: as wireframed
- Spawning: "Spawning agent..." with Loader2
- Running: live feed updating
- Stopped: agent control shows ● Stopped (red dot), feed frozen
- Error: error toast "Agent process crashed. Spawn again to retry."

**Microcopy:**
- Page title: "Agent Mode"
- Page subtitle: "Same protocol. No browser. No human. Autonomous."
- Empty state: "No agent running"
- Empty state body: "Spawn a demo agent to see TESSERA in agent mode."
- Action: "Spawn Demo Agent"
- Agent panel: "Agent Control"
- Status labels: "● Running" (success), "● Stopped" (error)
- Action buttons: "Trigger payment", "Mint credential", "Pay x402 service", "Stop agent"
- Live feed header: "Live Feed"
- Bottom block heading: "What this demonstrates"
- Bullet 1: "Headless Umbra identity (no browser needed)"
- Bullet 2: "Same ZK proof generation, in Node.js (<1s)"
- Bullet 3: "Private x402 payment rail (machine-to-machine, payment graph hidden)"

---

### 11.6 Credential Viewer `/credential/[address]`

**Purpose:** Public, shareable URL displaying an issued credential by reading on-chain state.

**Wireframe:**

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER (no nav highlight — public-shareable page)             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   CREDENTIAL                                                   │
│   (overline, centered)                                         │
│                                                                │
│   ┌──────────────────────────────────────────────────┐         │
│   │                                                  │         │
│   │           ⊕ STAMP                                │         │
│   │                                                  │         │
│   │  VERIFIED CREDENTIAL                             │         │
│   │  (display-2 Fraunces, centered)                  │         │
│   │                                                  │         │
│   │  Income confirmed above threshold                │         │
│   │  for the stated period.                          │         │
│   │  (body-lg text-secondary, centered)              │         │
│   │                                                  │         │
│   │  ─────────────────────────────────────────       │         │
│   │                                                  │         │
│   │  Threshold              3,000.00 USDC            │         │
│   │  Date range             Jan 1 — Jul 1, 2026      │         │
│   │  Issued                 Apr 28, 2026             │         │
│   │  Expires                Jul 27, 2026             │         │
│   │  Issuer                 TESSERA Protocol         │         │
│   │  Employer commitment    a8f3...d92e (mono)       │         │
│   │  Proof hash             4c1d...f7b2 (mono)       │         │
│   │                                                  │         │
│   │  ─────────────────────────────────────────       │         │
│   │                                                  │         │
│   │  [Verify on Solana Explorer ↗]                  │         │
│   │  [Copy proof hash]                               │         │
│   │                                                  │         │
│   └──────────────────────────────────────────────────┘         │
│                                                                │
│   What this credential proves:                                 │
│   The holder's verified income exceeds 3,000 USDC over Jan 1   │
│   — Jul 1, 2026. The exact amount, employer identity, and      │
│   transaction history are not disclosed.                       │
│                                                                │
│   How verifiers use it:                                        │
│   Any Solana protocol can call verify_credential(holder) on    │
│   the TESSERA program. They never see income data.             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

The card uses `SealCard` (§9.14). Subtle animation on load: fade + scale.

**States:**

*Loading:* Skeleton card with shimmer.

*Not found:*
```
[Empty state]
🔍 (Search icon, 48px, text-muted)
No credential at this address
The address doesn't have a TESSERA credential, or it's been revoked.
[Verify on Explorer →]
```

*Expired:*
- Render normally but with warning pill near top: `[EXPIRED 12 days ago]`
- Card border-color shifts to `border-warning/40`
- Add explanatory line: "This credential expired Apr 16, 2026. The holder must regenerate to renew."

*Revoked / Invalid:*
- Pill: `[INVALID]`
- Card border `border-error/40`
- Detail: "On-chain state shows this credential is no longer valid."

**Microcopy:**
- Overline: "Credential"
- Card title: "Verified Credential"
- Card subtitle: "Income confirmed above threshold for the stated period."
- Field labels: "Threshold", "Date range", "Issued", "Expires", "Issuer", "Employer commitment", "Proof hash"
- Action 1: "Verify on Solana Explorer"
- Action 2: "Copy proof hash"
- Body section 1: "What this credential proves:"
- Body section 1 detail: "The holder's verified income exceeds {threshold} USDC over {date_range}. The exact amount, employer identity, and transaction history are not disclosed."
- Body section 2: "How verifiers use it:"
- Body section 2 detail: "Any Solana protocol can call `verify_credential(holder)` on the TESSERA program. They never see income data."
- Empty state title: "No credential at this address"
- Empty state body: "The address doesn't have a TESSERA credential, or it's been revoked."

---

### 11.7 Verifier Demo `/verify`

**Purpose:** Show what a B2B integration looks like. A simulated DeFi protocol screen demonstrating one CPI call.

**Wireframe:**

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER                                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   VERIFIER DEMO                                                │
│   (display-2 Fraunces)                                         │
│                                                                │
│   This is what an integrating protocol sees. One CPI call.     │
│   No income data exposed.                                      │
│                                                                │
│   ┌──────────────────────────────────────────────────┐        │
│   │  SIMULATED LENDING PROTOCOL                      │        │
│   │  (h3, with pill: "DEMO")                         │        │
│   │                                                  │        │
│   │  Loan eligibility check                          │        │
│   │                                                  │        │
│   │  Required income threshold:                      │        │
│   │  [2,500             ] USDC                       │        │
│   │                                                  │        │
│   │  Applicant wallet address:                       │        │
│   │  [9xQe...                                  ]    │        │
│   │                                                  │        │
│   │  [Check Eligibility →]                           │        │
│   │                                                  │        │
│   │  ─────────────────────────────────────────       │        │
│   │                                                  │        │
│   │  Result:                                         │        │
│   │  [⊕ Approved] Income above 2,500 USDC threshold. │        │
│   │  Credential expires Jul 27, 2026.                │        │
│   │                                                  │        │
│   └──────────────────────────────────────────────────┘        │
│                                                                │
│   ┌──────────────────────────────────────────────────┐        │
│   │  WHAT JUST HAPPENED                              │        │
│   │                                                  │        │
│   │  We made one CPI call to TESSERA's program:      │        │
│   │  (mono code block)                               │        │
│   │                                                  │        │
│   │  verify_credential(                              │        │
│   │    employee_pubkey: "9xQe...",                   │        │
│   │    required_threshold: 2500_000_000              │        │
│   │  ) → { valid: true, threshold: 3000_000_000,    │        │
│   │       expires_at: 1722374400 }                   │        │
│   │                                                  │        │
│   │  We never saw the applicant's income.            │        │
│   │  Their wallet history is private.                │        │
│   │  We just got a cryptographic guarantee.          │        │
│   └──────────────────────────────────────────────────┘        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**States:**

- Default (form empty): action button disabled until valid pubkey entered.
- Verifying: button shows spinner, "Checking..."
- Approved: result block fills in with `seal` accent + Stamp icon
- Denied: result block with `error` accent + label "Below threshold" or "Credential expired" or "No credential found"
- Error: toast on RPC failures

**Microcopy:**
- Page title: "Verifier Demo"
- Page subtitle: "This is what an integrating protocol sees. One CPI call. No income data exposed."
- Card title: "Simulated Lending Protocol"
- Card pill: "DEMO"
- Section: "Loan eligibility check"
- Field 1 label: "Required income threshold"
- Field 2 label: "Applicant wallet address"
- Action: "Check Eligibility"
- Result label: "Result:"
- Result success: "Approved · Income above {threshold} USDC threshold. Credential expires {date}."
- Result denied (no credential): "Denied · No credential found at this address."
- Result denied (below threshold): "Denied · Credential threshold ({existing}) below required ({required})."
- Result denied (expired): "Denied · Credential expired {date_relative}."
- Bottom block header: "What just happened"
- Bottom block body: "We made one CPI call to TESSERA's program: ... We never saw the applicant's income. Their wallet history is private. We just got a cryptographic guarantee."

---

## 12. CROSS-CUTTING PATTERNS

### 12.1 Empty States
Every list / collection in the app has an empty state. Format: icon (48px, muted) + h3 title + body-sm helper + optional action.

| Page | Empty Title | Empty Body | Action |
|---|---|---|---|
| Employer recent payments | "No payments yet" | "When you shield a payment, it'll show up here." | (none) |
| Employee credentials | "No credentials yet" | "Generate your first credential below." | (scroll to generator) |
| Agent feed | "No activity yet" | "Trigger an action to see live agent events." | (point to controls) |
| Credential viewer (404) | "No credential at this address" | "The address doesn't have a TESSERA credential, or it's been revoked." | "Verify on Explorer" |

### 12.2 Loading States

**Spinners** for inline button loading (Loader2 from Lucide, animate-spin).
**Skeletons** for list/card loading. Match the shape of incoming content. Always shimmer.
**Progress bars** with status text for multi-stage operations (proof generation).
**Pulsing dot** for live status indicators (`● Running` for agent).

Never show generic "Loading..." text. Always describe what's happening:
- "Scanning UTXOs..." (not "Loading...")
- "Generating proof..." (not "Please wait...")
- "Encrypting with MPC..."

### 12.3 Error States

Three tiers:

**Inline (form-level):** Red border on input, caption below in `error` color. Used for invalid input.

**Toast (transient):** Used for transient failures and confirmations. Position bottom-right. 5s auto-dismiss for success/info; persistent for errors.

**Page-level error block:** Used when the entire page can't load (RPC down, indexer offline). Replaces page content with:
```
⚠ (TriangleAlert, 48px, error)
Something went wrong
{specific reason}
[Retry]
```

### 12.4 Tx Hash Treatment
Component: `<TxHashDisplay sig="4Vt8...nP2k" />`
- Mono-sm font
- Truncated `${first8}...${last8}`
- Always followed by ExternalLink icon
- Click anywhere on hash: copies to clipboard, toast "Hash copied"
- Click on icon: opens Solana Explorer in new tab — `https://explorer.solana.com/tx/${full}?cluster=devnet`

### 12.5 Address Display
Component: `<AddressDisplay addr="9xQe...4Hp2" />`
- Mono-sm font
- Truncated `${first6}...${last4}`
- Tooltip on hover shows full address
- Click: copies, toast "Address copied"
- Optional `withExplorer` prop adds external link

### 12.6 Amount Display
Component: `<AmountDisplay amount={1500000n} token="USDC" decimals={6} />`
- Mono font, body-sm or body
- Comma-separated thousands
- Fixed decimal places per token (USDC: 2, SOL: 4)
- Token symbol after value, in `text-secondary`
- Optional `hidden` prop renders `•••• USDC` for unscanned amounts
- Optional `change` prop adds delta with success/error color

### 12.7 Toast System
Library: `sonner` (shadcn-recommended). Config:
- Position: `bottom-right`
- Theme: matches app theme
- Duration: 5000 (success/info), Infinity (error — user dismisses)
- Stack: max 3 visible, queue rest

Toast types:
- `success` (CircleCheck icon, success accent)
- `info` (Info icon, cipher accent)
- `warning` (TriangleAlert icon, warning accent)
- `error` (CircleAlert icon, error accent — persistent)

### 12.8 Modal / Dialog System
shadcn `Dialog` component. Always: dark backdrop, max-w-md or max-w-lg, animate per §7. Esc to close. Click-outside closes EXCEPT during destructive flows (require explicit cancel).

---

## 13. MICROCOPY LIBRARY

Every string in the app, organized by surface.

### Buttons
| Context | Label |
|---|---|
| Connect wallet (header) | "Connect" |
| Connecting | "Connecting..." |
| Connected (shows addr) | "{address}" with disconnect icon |
| Sign / register | "Sign and register" |
| Signing | "Waiting for signature..." |
| Shield payment | "Shield Payment" |
| Shielding | "Shielding..." |
| Scan UTXOs | "Scan UTXOs" |
| Scanning | "Scanning..." |
| Generate proof | "Generate Proof" |
| Generating | "Generating..." |
| Mint credential | "Mint Credential" |
| Minting | "Minting..." |
| View credential | "View Credential" |
| Copy | "Copy" |
| Copied | "Copied" (transient) |
| Open in Explorer | "Open in Explorer" |
| Retry | "Retry" |
| Cancel | "Cancel" |
| Continue | "Continue" |
| Spawn agent | "Spawn Demo Agent" |
| Stop agent | "Stop Agent" |
| Trigger payment | "Trigger Payment" |
| Pay service | "Pay x402 Service" |
| Check eligibility | "Check Eligibility" |

### Toasts (success)
- Wallet connected: "Wallet connected"
- Registered with Umbra: "Umbra identity created"
- Payment shielded: "Payment shielded ✓"
- Proof generated: "Proof generated"
- Credential minted: "Credential minted ✓"
- Address copied: "Address copied"
- Hash copied: "Hash copied"
- Agent spawned: "Agent running"

### Toasts (info)
- Scanning: "Scanning your UTXOs..."
- MPC delay: "Encryption may take up to 30 seconds"

### Toasts (warning)
- Devnet only: "You're on devnet — not real funds"
- Anonymity set small: "Anonymity pool is small. Consider waiting before claiming for stronger privacy."
- Mobile detected: "For best results, use desktop"

### Toasts (errors)
- Wallet rejected: "Transaction cancelled."
- Insufficient balance: "Wallet has {balance}. Add funds or reduce the amount."
- Invalid address: "Not a valid Umbra address."
- RPC error: "Couldn't reach Solana. Try again in a moment."
- Indexer error: "Umbra indexer is slow. Retrying..."
- Proof generation failed: "Proof generation failed. Refresh and try again."
- Verification failed: "Proof rejected on-chain. Regenerate from a fresh scan."
- Mint failed: "Credential mint failed. Your proof is valid — retry."
- Sum below threshold: "Income in this period is below the threshold. Try a wider range or lower threshold."
- Generic: "Something went wrong. Try again."

### Empty / Zero States
Listed in §12.1.

### Helpers / Captions
- "where to send the payment" (recipient field, employer)
- "Visible only to the recipient when they decrypt" (reference field, employer)
- "Share with your employer." (own Umbra address, employee)
- "Your viewing key never leaves your device." (scan helper, employee)
- "Your data never leaves your device." (proof gen helper, employee)
- "This usually takes 3–5 seconds." (proof gen helper, employee)
- "Proof verifies on-chain in under 200,000 compute units." (technical detail, optional info expansion)
- "Compressed NFT — minimal on-chain cost." (mint helper)

### Section Overlines
- "How it works" (landing)
- "For humans and agents" (landing)
- "Recent Payments" (employer)
- "Your Credentials" (employee)
- "What this demonstrates" (agent page)
- "What just happened" (verify page)

### Status Text (real-time)
- Stage 1 in proof: "Decrypting your UTXOs"
- Stage 2: "Building witness"
- Stage 3: "Generating ZK proof"
- Stage 4: "Verifying on-chain"
- Stage 5: "Minting credential"
- Live feed events: "payment.received", "proof.generating", "proof.complete", "credential.minted", "x402.outbound", "x402.inbound", "x402.confirmed"

---

## 14. MOBILE & RESPONSIVE STRATEGY

### Breakpoints (Tailwind)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Strategy by page

**Landing /** — Mobile-first. Hero stacks vertically. CTAs full-width on mobile. Three-column sections become single column.

**Employer /** — Form is fine on mobile. Recent payments table converts to cards on mobile (each row a stacked card with all fields).

**Employee /** — Stepper goes vertical on mobile. Date range pickers stack. Proof generation works on mobile but is bandwidth/CPU-intensive — show toast: "For fastest proof generation, use desktop."

**Agent /** — Most complex. On mobile, split view becomes tabs (Control | Live Feed). Live feed gets full screen when active. Demo really shines on desktop — accept that mobile is "view-mode only" and disable spawn-agent on mobile with copy "Open on desktop to interact."

**Credential /[address]** — Mobile-friendly. SealCard scales down. All info visible.

**Verify /** — Form adapts to single column. Code block in "what just happened" stays mono and scrollable horizontally.

### Mobile-specific behavior
- Header: hamburger menu replaces center nav
- Wallet button: shows just first 4 chars of address (more compact)
- Tooltips: convert to long-press → show as bottom sheet
- Toasts: full-width at bottom

---

## 15. ACCESSIBILITY BASELINE

WCAG AA target.

### Color contrast
- Body text on `bg-base`: F5EFE0 on 0B0D10 = 16.4:1 (AAA)
- Secondary text: A8A199 on 0B0D10 = 7.8:1 (AAA)
- Accent text: cipher on bg-base = 6.1:1 (AA)
- Seal text: A23B2C on bg-base = 4.5:1 (AA — at the boundary; only use on body+ size)

### Keyboard navigation
- Every interactive element focusable
- Focus ring: `outline-none ring-2 ring-cipher ring-offset-2 ring-offset-bg-base`
- Tab order matches visual flow
- Escape closes modals/drawers
- Enter submits forms

### ARIA
- Stepper uses `role="tablist"` semantics
- Live feed uses `role="log" aria-live="polite"`
- Toasts use `role="status"` (info/success) or `role="alert"` (error)
- Modal focus trap

### Reduced motion
Per §7. Respect `prefers-reduced-motion: reduce`.

### Screen reader
- All icons that convey meaning have `aria-label`
- Pure decorative icons have `aria-hidden="true"`
- Form labels properly associated

### Form validation
- `aria-invalid` on errored fields
- `aria-describedby` linking errors to inputs

---

## 16. TECH STACK & DEPENDENCIES

### Core
| Package | Version | Purpose |
|---|---|---|
| `next` | 16.2.4 | Framework, App Router. Pin exact version (no caret). Note: Next 16 renames `middleware.ts` → `proxy.ts`; Edge runtime not supported in `proxy`. |
| `react` | 19.2+ | View Transitions, `useEffectEvent`, `<Activity/>` |
| `typescript` | 5.x | |
| `tailwindcss` | 4.x | Styling |
| `@tailwindcss/postcss` | matched | |

### UI
| Package | Purpose |
|---|---|
| `@radix-ui/react-*` (via shadcn) | Headless components |
| `lucide-react` | Icons |
| `sonner` | Toasts |
| `class-variance-authority` | Variant API |
| `clsx`, `tailwind-merge` | Class composition |
| `next-themes` | Theme toggle |

### Solana / Crypto / Umbra
| Package | Purpose |
|---|---|
| `@umbra-privacy/sdk` | 4.0.0 — privacy primitives |
| `@solana/wallet-adapter-react` | Wallet connection |
| `@solana/wallet-adapter-react-ui` | Connect button styles |
| `@solana/wallet-adapter-wallets` | Phantom, Backpack, Solflare |
| `@solana/kit` | 6.x — Solana primitives |
| `snarkjs` | ZK proof generation in browser |
| `circomlib` | Poseidon, comparators |
| `bs58` | base58 encoding |
| `@noble/ed25519` | For agent signer |

### Forms / Data
| Package | Purpose |
|---|---|
| `react-hook-form` | Forms |
| `zod` | Schema validation |
| `date-fns` | Date manipulation |

### Charts (minimal use)
| Package | Purpose |
|---|---|
| `recharts` | Sparklines on agent page (TVL trend) |

### Fonts
Next/font/google: Inter, Fraunces, JetBrains Mono.

---

## 17. FILE ORGANIZATION

```
app/
├── layout.tsx                    # Root layout, fonts, theme provider
├── globals.css                   # Tailwind, CSS variables (color tokens)
├── page.tsx                      # Landing /
├── employer/
│   └── page.tsx                  # /employer
├── employee/
│   └── page.tsx                  # /employee
├── agent/
│   └── page.tsx                  # /agent
├── credential/
│   └── [address]/
│       └── page.tsx              # /credential/[address]
├── verify/
│   └── page.tsx                  # /verify
└── api/
    ├── proof/generate/route.ts
    ├── credential/mint/route.ts
    ├── credential/[address]/route.ts
    ├── umbra/status/route.ts
    ├── umbra/scan/route.ts
    ├── x402/charge/route.ts
    ├── agent/spawn/route.ts
    └── agent/feed/[pubkey]/route.ts

components/
├── ui/                           # shadcn primitives
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── tooltip.tsx
│   ├── badge.tsx
│   ├── separator.tsx
│   └── ...
├── address-display.tsx
├── amount-display.tsx
├── tx-hash-display.tsx
├── seal-card.tsx
├── status-banner.tsx
├── stepper.tsx
├── progress-with-status.tsx
├── live-feed-item.tsx
├── wallet-connect-button.tsx
├── theme-toggle.tsx
├── header.tsx
└── footer.tsx

lib/
├── umbra.ts                      # SDK initialization
├── wallet.ts                     # Wallet adapter setup
├── proof.ts                      # snarkjs wrapper
├── witness.ts                    # Witness builder
├── agent-signer.ts               # AgentSigner class
├── x402-umbra-adapter.ts         # x402 client + server
├── solana.ts                     # RPC, program client
├── format.ts                     # Address truncation, amount formatting, dates
├── constants.ts                  # Program ID, USDC mint, indexer URL
└── types.ts                      # Shared TypeScript types

hooks/
├── use-umbra.ts                  # Umbra client provider hook
├── use-credential.ts             # Read credential by address
├── use-scan.ts                   # Scan UTXOs
├── use-proof-generation.ts       # Multi-stage proof state machine
└── use-agent-feed.ts             # SSE agent feed

workers/
└── proof.worker.ts               # snarkjs in Web Worker

public/
├── logo.svg
├── logo-mark.svg
├── og-image.png                  # Social share
├── circuits/
│   ├── income_proof.wasm         # Compiled circuit
│   ├── income_proof_final.zkey   # Proving key
│   └── verification_key.json     # On-chain vk
└── fonts/                        # If self-hosting any
```

---

## 18. ASSET REQUIREMENTS

| Asset | Format | Size | Notes |
|---|---|---|---|
| Logo full (TESSERA wordmark) | SVG | scalable | Uses `currentColor` |
| Logo mark (token icon) | SVG | scalable | Octagon with cipher rune |
| Favicon | ICO + PNG | 32, 192, 512 | Logo mark only |
| Open Graph image | PNG | 1200x630 | Hero text + branded background |
| Hero ornament (subtle pattern) | SVG | scalable | Geometric, opacity 8% |
| Step icons (3 on landing) | Lucide | 32px | ShieldCheck, KeyRound, Award |
| Empty state icons | Lucide | 48px | Per §12.1 |

No illustrations beyond ornament + lucide. Photography would clash with the cryptographic-credential aesthetic.

---

## 19. DATA VISUALIZATION

Minimal. TESSERA isn't a dashboard product.

**Sparkline (agent page):** TVL trend line (last 7 days). Recharts `LineChart`. No axes, no tooltip — purely decorative. Color: cipher with 0.4 opacity stroke, gradient fill below.

**Progress bars:** §9.8.

**Stepper:** §9.15.

If a data viz feels needed beyond these, it's probably scope creep.

---

## 20. IMPLEMENTATION ORDER

This sequence allows progressive delivery. Each step ships something usable.

1. **Project skeleton.** Next 15 + Tailwind 4 + shadcn init. Fonts loaded. Globals.css with CSS variables. Layout component.
2. **Color tokens + theme toggle.** Both themes working. Persists via next-themes.
3. **Header + Footer.** Wallet connect button (adapter setup).
4. **Component library: primitives.** Button, Input, Card, Pill, Toast, Modal. All variants.
5. **Component library: composites.** AddressDisplay, AmountDisplay, TxHashDisplay, SealCard, Stepper, ProgressWithStatus.
6. **Landing page.** Hero, how-it-works, dual-mode block, CTAs, footer.
7. **Onboarding modal.** Three-step flow. Wallet connect + register + done.
8. **Employer page.** Form + recent payments + all states.
9. **Employee page.** Three-step flow with Web Worker for proof generation.
10. **Credential viewer.** Public route, SealCard rendering.
11. **Verifier demo page.** Form + result + "what just happened" block.
12. **Agent page.** Control panel + SSE live feed + actions.
13. **Mobile polish.** Every page reviewed on 375px viewport.
14. **Accessibility audit.** Keyboard nav, screen reader pass, contrast verification.
15. **Final pass.** Loading states, empty states, error states all wired.

---

## REFERENCE SUMMARY

For quick lookup during build:

- **Default font:** Inter
- **Display font:** Fraunces (hero only)
- **Mono font:** JetBrains Mono (all hashes/addresses/amounts)
- **Primary background:** `#0B0D10` (dark) / `#F5EFE0` (light parchment)
- **Body text:** `#F5EFE0` parchment cream
- **Accent (verified):** `#A23B2C` wax-seal red — used sparingly
- **Accent (cryptographic):** `#4ECDC4` cipher cyan
- **Default radius:** 8px (cards 12px)
- **Container max:** 1200px
- **Header height:** 64px sticky
- **Default duration:** 240ms ease-standard
- **Theme:** Dark default, light optional
- **Icons:** Lucide React, stroke 1.5
- **Toast lib:** sonner, bottom-right

---

## 21. OPEN DECISIONS

These five items are intentionally underspecified above. Decide them once, document the choice in code, and apply consistently. They are the most common sources of inconsistency in production frontends and are easier to lock now than after five components ship with diverging behavior.

### 21.1 Form validation timing

**Decision needed:** when does validation fire — on `change`, on `blur`, on `submit`, or hybrid?

**Recommendation:** hybrid via react-hook-form `mode: 'onTouched'`. First validation on blur; subsequent updates revalidate on change. Submit always validates everything. Rationale: avoids the "yelling at the user mid-keystroke" anti-pattern while still giving fast feedback after a field is left.

**Where this matters:** `/employer` employer-onboarding form, `/employer/post` job creation form, `/employer/verify` ZK verification form.

### 21.2 Wallet adapter scope

**Decision needed:** which wallets does the connect modal show?

**Options:**
- **Phantom only** — simplest, ~70% of Solana users. Best for hackathon demo.
- **Phantom + Backpack + Solflare** — matches §16 dependency table; broader coverage, slightly larger bundle.
- **WalletConnect-style universal** — overkill for v1.

**Recommendation:** ship Phantom + Backpack + Solflare to match the dependency list already in §16. Order them Phantom → Backpack → Solflare in the modal. Persist the last-used wallet in `localStorage` and surface it as the default on return.

### 21.3 Toast collision behavior

**Decision needed:** when 3+ toasts fire in quick succession (e.g., a failed batch retry), what happens?

**Recommendation:** sonner's default `expand` behavior with `visibleToasts: 3`. Older toasts collapse into a "+N more" stacked card. Errors persist until dismissed; success toasts auto-dismiss after 4s. Never silently drop an error toast — they must always reach the user.

**Z-order:** toasts above modals (`z-[100]`), below the wallet adapter modal (`z-[110]`).

### 21.4 Solana vs. Umbra address visual distinction

**Decision needed:** Solana addresses (base58, 44 chars) and Umbra stealth addresses (also base58, similar length) are conceptually different but visually identical. Users must not confuse them.

**Recommendation:**
- **Solana addresses:** mono font, neutral foreground (`text-fg-default`), prefixed with a small Solana glyph icon when displayed in lists.
- **Umbra stealth addresses:** mono font, cipher cyan tint (`text-[#4ECDC4]`), prefixed with a lock icon. In tooltips, always label them `Stealth address (Umbra)`.
- **Truncation:** use the same `Abc123…Xyz789` pattern for both (4 leading + 4 trailing) but the color/icon differentiates at-a-glance.
- **Copy button:** identical UX, but the toast confirmation says either "Wallet address copied" or "Stealth address copied" so the user always knows which they have.

### 21.5 Theme behavior on first load

**Decision needed:** what theme does a brand-new visitor see — system preference, dark default, or last-chosen?

**Recommendation:** `next-themes` with `defaultTheme="dark"`, `enableSystem={true}`. New visitors get dark (matches the brand's seal/parchment aesthetic). System-preference and manual choices are respected and persisted in `localStorage` under `tessera-theme`. The toggle in the header cycles `system → dark → light → system`.

**Avoid the FOUC:** add the `next-themes` script to `<head>` before hydration so the parchment never flashes white during page load.

---

**END — Frontend PRD v2**

Companion: `TESSERA_PRD_v2_Engineering.md` covers all backend, circuits, contracts, agent, x402, build plan, and submission strategy.