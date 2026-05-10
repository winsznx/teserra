# TESSERA — Private income proofs for humans and AI agents

Prove your income exceeds a threshold over a date range, without revealing any
amounts, employer identities, or transaction history. Same primitive works for
AI agents earning shielded micropayments.

> Cryptographic creditworthiness on Solana. Built on Umbra.

---

## What it does

- **Employers pay salaries privately** through Umbra's confidential transfers.
  Amounts and recipients are encrypted on-chain.
- **Employees prove a threshold** with a Groth16 ZK proof over their own
  shielded receipts. The credential is a compressed NFT minted to their
  identity.
- **Verifiers integrate with one CPI call.** No income data exposed; the
  protocol returns `{valid, threshold, expires_at, reason}`.

---

## Demo

Live deployment: <https://teserra.vercel.app> (frontend) +
<https://tessera-agent-runtime-production.up.railway.app> (agent runtime).

Direct entry points (against Solana devnet):

- [`/employer`](https://teserra.vercel.app/employer) — shield a payment
- [`/employee`](https://teserra.vercel.app/employee) — generate a credential
- [`/credential/BPSRtkvuqKpuaK1mSY3LgqtcZqupzz8FZdQ1GrKvDaFz`](https://teserra.vercel.app/credential/BPSRtkvuqKpuaK1mSY3LgqtcZqupzz8FZdQ1GrKvDaFz)
  — view the canonical demo credential
- [`/verify`](https://teserra.vercel.app/verify) — simulated lender integration
- [`/agent`](https://teserra.vercel.app/agent) — autonomous agent + private x402 rail

Demo video: _link added at submission time._

![credential](public/readme-credential.png)

---

## Built for Solana Frontier — SWARM track

- **Innovation.** Novel ZK income-proof primitive composed with the first
  x402-over-Umbra private payment rail. Technical detail in
  [`TESSERA_PRD_v2_Engineering.md`](./TESSERA_PRD_v2_Engineering.md) §11
  (circuit) and §15 (x402).
- **Agentic sophistication.** A live agent runtime in
  [`lib/agent-runtime.ts`](./lib/agent-runtime.ts) earns shielded income,
  generates credentials, and pays for downstream x402-protected services —
  all via the same protocol primitive humans use. SSE-streamed to the
  `/agent` UI.
- **Traction.** Real Anchor program deployed on devnet
  ([`9jCxFKjcwt7uYZtPwfEh2gPt7BdKxW6qEwuwbFStWCKd`](https://explorer.solana.com/address/9jCxFKjcwt7uYZtPwfEh2gPt7BdKxW6qEwuwbFStWCKd?cluster=devnet)),
  10/10 on-chain integration tests passing, real credential minted at
  [`BPSRtkvuqKpuaK1mSY3LgqtcZqupzz8FZdQ1GrKvDaFz`](https://explorer.solana.com/address/BPSRtkvuqKpuaK1mSY3LgqtcZqupzz8FZdQ1GrKvDaFz?cluster=devnet),
  real Umbra deposit landed by the agent x402 rail at
  [`YKN5mf83…sdgp`](https://explorer.solana.com/tx/YKN5mf83p7JRViVTsC74hTXM3yUkA8e2vGc2Yu9Wm9pWL96tFtvPJ7wmu88qRPbXBJMHp4AWYv7rmTL7Fd3sdgp?cluster=devnet).

---

## Architecture

| Layer | Where |
|---|---|
| Anchor program | [`programs/tessera/`](./programs/tessera/) — staged-public-inputs Groth16 verifier + Bubblegum CPI for cNFT credentials |
| ZK circuit | [`circuits/income_proof.circom`](./circuits/income_proof.circom) — 386,672 R1CS constraints, depth-20 Merkle inclusion + nullifier binding + timestamp range. Phase-2 ceremony recorded in [`circuits/CEREMONY.md`](./circuits/CEREMONY.md). |
| Umbra integration | [`lib/umbra-deposit.ts`](./lib/umbra-deposit.ts) — `@umbra-privacy/sdk@4.0.0`, `optionalData` round-trip per Cal's verification pattern |
| x402 rail | [`lib/x402-adapter.ts`](./lib/x402-adapter.ts) — server-only challenge issuance + RPC-only verification (no indexer hot path) |
| Agent runtime | [`lib/agent-runtime.ts`](./lib/agent-runtime.ts) — server-only event ring buffer + SSE feed + serial command queue |
| Frontend | Next.js 16.2.4 (Turbopack) + Tailwind 4 + framer-motion + Wallet Standard adapters |

Devnet defaults are baked into [`lib/constants.ts`](./lib/constants.ts):
RPC `https://api.devnet.solana.com`, Umbra dUSDC mint
`4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7` (faucet at
`https://faucet.umbraprivacy.com`).

---

## Run locally

Prereqs: Node ≥ 20.9, pnpm 10+, a Solana wallet that supports Wallet
Standard (Solflare recommended — Phantom rewrites transactions
post-sign in a way Umbra rejects; the page surfaces a warning banner).

```bash
git clone <this-repo> tessera
cd tessera
pnpm install
cp .env.example .env.local       # devnet defaults already filled
pnpm dev
```

Open <http://localhost:3000>, connect Solflare on devnet. Onboarding
flow registers your wallet's Umbra identity (one signature, idempotent).

For pre-funded testing, the canonical Day 0 keypair lives at
[`scripts/day0/.keypair.json`](./scripts/day0/.keypair.json) — already
registered on devnet, holds dUSDC, and is the identity behind every
fixture in this repo. Faucet more dUSDC at
<https://faucet.umbraprivacy.com>.

---

## Deployment (Vercel + Railway split)

Vercel hosts the static frontend; Railway hosts the agent runtime + x402
endpoint. Vercel's serverless edge can't keep an in-memory agent registry
across requests and times out long SSE streams, so the runtime needs a
persistent Node process — Railway is that process.

- Frontend (Vercel): <https://teserra.vercel.app>
- Agent runtime (Railway): <https://tessera-agent-runtime-production.up.railway.app>

`next.config.ts` rewrites `/api/agent/*` and `/api/x402/*` to the Railway
origin when `NEXT_PUBLIC_AGENT_API_BASE` is set. The
`<AgentLiveFeed>` `EventSource` connects to Railway directly (Vercel can't
proxy SSE reliably). The Dockerfile builds Next.js in `output: "standalone"`
mode.

### Railway one-time setup

```bash
# 1. From the repo root:
railway init                             # link to a new Railway project
railway up                               # build via Dockerfile, deploy

# 2. Set env vars (do this in the Railway dashboard or via CLI):
railway variables set NEXT_PUBLIC_SOLANA_RPC="https://api.devnet.solana.com"
railway variables set NEXT_PUBLIC_SOLANA_WSS="wss://api.devnet.solana.com"
railway variables set NEXT_PUBLIC_INDEXER_URL="https://utxo-indexer.api-devnet.umbraprivacy.com"
railway variables set NEXT_PUBLIC_USDC_MINT="4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7"
railway variables set NEXT_PUBLIC_PROGRAM_ID="9jCxFKjcwt7uYZtPwfEh2gPt7BdKxW6qEwuwbFStWCKd"
railway variables set ALLOWED_ORIGIN="*"   # tighten to the Vercel URL after Vercel deploys

# 3. Day 0 keypair as base64 secret (never commit, never push to Vercel):
KEYPAIR_B64=$(node -e "console.log(Buffer.from(JSON.parse(require('fs').readFileSync('scripts/day0/.keypair.json'))).toString('base64'))")
railway variables set AGENT_DAY0_KEYPAIR_BASE64="$KEYPAIR_B64"
```

### Vercel one-time setup

```bash
vercel link                              # link to a Vercel project
vercel env add NEXT_PUBLIC_SOLANA_RPC production
vercel env add NEXT_PUBLIC_SOLANA_WSS production
vercel env add NEXT_PUBLIC_INDEXER_URL production
vercel env add NEXT_PUBLIC_USDC_MINT production
vercel env add NEXT_PUBLIC_PROGRAM_ID production
vercel env add NEXT_PUBLIC_AGENT_API_BASE production   # paste the Railway URL
vercel deploy --prod
```

After both deploys land, tighten the Railway `ALLOWED_ORIGIN` env var to
the Vercel URL only (replace the `*`).

---

## Tests

```bash
pnpm test                                        # 162 + 1 skipped (integration)
pnpm test:lib                                    # alias for the same vitest run
cd programs/tessera && anchor test --skip-build  # 10/10 on-chain integration
```

Unit + component coverage is in [`tests/`](./tests/). Live-devnet checks
are gated behind `RUN_INTEGRATION=1`; an end-to-end agent x402 round-trip
is in [`tests/lib/agent-runtime-x402.test.ts`](./tests/lib/agent-runtime-x402.test.ts).
The Day 0 validation gate is reproduced by
[`scripts/day0/`](./scripts/day0/) (start with `_lib.ts` and follow the
numbered scripts).

---

## Project conventions

- [`AGENTS.md`](./AGENTS.md) — voice, contributor rules, end-of-session
  Progress log.
- [`gaps.md`](./gaps.md) — every PRD ↔ reality observation, ordered by
  ID. Don't edit the PRDs; log here instead.
- [`scripts/day0/REPORT.md`](./scripts/day0/REPORT.md) — what shipped each
  session and why. Ground truth for the build's history.
- [`TESSERA_PRD_v2_Frontend.md`](./TESSERA_PRD_v2_Frontend.md),
  [`TESSERA_PRD_v2_Engineering.md`](./TESSERA_PRD_v2_Engineering.md) — the
  spec. Stable on purpose.

---

## Acknowledgments

- **Umbra Privacy team** — especially `@typi_cal_` for the x402
  verification pattern (`optional_data` + computation-account callback,
  no indexer on the hot path) and SDK v4 guidance.
- **Lightprotocol's [groth16-solana](https://github.com/Lightprotocol/groth16-solana)**
  — the verifier crate that made on-chain ZK feasible inside Solana's
  compute-unit budget.
- **Metaplex Bubblegum** — compressed-NFT credential storage.
- Built solo for Colosseum's Solana Frontier — SWARM track, 2026.
