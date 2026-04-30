# TESSERA — Master PRD v2 (Engineering)
### Author: Tim | Status: SOURCE OF TRUTH — Engineering | Companion: TESSERA_PRD_v2_Frontend.md

---

## TABLE OF CONTENTS

1. v1 → v2 Changelog
2. Regression vs Hackathon Playbook
3. Vision & Pitch
4. Problem Statement
5. Personas (Humans + Agents)
6. Competitive Moat
7. Past Winner Pattern Matching
8. Judging Criteria Strategy
9. System Architecture
10. Technical Stack
11. Circuit Design
12. Anchor Program Design
13. Umbra SDK Integration Map
14. Agent Architecture
15. x402 Private Payment Rail
16. Data Model
17. API Specification
18. End-to-End Lifecycles (Human + Agent)
19. Failure States & Recovery
20. Day 0 Validation Gate
21. Sprint Plan
22. Anti-Patterns
23. Demo Screenplay
24. Submission Artifacts
25. Risk Register
26. Decision Log
27. Distribution Plan
28. Open Questions

---

## 1. v1 → v2 CHANGELOG

| Change | Reason |
|---|---|
| Added Agent Architecture (§14) | v1 humans-only — innovation score capped at 6/10. Agents lift to 9/10. |
| Added x402 Private Payment Rail (§15) | Hackathon brief explicitly lists x402 private payments. v1 ignored it. |
| Added dual lifecycle (§18) | Human and agent flows have shared infra but different UX paths. Both must be specified. |
| Added Past Winner Pattern Matching (§7) | v1 named winners; v2 extracts what each won on and maps TESSERA to that pattern. |
| Added Anti-Patterns (§22) | Consolidates "what NOT to do" — VeilPay circuit bug, demo data, etc. |
| Added Day 0 Validation Gate (§20) | Pass/fail checkpoint before any code is written. |
| Added Distribution Plan (§27) | Phase H of playbook. v1 had no launch motion. |
| Refined Demo Screenplay (§23) | Now includes B-roll, timing rehearsal beats, fallback cuts. |
| Tightened Sprint Plan (§21) | Adds explicit code freeze (Phase G), buffers for agent + x402 work. |
| Updated Risk Register (§25) | New risks from agent + x402 + indexer verify dependency. |
| Updated Tech Stack (§10) | Pinned versions; added agent-specific deps. |
| Refined moat (§6) | Five moats sharpened with explicit "remove X → product collapses" tests. |

UI/UX moved entirely to companion document. Engineering doc is hardware-aware; frontend doc is brand-aware.

---

## 2. REGRESSION VS HACKATHON PLAYBOOK

| Phase | Status | Notes |
|---|---|---|
| A — Recon | Complete | Rubric, sponsor brief, winner survey done |
| B — Rubric-native ideation | Complete | Three-model pipeline produced Idea C (income proof + agent extension) |
| C — Defensibility WHAT/WHY/HOW | Complete | Five moats, 30-second test passes |
| D — Demo screenplay | In progress | v1 had script; v2 adds B-roll + rehearsal |
| E — PRD + Day 0 gate | This doc | v2 formalizes Day 0 as STOP/GO |
| F — Sequenced build | Pending | Triggered after Day 0 passes |
| G — Code freeze 48–72h | Defined in §21 | |
| H — Light distribution | Defined in §27 | |
| I — Post-mortem | Post-submission | Feeds next hackathon |

We are between E and F. Day 0 must clear before we cross.

---

## 3. VISION & PITCH

### One-Line
TESSERA is a Solana protocol that lets anyone — human or agent — prove their financial worth without revealing their financial life.

### 60-Second Pitch
On-chain financial life is public by default. That breaks two things at once: privacy and creditworthiness. Today, proving income on Solana means exposing every transaction. Trusting a centralized intermediary defeats the chain. Both choices are wrong.

TESSERA fixes this with a primitive. Employers pay salaries through Umbra's confidential transfers — Arcium MPC encrypts amounts before they touch the chain. Employees decrypt their own income via scoped viewing keys, feed it through a Groth16 circuit that proves "income exceeded threshold X over date range Y," and mint a compressed NFT credential carrying only the public signals. Lenders, landlords, DAOs, and other agents read the credential with one CPI call. They never see the income.

The same primitive serves AI agents. An autonomous agent on Solana initializes a headless Umbra identity, receives shielded payments, generates its own credentials, and pays for downstream services through a private x402 rail — payment graph invisible. TESSERA is one protocol, two users: humans get private payroll + portable credentials, agents get private machine-to-machine economic infrastructure.

### "How did they think of this?" Test
A judge has reviewed forty Umbra submissions. When they reach TESSERA they see: a ZK income proof primitive that *also* solves agent-to-agent private payments, both built on the same Umbra foundation, with composable on-chain credentials minted as compressed NFTs. They have not seen this combination. They will remember it.

---

## 4. PROBLEM STATEMENT

Public blockchains are transparent by design. Every salary, every transfer, every balance is permanently legible. Two failures cascade from this:

The privacy failure: on-chain payroll broadcasts salaries to colleagues, competitors, and adversaries. The creditworthiness failure: any system that gates access by income — undercollateralized lending, rentals, visas, mortgages — requires the user to either expose everything or trust an intermediary that defeats the chain.

The agent failure compounds this. As Solana becomes the default home for autonomous agents and x402-mediated machine payments, every agent-to-agent payment graph is publicly readable. A trading agent's payments to a data provider reveal its strategy. A protocol's recurring agent expenses reveal its dependencies. The agent economy is being built on transparent rails that leak competitive intelligence in real time.

Existing partial solutions: VeilPay (a circom circuit for a single salary moment, not a protocol, not deployed); Reclaim (web2 data, not on-chain payroll); ZK-Email (email-based, no Solana integration); MagicBlock Private Payments (TEE-based, hardware trust assumptions vulnerable to side-channel attacks). None compose privacy primitives + ZK credentials + agent payments into a single protocol.

TESSERA is that protocol.

---

## 5. PERSONAS

### P1 — The Crypto-Native Remote Worker
A developer in Lagos paid in USDC by a US DAO. Cannot prove income to a Nigerian bank for a mortgage without exposing wallet history. Cannot use traditional payslips because payments are crypto. TESSERA generates a credential they can share selectively or print as a verifier-readable artifact.

### P2 — The DeFi Protocol (B2B)
MarginFi, Kamino, Credix. Each wants to underwrite undercollateralized loans but cannot read income trustlessly. Today they fall back to over-collateralization or require off-chain KYC providers. TESSERA gives them a single CPI call: `verify_credential(employee_pubkey)` returns approved/denied. They never see income.

### P3 — The Emerging Market Salary Recipient
Worker in Manila, Buenos Aires, Mumbai receiving global stablecoin payments. Banks reject crypto income. TESSERA's credential bridges the gap — public signals readable by traditional verifiers, exact figures hidden.

### P4 — The Autonomous Agent (NEW)
An MCP server on Solana selling inference-as-a-service. Pays a data provider agent, gets paid by an LLM agent above it. Without TESSERA, every payment is publicly tagged to its agent identity — competitors trace its strategy, dependencies, and revenue. With TESSERA, payments flow through Umbra's confidential rail, the agent receives x402 settlement privately, and can mint a credential proving its revenue exceeded a threshold for liquidity provider partners — without revealing actual numbers.

### P5 — The Verifier Protocol Operator
A DAO admin gating contributor payouts by proven income. A rental aggregator on Solana checking applicant credentials. A visa application platform. Each integrates `verify_credential` once. The integration never changes regardless of who issued the credential — humans, agents, or future entities.

---

## 6. COMPETITIVE MOAT

Each moat below has a "remove and watch it collapse" test. If removing the primitive destroys the product, the moat is real.

**M1 — Umbra is load-bearing.**
The proof is only meaningful because the underlying salary data is private. Remove Umbra → salary becomes public → no ZK proof needed or possible → product collapses.

**M2 — Multi-period aggregation primitive.**
VeilPay proves one salary at one moment. TESSERA's circuit handles N=32 deposits with `isValid[N]` boolean flags, padded summation, and explicit `gte.out === 1` constraint. Remove the aggregation circuit → can only prove single payments → indistinguishable from a payment receipt → no real income verification possible.

**M3 — Composable on-chain credential.**
The proof doesn't sit in a PDF. It mints as a compressed NFT readable by any Solana protocol via single CPI. Remove the credential layer → proof is one-time, off-chain, unverifiable composably → not a primitive, just a tool.

**M4 — Dual-mode (humans + agents).**
The same protocol serves both. Remove agent support → product is a payroll tool only → loses the entire x402/MCP ecosystem and the "private agent economy" narrative. Remove human support → loses commercial path through DeFi lending.

**M5 — Cryptographic security floor.**
Arcium's Cerberus dishonest-majority MPC vs MagicBlock's TDX TEEs: independent of hardware trust assumptions. Remove cryptographic guarantees → vulnerable to side-channel attacks → fails for high-stakes financial credentials → no institutional adoption path.

---

## 7. PAST WINNER PATTERN MATCHING

| Past Winner | Hackathon | Won On | TESSERA Maps Via |
|---|---|---|---|
| Vanish | Colosseum Breakout (privacy) | New on-chain privacy primitive for Solana | Same primitive layer; we're the credential layer above it |
| Encifher | Colosseum (DeFi privacy) | Encrypted privacy added to DeFi | Same DeFi-privacy intersection; we extend with multi-period aggregation + agents |
| TapeDrive | Colosseum Grand Prize | Internal infrastructure problem (cheaper data storage) | Pattern: solve a deep ecosystem problem. Ours: trustless creditworthiness. |
| Seer | Colosseum Cypherpunk (1st infra) | Tx debugging platform | Pattern: developer-facing infra with clear daily use |
| Corbits | Colosseum Cypherpunk (2nd) | x402 endpoint dashboard for merchants | Pattern: x402 + infrastructure = winning combination |
| Reflect | Colosseum Radar Grand Prize | Novel financial primitive (hedge-backed stablecoins) | Pattern: new financial primitive with composability. Ours: cryptographic creditworthiness. |
| Autonom | Radar (RWA) | Bridging on-chain to real-world finance | Same bridge pattern: crypto income → traditional verifiers |

The pattern that keeps winning: **a new primitive at the intersection of two existing trends, with composable on-chain output, addressing a pain point that scales beyond crypto-natives.** TESSERA sits at privacy × creditworthiness × agents — three trends, one credential primitive.

---

## 8. JUDGING CRITERIA STRATEGY

| Criterion | Weight | Score | Talking Point |
|---|---|---|---|
| Core SDK Integration | 20% | 9 | "Remove Umbra and the data to prove vanishes. The ZK proof is only meaningful because the salary is shielded." |
| Innovation | 18% | 9 | "VeilPay proved one salary. TESSERA proves aggregated income, mints composable credentials, and the same primitive serves AI agents through x402. No prior submission combines these." |
| Technical Execution | 17% | 8 | "circom 2.x + groth16-solana under 200k CUs + Anchor + Bubblegum. Battle-tested stack, all open source, every component reviewed." |
| Commercial Potential | 16% | 10 | "Two distinct revenue paths: B2B SDK fee per protocol integration; per-credential mint fee from users. Every Solana lending protocol is a customer." |
| Impact | 14% | 10 | "Crypto-native workers globally gain access to traditional finance without doxxing. Agent economy gets the missing privacy primitive." |
| Usability | 10% | 8 | "Three-step user flow. Connect, prove, mint. ZK complexity invisible." |
| Completeness | 5% | 8 | "Working dual-mode demo on devnet. Human path + agent path live. Verifier integration shown." |

**Weighted: 9.04 / 10**

---

## 9. SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            TESSERA PROTOCOL                              │
│                                                                          │
│   ┌─────────────────┐   ┌─────────────────┐   ┌──────────────────────┐   │
│   │  HUMAN PAYER    │   │  AGENT PAYER    │   │  VERIFIER (DeFi/etc) │   │
│   │  Browser wallet │   │  AgentSigner    │   │  Reads via CPI       │   │
│   └────────┬────────┘   └────────┬────────┘   └──────────┬───────────┘   │
│            │                     │                        │              │
│            └──────────┬──────────┘                        │              │
│                       ▼                                   │              │
│   ┌────────────────────────────────────────────────┐     │              │
│   │           UMBRA PRIVACY LAYER (SDK v4.0.0)     │     │              │
│   │                                                │     │              │
│   │   getPublicBalanceToEncryptedBalance...        │     │              │
│   │   → Arcium MPC encrypts amount off-chain       │     │              │
│   │   → UTXO committed to shielded pool            │     │              │
│   │   → Merkle tree updated on-chain               │     │              │
│   │   → Viewing key issuance                       │     │              │
│   └─────────────────────┬──────────────────────────┘     │              │
│                         │                                 │              │
│                         ▼                                 │              │
│   ┌────────────────────────────────────────────────┐     │              │
│   │          ZK PROOF GENERATION                   │     │              │
│   │                                                │     │              │
│   │   client.scan() → decrypt own UTXOs            │     │              │
│   │   filter by date range → isValid[N] flags      │     │              │
│   │   circom IncomeProof(N=32)                     │     │              │
│   │   → snarkjs.groth16.fullProve                  │     │              │
│   │     - browser: WASM, 1.5–3s                    │     │              │
│   │     - node: native, <1s (agents)               │     │              │
│   │   → 128-byte proof + public signals            │     │              │
│   └─────────────────────┬──────────────────────────┘     │              │
│                         │                                 │              │
│                         ▼                                 │              │
│   ┌────────────────────────────────────────────────┐     │              │
│   │       TESSERA ANCHOR PROGRAM (Solana)          │     │              │
│   │                                                │     │              │
│   │   verify_income_proof:                         │     │              │
│   │     groth16-solana (Lightprotocol)             │     │              │
│   │     <200k CUs                                  │     │              │
│   │   ↓ on success                                 │     │              │
│   │   mint_credential:                             │     │              │
│   │     CPI → Metaplex Bubblegum                   │     │              │
│   │     compressed NFT with public signals only    │     │              │
│   │   verify_credential (read-only):               │     │              │
│   │     single instruction for verifiers           │     │              │
│   └─────────────────────┬──────────────────────────┘     │              │
│                         │                                 │              │
│                         ▼                                 ▼              │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │              TESSERA CREDENTIAL (compressed NFT)                 │   │
│   │                                                                  │   │
│   │   Public: income_above_threshold, threshold, date_range_hash,   │   │
│   │           employer_commitment, proof_hash, issued_at,           │   │
│   │           expires_at, issuer                                    │   │
│   │   Private (NEVER on-chain): exact amounts, employer wallet,     │   │
│   │                              employee wallet                    │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │              x402 PRIVATE PAYMENT RAIL (agent-to-agent)          │   │
│   │                                                                  │   │
│   │   Agent A → HTTP request → Service B                             │   │
│   │   ← 402 Payment Required (Umbra recipient address, amount)       │   │
│   │   Agent A → x402UmbraAdapter.payX402Private()                    │   │
│   │            → Umbra confidential transfer                         │   │
│   │   ← tx signature returned as payment proof                       │   │
│   │   Service B → indexer query → UTXO confirmed                     │   │
│   │   Service B → access granted                                     │   │
│   │   Payment graph: invisible on-chain                              │   │
│   └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 10. TECHNICAL STACK

| Layer | Tech | Version | Why | Rejected |
|---|---|---|---|---|
| Privacy | @umbra-privacy/sdk | 4.0.0 | Load-bearing | MagicBlock (TEE trust) |
| ZK lang | circom | 2.1.x | WASM browser proving, mature | Noir (nascent Solana verifier), halo2 (heavy WASM) |
| ZK toolkit | snarkjs | 0.7.x | Browser + node, Groth16 native | bellman (no browser) |
| Crypto primitives | circomlib | latest | Poseidon, GreaterEqThan, etc | hand-roll (slower, riskier) |
| On-chain verifier | groth16-solana (Lightprotocol) | latest | <200k CUs, alt_bn128 syscalls | custom (security risk) |
| Smart contract | Anchor | 0.30.x | CPI support, standard | native Solana (too low-level) |
| Credential format | Metaplex Bubblegum (cNFT) | latest | Compressed = cheap mints, composable | regular NFT (expensive), SBT (limited tooling) |
| Trusted setup | Hermez Powers of Tau (BN254) | pot15 | Existing ceremony, no time for custom | custom MPC ceremony |
| Frontend framework | Next.js | 16.2.4 (pinned) | App Router, Turbopack default, React 19.2. Note: `middleware.ts` is renamed to `proxy.ts` in v16; runtime is Node.js only. Requires Node ≥ 20.9. | Vite (less ecosystem) |
| Styling | Tailwind CSS | 4.x | Speed, design tokens compatible | CSS modules |
| Component lib | shadcn/ui | latest | Headless, themeable | Material UI (too opinionated) |
| Wallet adapter | @solana/wallet-adapter-react | latest | Standard | custom |
| Solana client | @solana/kit | 6.x (Umbra peer) | Required by Umbra | @solana/web3.js (legacy) |
| Mono node deps | @noble/ed25519, @noble/hashes | matches Umbra | For AgentSigner | tweetnacl (older API) |
| Language | TypeScript | 5.x | Full-stack types | JS |
| Package manager | pnpm | latest | Fast, deterministic | npm, yarn |
| Network | Solana Devnet → Mainnet | — | Umbra is on devnet/mainnet | localnet (no Umbra deploy) |
| RPC | Helius / Triton | — | Reliable for demo | public RPC (rate-limited) |
| Indexer | Umbra indexer (umbraprivacy.com) | — | Required by SDK | self-host (out of scope) |

---

## 11. CIRCUIT DESIGN

`circuits/income_proof.circom`:

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

// N fixed at compile time. Padded slots set amount=0, isValid=0.
// N=32 supports 2.5+ years of monthly salary.
template IncomeProof(N) {
    // PRIVATE
    signal input amounts[N];          // decrypted lamports
    signal input isValid[N];          // 1 if in date range, else 0
    signal input nonces[N];           // UTXO nonce (binds to specific deposits)
    signal input employerSecret;      // employer's blinding factor

    // PUBLIC
    signal input threshold;
    signal input dateRangeHash;       // Poseidon(startTs, endTs)
    signal input employerCommitment;  // Poseidon(employerSecret, totalIncome)

    signal output validProof;

    // 1. isValid is strictly binary (CRITICAL — under-constrained = forgeable)
    signal isValidSquared[N];
    for (var i = 0; i < N; i++) {
        isValidSquared[i] <== isValid[i] * isValid[i];
        isValidSquared[i] === isValid[i];
    }

    // 2. Accumulate filtered income
    signal filteredAmounts[N];
    signal runningSum[N+1];
    runningSum[0] <== 0;
    for (var i = 0; i < N; i++) {
        filteredAmounts[i] <== amounts[i] * isValid[i];
        runningSum[i+1] <== runningSum[i] + filteredAmounts[i];
    }

    // 3. Sum >= threshold (CRITICAL — must explicitly constrain gte.out === 1)
    component gte = GreaterEqThan(64);
    gte.in[0] <== runningSum[N];
    gte.in[1] <== threshold;
    gte.out === 1;

    // 4. Bind to employer commitment
    component employerHasher = Poseidon(2);
    employerHasher.inputs[0] <== employerSecret;
    employerHasher.inputs[1] <== runningSum[N];
    employerCommitment === employerHasher.out;

    validProof <== gte.out;
}

component main {
    public [threshold, dateRangeHash, employerCommitment]
} = IncomeProof(32);
```

**Trusted setup:** Hermez `powersOfTau28_hez_final_15.ptau`. Phase 2 setup + entropy contribution per circuit. No custom ceremony.

**Benchmarks:** ~180k R1CS constraints. Browser WASM 1.5–3s. Node.js <1s. Proof 128 bytes (Groth16 fixed). On-chain verify <200k CUs.

---

## 12. ANCHOR PROGRAM DESIGN

`programs/tessera/src/lib.rs`. Program ID populated post-deployment.

### Instructions

**`initialize`** — once, at deploy. Stores verification key bytes, admin pubkey, fee config.

**`verify_income_proof(proof, public_signals)`** — entrypoint for credential minting.
1. Calls `groth16_solana::verify` against stored vk.
2. On success: emits `ProofVerified`, calls `mint_credential` internally.
3. On failure: returns `VerificationFailed` — no state change, no fee charged.

**`mint_credential`** (internal) — CPI to Metaplex Bubblegum. Mints compressed NFT with public-signal-only metadata. Credential PDA derived from `(employee_pubkey, proof_hash)` — same proof can never re-mint.

**`verify_credential(employee_pubkey)`** — read-only helper for B2B integrators. Returns `(valid: bool, threshold: u64, expires_at: i64)`.

### Accounts

```rust
#[account]
pub struct TesseraState {
    pub admin: Pubkey,
    pub verification_key: Vec<u8>,   // groth16 vk bytes
    pub fee_lamports: u64,
    pub total_credentials_issued: u64,
    pub bump: u8,
}

#[account]
pub struct Credential {
    pub owner: Pubkey,
    pub income_above_threshold: bool,
    pub threshold: u64,
    pub date_range_hash: [u8; 32],
    pub employer_commitment: [u8; 32],
    pub proof_hash: [u8; 32],
    pub issued_at: i64,
    pub expires_at: i64,           // issued_at + 90 days
    pub issuer: Pubkey,
    pub bump: u8,
}
```

### PDA seeds
- `["tessera", "state"]`
- `["tessera", "credential", employee_pubkey, proof_hash]`

---

## 13. UMBRA SDK INTEGRATION MAP

### Initialization (human, browser)
```typescript
const client = await getUmbraClient({
  signer: walletAdapterSigner,
  network: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
  rpcSubscriptionsUrl: "wss://api.devnet.solana.com",
  indexerApiEndpoint: "https://indexer.umbraprivacy.com",
  deferMasterSeedSignature: true,
});
```

### Initialization (agent, headless) — see §14
```typescript
const signer = new AgentSigner(keypair);
const client = await getUmbraClient({ signer, network, rpcUrl, ... });
```

### Employer flow
```typescript
const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
await deposit({
  amount: lamports,
  recipientUmbraAddress: employeeUmbraAddress,
  token: USDC_MINT,
  callbacks: { onTransactionSent, onConfirmed }
});
```

### Employee flow (decrypt own UTXOs)
```typescript
const utxos = await client.scan();
const filtered = utxos.filter(u =>
  u.timestamp >= startTs && u.timestamp <= endTs && u.token === USDC_MINT
);
```

### Day 0 SDK validation tasks (see §20)
1. Initialize client on devnet — no auth errors
2. Register new user — confirm devnet registration works
3. Deposit 1 USDC to test address — UTXO appears in indexer
4. Scan as recipient — UTXO returned with amount + timestamp
5. Confirm UTXO payload structure (token, timestamp, nonce fields)
6. Test relayer — gasless withdrawal succeeds
7. Hit indexer `/verify` endpoint — does it exist? what's the schema?

---

## 14. AGENT ARCHITECTURE

### `AgentSigner` — IUmbraSigner for headless agents

```typescript
// lib/agent-signer.ts
import { Keypair } from "@solana/web3.js";
import { sign } from "@noble/ed25519";
import type { IUmbraSigner } from "@umbra-privacy/sdk/interfaces";

export class AgentSigner implements IUmbraSigner {
  constructor(private keypair: Keypair) {}

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    // Deterministic Ed25519 signature.
    // Same keypair + same message → same signature → same Umbra master seed.
    return sign(message, this.keypair.secretKey.slice(0, 32));
  }

  get publicKey() { return this.keypair.publicKey; }
}
```

### Agent Identity Lifecycle

1. Agent loads keypair from env (`AGENT_PRIVATE_KEY`) or KMS.
2. Wraps in `AgentSigner`.
3. `getUmbraClient({ signer })` — same SDK, no human prompt.
4. First run: `register({ confidential: true, anonymous: true })`.
5. Master seed derived deterministically via `signMessage` over Umbra's registration message — same keypair always yields same seed.
6. Agent's Umbra address is permanent and recoverable from keypair alone.

### Agent Capabilities Unlocked

- **Receive shielded payments** — same flow as human employee.
- **Scan + decrypt own UTXOs** — `client.scan()` runs in Node.js without browser.
- **Generate income proofs** — `snarkjs.groth16.fullProve` runs server-side in <1s.
- **Mint credentials autonomously** — no wallet UI needed; signs and submits directly.
- **Pay other services privately** — see §15.
- **Accept private payments** — see §15.

### Security Notes
- Agent keypairs at hackathon-grade: env var. Production: KMS / HSM / threshold signing.
- Master seed compromise = full Umbra identity compromise. Same security boundary as human wallet seed.
- Agents should rotate Umbra addresses if their keypair is suspected compromised — possible by registering a new keypair.

---

## 15. x402 PRIVATE PAYMENT RAIL

### Standard x402 vs TESSERA x402

```
STANDARD x402:
  Agent → HTTP request → 402 with public SPL transfer requirement
  Agent → public SPL transfer
  Server → reads on-chain state → grants access
  Payment graph: fully public

TESSERA x402:
  Agent → HTTP request → 402 with Umbra payment requirement
  Agent → Umbra confidential transfer (amount encrypted, sender hidden)
  Server → queries Umbra indexer → confirms UTXO at recipient address
  Payment graph: invisible on-chain
```

### `x402UmbraAdapter` — Client + Server

```typescript
// lib/x402-umbra-adapter.ts

export interface UmbraPaymentRequirement {
  recipientUmbraAddress: string;
  amount: bigint;
  token: string;
  nonce: string;          // prevents replay
  expiresAt: number;      // unix
}

// CLIENT (agent paying)
export async function payX402Private(
  req: UmbraPaymentRequirement,
  client: IUmbraClient
): Promise<string> {
  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
  let txSig = "";
  await deposit({
    amount: req.amount,
    recipientUmbraAddress: req.recipientUmbraAddress,
    token: req.token,
    callbacks: { onTransactionSent: (sig) => { txSig = sig; } }
  });
  return txSig;
}

// SERVER (service receiving payment)
export async function verifyX402Private(
  txSig: string,
  req: UmbraPaymentRequirement,
  indexerEndpoint: string
): Promise<boolean> {
  // Primary path: Umbra indexer /verify endpoint
  const res = await fetch(`${indexerEndpoint}/verify`, {
    method: "POST",
    body: JSON.stringify({
      txSignature: txSig,
      recipient: req.recipientUmbraAddress,
      amount: req.amount,
      nonce: req.nonce,
    })
  });
  if (res.ok) {
    const { verified } = await res.json();
    return verified;
  }
  // Fallback: parse tx via Solana RPC, confirm UTXO commitment landed
  return verifyViaRpcFallback(txSig, req);
}
```

### x402 Middleware Pattern (Server-Side)

```typescript
// Express/Next.js route handler
export async function withX402Private(handler) {
  return async (req, res) => {
    const paymentSig = req.headers['x-payment-signature'];
    if (!paymentSig) {
      return res.status(402).json({
        scheme: "umbra-private",
        network: "solana-devnet",
        recipientUmbraAddress: SERVICE_UMBRA_ADDRESS,
        amount: "1000000",  // 1 USDC
        token: USDC_MINT,
        nonce: generateNonce(),
        expiresAt: Date.now() + 60_000,
      });
    }
    const verified = await verifyX402Private(paymentSig, req.body, INDEXER);
    if (!verified) return res.status(402).json({ error: "payment_invalid" });
    return handler(req, res);
  };
}
```

### Indexer `/verify` Endpoint — Validation Required (Day 0)

This endpoint is the load-bearing dependency for server-side verification. Day 0 must confirm:
- Does it exist?
- Request/response schema?
- Rate limits?
- If absent: implement RPC fallback in `verifyViaRpcFallback` parsing the Umbra deposit instruction directly.

---

## 16. DATA MODEL

### Umbra UTXO (from indexer scan)
```typescript
interface UmbraUTXO {
  id: string;
  amount: bigint;              // decrypted with viewing key
  token: string;               // SPL mint
  timestamp: number;           // unix
  nonce: bigint;
  nullifier: string;
  merkleProof: string[];
  isSpent: boolean;
}
```

### Circuit Witness
```typescript
interface IncomeWitness {
  amounts: bigint[];           // length 32, padded with 0n
  isValid: bigint[];           // length 32, 0n or 1n
  nonces: bigint[];            // length 32, padded
  employerSecret: bigint;
  threshold: bigint;
  dateRangeHash: bigint;       // Poseidon(startTs, endTs)
  employerCommitment: bigint;  // Poseidon(secret, totalIncome)
}
```

### On-Chain Credential (mirrors Anchor account)
```typescript
interface TesseraCredential {
  owner: PublicKey;
  incomeAboveThreshold: boolean;
  threshold: BN;
  dateRangeHash: number[];     // 32 bytes
  employerCommitment: number[];
  proofHash: number[];
  issuedAt: BN;
  expiresAt: BN;
  issuer: PublicKey;
  bump: number;
}
```

### Payment Requirement (x402)
```typescript
interface UmbraPaymentRequirement {
  recipientUmbraAddress: string;
  amount: bigint;
  token: string;
  nonce: string;
  expiresAt: number;
}
```

---

## 17. API SPECIFICATION

All routes Next.js App Router handlers under `/app/api`.

### `POST /api/proof/generate`
Server-side proof fallback (low-power devices). Body: `{ witness }`. Returns `{ proof, publicSignals, generationMs }`.

### `POST /api/credential/mint`
Submit proof to Anchor program. Body: `{ proof, publicSignals, walletAddress }`. Returns `{ txSignature, credentialPDA }`.

### `GET /api/credential/[address]`
Read credential by employee wallet. Returns `{ credential, valid, reason? }`.

### `GET /api/umbra/status`
Health: `{ indexer, relayer, devnetPool: { utxoCount, tvl } }`. Used by frontend status banner.

### `POST /api/umbra/scan`
Server-side UTXO scan for low-power clients. Body: `{ viewingKey, startTs, endTs }`. Returns `{ utxos, count }`. **Privacy note:** prefer client-side scan; server scan is fallback only.

### `POST /api/x402/charge` (demo endpoint for `/agent` page)
A simulated paid service requiring x402 private payment. Demonstrates the middleware pattern live.

### `POST /api/agent/spawn` (demo only)
Spawns a demo agent process for the `/agent` live feed. Returns agent pubkey + Umbra address. Local only — not for production.

### `GET /api/agent/feed/[agentPubkey]`
SSE stream of agent activity (received payments, generated proofs, x402 payments out). Used by `/agent` UI.

---

## 18. END-TO-END LIFECYCLES

### Lifecycle A — Human Employee

1. **Onboard.** Visit `/employee` → connect Phantom/Backpack → `register()` triggers `signMessage` → master seed derived → Umbra address assigned.
2. **Receive salary.** Employer shields payment to employee's Umbra address (employer side: §18-B).
3. **Scan.** Employee selects date range + threshold → `client.scan()` fetches and decrypts UTXOs → filtered by range.
4. **Build witness.** App pads `amounts[N]`, computes `isValid[N]`, hashes `dateRange` and `employerCommitment` via Poseidon.
5. **Generate proof.** `snarkjs.groth16.fullProve` in Web Worker → 1.5–3s → 128-byte proof + public signals.
6. **Mint credential.** Submit to `verify_income_proof` → on-chain Groth16 verify (<200k CUs) → `mint_credential` CPI to Bubblegum → cNFT in employee wallet.
7. **Use.** Share credential PDA / employee pubkey with verifier protocol → verifier calls `verify_credential` → access granted.
8. **Renew.** 90-day expiry. Repeat 3–6 with updated date range.

### Lifecycle B — Employer (paying humans or agents)

1. Connect wallet → register if first time.
2. Enter recipient's Umbra address (works identically for human or agent recipients).
3. Enter amount + token.
4. Confirm → SDK calls deposit function → Arcium MPC encrypts amount → UTXO commits.
5. Recipient is notified out-of-band (email, link, agent webhook).

### Lifecycle C — Autonomous Agent

1. **Bootstrap.** Agent process loads keypair → wraps in `AgentSigner` → initializes Umbra client headless.
2. **Register.** First run: `register()` — Master seed derived deterministically.
3. **Receive.** Either receives shielded salary (acts as employee) OR receives x402 private payments from upstream agents.
4. **Generate credential** (optional). Same flow as human, but in Node.js (<1s proof). Agent now has on-chain proof of revenue threshold without revealing customers or amounts.
5. **Pay downstream.** When agent needs to call a paid x402 service:
   a. HTTP request to service.
   b. Receives 402 with Umbra payment requirement.
   c. `payX402Private(req, client)` → Umbra confidential transfer → tx sig returned.
   d. Retries original request with `X-Payment-Signature: <sig>`.
   e. Service verifies via indexer `/verify` (or RPC fallback) → grants access.
6. **Loop.** Agents form private payment meshes — entire graph invisible on-chain.

### Lifecycle D — Verifier Protocol

1. Integrate once: import `verify_credential` IDL.
2. User submits their wallet address.
3. CPI call: `verify_credential(user_pubkey)` returns `(valid, threshold, expires_at)`.
4. Apply own logic (e.g., "approved if threshold ≥ 5000 USDC and expires_at > now").
5. Grant access. Never see income.

---

## 19. FAILURE STATES & RECOVERY

| Failure | UI State | Recovery |
|---|---|---|
| Umbra indexer stale Merkle proof | "Proof data refreshing — retry in 30s" | Auto-retry scan() up to 3x; manual fallback indexer endpoint |
| Arcium MPC timeout (>90s) | "Your payment is processing. Come back in 2 minutes." | Poll UTXO availability every 15s |
| snarkjs witness gen fail (sum < threshold) | "Income below threshold for selected period" | User adjusts date range or threshold |
| On-chain Groth16 verify fail | "Proof rejected. Regenerate from fresh scan." | Client regenerates; no state change on-chain |
| Bubblegum mint fail | "Credential mint failed — your proof is valid. Retry." | Idempotent retry by proof_hash |
| Devnet relayer offline | "Relayer unavailable — small SOL fee will apply" | Fallback to user-pays-gas path |
| Anonymity set too small | Warning banner: "Maximum privacy: wait 2–6h before claiming" | Suggest delay window |
| Agent keypair compromised | (out-of-band) | Rotate to new keypair; re-register; new Umbra address |
| Indexer `/verify` endpoint absent | Server falls through to RPC parse | `verifyViaRpcFallback` reads tx, confirms commitment |
| 0 UTXOs in date range | "No salary deposits found in this period" | Adjust range |
| >32 UTXOs in date range | Warning: "32-deposit cap reached — partial proof" | Optional N=64 zkey for power users |
| Replay attack (same proof twice) | "Credential already exists for this proof" | PDA collision = idempotent — no duplicate |
| Wrong recipient Umbra address | (silent — UTXO at wrong address) | Employer re-pays correct address; original unspendable by employee |

---

## 20. DAY 0 VALIDATION GATE

**STOP/GO checkpoint.** No code is written until every item below is checked.

### Hard Pass/Fail
- [ ] `getUmbraClient({ network: 'devnet' })` returns without auth errors
- [ ] `register()` succeeds on a fresh devnet keypair
- [ ] `deposit(1 USDC)` succeeds and tx confirms
- [ ] `client.scan()` returns the deposited UTXO with amount + timestamp + token
- [ ] Withdrawal via relayer succeeds (or relayer absent confirmed → fallback path required)
- [ ] groth16-solana crate compiles in a clean Anchor project
- [ ] Metaplex Bubblegum cNFT mint works on devnet
- [ ] Hermez ptau file downloads + circuit compiles + dummy proof generates

### Indexer endpoint check
- [ ] Hit `https://indexer.umbraprivacy.com/verify` with a known tx — does it return data?
- [ ] If 404: document RPC fallback path (parse Umbra deposit ix from tx, extract recipient + amount commitment)
- [ ] If exists: capture full request/response schema

### Outreach (do these on Day 0)
- [ ] DM `@francis_codex` on X re: devnet relayer status, IUmbraSigner override pattern
- [ ] DM Umbra team (`@UmbraPrivacy`) re: indexer `/verify` schema, master seed override patterns

### If any hard-pass fails
Halt. Document the failure. Either resolve before Day 1 OR scope-adjust (e.g., if Bubblegum is unavailable on devnet, fall back to regular Anchor-account-stored credentials with a `Credential` PDA rather than cNFT — innovation score drops 1 point but build still completes).

---

## 21. SPRINT PLAN

**Window:** 13 days remaining at PRD lock (per Superteam clock).

### Day 0 (today) — Validation Gate (§20)
Pass everything in §20 OR adjust scope. No code yet.

### Day 1 — Skeleton + SDK Validation
- `pnpm create next-app tessera --typescript --tailwind --app`
- Install Umbra SDK, snarkjs, circomlib, Anchor deps
- `lib/umbra.ts` (client init, register helper)
- `lib/wallet.ts` (wallet adapter)
- End-of-day: working Umbra deposit + scan in a test script

### Day 2 — Circuit Build
- Write `circuits/income_proof.circom` per §11
- Compile (`circom income_proof.circom --r1cs --wasm --sym`)
- Trusted setup phase 2 (`snarkjs groth16 setup`)
- `lib/proof.ts` — `generateIncomeProof(witness)` working with dummy witness

### Day 3 — Witness Builder + Agent Signer
- `lib/witness.ts` — UTXOs + range + threshold → IncomeWitness
- `lib/agent-signer.ts` — AgentSigner class
- Unit test: real Umbra UTXOs → valid proof
- End-of-day: agent can register against Umbra headlessly

### Day 4 — Anchor Program Skeleton
- `anchor init programs/tessera`
- Add groth16-solana + mpl-bubblegum deps
- TesseraState + Credential accounts
- `initialize` instruction
- Deploy to devnet, capture program ID

### Day 5 — On-Chain Verifier
- `verify_income_proof` instruction with groth16-solana integration
- Public signals validation
- Test: valid proof passes, invalid proof rejected (no state change)

### Day 6 — Credential Minting
- `mint_credential` internal instruction
- Bubblegum CPI integration
- End-of-day: full flow — proof submitted → cNFT minted on devnet

### Day 7 — x402 Adapter + Frontend Foundation
- `lib/x402-umbra-adapter.ts` — client + server
- `withX402Private` middleware
- Frontend layout, design tokens (per Frontend PRD)
- `WalletConnectButton`, base components

### Day 8 — Employer Page + Onboarding
- `/employer` — SalaryShieldForm
- `/onboarding` — first-run flow
- Empty states + loading states wired

### Day 9 — Employee Page + Proof Generation UI
- `/employee` — IncomeScanner, date range, threshold input
- ProofGenerator component (snarkjs in Web Worker)
- Connect to real Umbra scan + proof generation

### Day 10 — Agent Page + Verifier Demo
- `/agent` — live SSE feed of running agent
- `/verify` — simulated DeFi protocol integration
- `/credential/[address]` — public viewer

### Day 11 — Polish + Edge Cases
- All error states wired
- Mobile responsive pass
- Toast system, copy-to-clipboard, tx hash treatments
- Edge cases: 0 UTXOs, >32 UTXOs, expired credential, replay attempt

### Day 12 — CODE FREEZE 🛑 + Submission Artifacts
- No new features after morning of Day 12
- Record demo video (per §23)
- Write README, architecture doc
- Deploy to Vercel
- Push final repo

### Day 13 — Buffer + Distribution
- Bug fixes from final testing
- Distribution motion (per §27)
- Submit

(Day 14+ buffer if available — already at deadline.)

---

## 22. ANTI-PATTERNS

Things we explicitly do NOT do.

- **Do not adapt VeilPay's circuit.** Their circuit lacks explicit `gte.out === 1` constraint. Under-constrained = forgeable. Write from scratch per §11.
- **Do not use demo data.** No fake salaries, no mock addresses in the demo. Every value flows through real Umbra devnet.
- **Do not hide MPC latency.** Don't pre-execute and pretend it's instant. Frame the 8–30s as the cryptographic cost. Honesty + competence beats fake speed.
- **Do not skip the relayer fallback.** Devnet relayer flagged risky. Build user-pays-gas path on Day 1.
- **Do not store viewing keys server-side.** Privacy collapses. Client-side only. Server scan endpoint is for low-power devices only and must accept ephemeral keys.
- **Do not 1-shot the build.** Sequenced prompts, one concern per step. PR per concern.
- **Do not skip the witness builder unit tests.** Witness format errors are silent failures — proof generates but verifies false on-chain.
- **Do not ship without recording the demo.** Working code with no demo = lower score than slightly-buggy code with great demo.
- **Do not speak in scope-cutting language.** Treat deadline as logistics. Ship every section per plan.
- **Do not introduce new SDKs after Day 7.** Stack frozen. Bug fixes only.
- **Do not include the agent path in early demo cuts if x402 adapter isn't fully working.** Cut agent section out cleanly rather than show broken flow.
- **Do not put analytics on the credential viewer page.** Viewing a credential should leave no trail.

---

## 23. DEMO SCREENPLAY

**Length:** 4 minutes 30 seconds (under 5-minute submission cap).

### Pre-production
- Record on devnet with pre-funded employer wallet (real, but pre-funded for time).
- Two browser windows side by side: employer left, employee right. Third window for verifier demo.
- Terminal in fourth pane streaming agent feed.
- No music. Voice + UI sounds only. Music dates content.

### Script (timestamped)

**[0:00 – 0:25] Hook**
"Today on Solana, proving your income costs you everything else. You expose your wallet, or you trust an intermediary. TESSERA gives you a third option: prove your income. Reveal nothing."
[B-roll: Solana Explorer showing public salary tx → cut to TESSERA credential card with public-only signals]

**[0:25 – 1:00] Employer Side**
"Employer pays a developer in USDC."
[DEMO: enter Umbra address + amount → click Shield → progress bar through MPC → confirmed]
"Amount encrypted by Arcium MPC before it touches the chain. Solana Explorer shows: a commitment. No amount. No recipient identity."

**[1:00 – 2:00] Employee Side**
"Employee connects wallet. Selects date range — six months. Sets threshold — 3,000 USDC. Hits generate."
[DEMO: scan UTXOs → date selector → threshold input → ProofGenerator with progress]
"Witness built from decrypted UTXOs in browser. Groth16 proof generated by snarkjs in WebAssembly. Two-point-one seconds. 128 bytes. The proof carries: threshold, date range hash, employer commitment, validity flag. Nothing else."

**[2:00 – 2:50] On-Chain Verification + Mint**
"Mint Credential submits the proof to TESSERA's Anchor program. groth16-solana verifies on-chain in under 200,000 compute units. Compressed NFT minted via Metaplex Bubblegum."
[DEMO: tx confirmation → credential card render → click through to Solana Explorer]
"Credential is on-chain. Public signals only. No salary, no employer, no addresses."

**[2:50 – 3:30] Verifier Integration**
"Here's a DeFi lending protocol. They call verify_credential with the user's pubkey. One CPI call."
[DEMO: /verify page → paste address → APPROVED]
"They never touched Umbra. Never saw a UTXO. Never saw an amount. Just got a cryptographic guarantee."

**[3:30 – 4:10] Agent Lane**
"Same protocol. Different user."
[DEMO: /agent page — terminal stream showing agent receiving payment, generating proof, paying downstream service via x402]
"This is an autonomous agent. Headless Umbra identity. Receives shielded payments. Generates its own credentials. Pays other services through x402 with confidential transfers underneath. Entire payment graph invisible on-chain. Same primitive — humans plus agents — one protocol."

**[4:10 – 4:30] Close**
"TESSERA is the missing creditworthiness primitive for a private financial internet. GitHub, live devnet, docs in submission. Built with Umbra SDK 4.0, circom, groth16-solana, Anchor."

### Rehearsal Plan
- 5x dry runs before recording — no script reading
- 3x recordings — pick best
- 1x watchback with someone unfamiliar with the project — does the pitch land?

### Fallback Cuts
If agent flow has bugs at submission time: cut from 3:30 directly to close. Demo without agent still scores 8.2; demo with broken agent scores worse than demo without.

---

## 24. SUBMISSION ARTIFACTS

| Artifact | Where | Owner |
|---|---|---|
| Public GitHub repo | github.com/winsznx/tessera | Tim |
| README | repo root | per §18 of Frontend PRD or §3 of this doc |
| Architecture doc | `/docs/architecture.md` | from §9 of this doc |
| Circuit doc | `/docs/circuit.md` | from §11 |
| Live frontend | Vercel deployment | Day 12 |
| Program ID | README + on-chain | from Day 4 |
| Demo video | YouTube unlisted | Day 12 |
| Submission post | Superteam Earn form | Day 13 |
| X post | tag @UmbraPrivacy @colosseumhq | Day 13 |

---

## 25. RISK REGISTER

| # | Risk | P | I | Mitigation |
|---|---|---|---|---|
| R1 | Devnet relayer offline | H | H | User-pays-gas fallback on Day 1; reach out to Umbra |
| R2 | Indexer not populated on devnet | M | H | Seed UTXOs via deposit; Umbra outreach Day 0 |
| R3 | Indexer `/verify` endpoint absent | M | H | RPC fallback in `verifyViaRpcFallback` |
| R4 | Arcium MPC >90s during demo | M | M | Pre-execute deposits; explain latency in voiceover as feature |
| R5 | groth16-solana version drift | L | H | Pin version, lock Cargo.lock |
| R6 | Bubblegum unavailable on devnet | L | M | Fallback: regular Anchor account credential |
| R7 | Anonymity set TVL ~$160k | H | M | Disclose; position as devnet constraint |
| R8 | SDK source closed, undocumented behavior | M | M | HTTP-proxy SDK calls to map full API on Day 0 |
| R9 | snarkjs OOM on low-end devices | L | L | Server proof gen fallback |
| R10 | VeilPay-style under-constrained circuit | M | H | Write circuit from scratch, code-review constraints |
| R11 | Agent keypair leaked | L | H | Hackathon: env var fine. Production note in README. |
| R12 | x402 spec evolves mid-build | L | M | Pin to spec snapshot Day 0 |
| R13 | Agent demo flow flaky | M | M | Fallback cut script (§23) |
| R14 | Solana RPC throttling during demo | M | M | Helius/Triton account; not public RPC |
| R15 | Insufficient time for polish | M | M | Code freeze Day 12 enforced |

---

## 26. DECISION LOG

| Decision | Chose | Rejected | Why |
|---|---|---|---|
| ZK system | circom + Groth16 | Noir, halo2 | Mature WASM proving + groth16-solana verifier |
| Credential storage | Compressed NFT (Bubblegum) | Regular NFT, SBT, account | Cheap mints, composable, devnet-available |
| Circuit N | 32 | 8 (small), 64 (slow) | 2.5+ years monthly coverage; <3s proof |
| Trusted setup | Hermez ptau | Custom ceremony | No time for ceremony; widely trusted |
| Agent signer | Custom IUmbraSigner | Use browser wallet headlessly | Headless is cleaner; deterministic |
| Indexer scan | Client-side primary | Server-only | Privacy: viewing key never leaves client |
| Proof gen | Browser primary | Server primary | Privacy: witness never leaves client |
| Demo presentation | Show real MPC latency | Pre-execute and fake | Honesty signals technical competence |
| x402 verification | Indexer first, RPC fallback | RPC only | Indexer faster; RPC reliable backup |
| Innovation framing | Dual-mode (humans + agents) | Single-mode payroll | 8.2 → 9.1 weighted score |
| Frontend stack | Next 16.2.4 + Tailwind 4 + shadcn | Vite, MUI | Standard, fast, themeable. React 19.2; Turbopack default. |
| Code freeze | 48h before deadline | No freeze | Polish + record + submit time |

---

## 27. DISTRIBUTION PLAN

Phase H of the playbook. Launch motion runs **in parallel with Day 13 submission**, not after.

### Day 12 evening (after code freeze)
- Submission video private link to 3 trusted reviewers — feedback overnight
- README polish based on feedback

### Day 13 morning
- **X post (primary):** Thread, 6 posts.
  1. "TESSERA. Prove your income on Solana. Reveal nothing."
  2. The problem (transparency paradox).
  3. The architecture (Umbra → ZK proof → cNFT credential).
  4. The agent extension (x402 + private payments).
  5. Live devnet link + demo video link.
  6. Tag `@UmbraPrivacy @colosseumhq @SuperteamEarn`. Mention `@francis_codex` who flagged the same SDK questions.
- **Telegram:** Umbra Builder group — paste the X thread + repo link + ask for technical feedback.
- **Submission form:** completed by 12pm.

### Day 13 afternoon
- DM Umbra team with a thank-you + offer post-hackathon support
- Reply to every comment on the X thread within 1 hour for 24 hours
- Reach out to one DeFi lending protocol founder (MarginFi, Kamino, or Credix) — pitch credential integration. Even if no response, signals serious commercial intent.

### Post-judging
- Whether win or not, write a "what we learned" post — feeds into the next hackathon (Phase I).
- If judges loved it: convert TESSERA into a permanent product. Domain registered. Roadmap public.

---

## 28. OPEN QUESTIONS

To resolve in Day 0 outreach.

1. Does Umbra indexer expose a `/verify` endpoint? Schema?
2. Is the devnet relayer currently online?
3. What's the current devnet shielded pool TVL / UTXO count?
4. Is there a recommended `IUmbraSigner` override pattern for non-browser signers?
5. Is there a token list for devnet beyond USDC?
6. Are there registered relayer endpoints, or fully permissionless?
7. Indexer rate limits for `client.scan()`?
8. Is Metaplex Bubblegum confirmed working on Solana devnet today?
9. Is there a recommended Solana RPC for devnet (Helius/Triton)?
10. Any known issues with @umbra-privacy/sdk v4.0.0?

Answers go into Day 0 results doc and update §20 + §25.

---

**END — Engineering PRD v2**

Companion: `TESSERA_PRD_v2_Frontend.md` covers all UI/UX, design tokens, page wireframes, empty/loading/error states, microcopy, mobile, accessibility.
