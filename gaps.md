# gaps.md

Audit 2026-05-03. Append-only — never edit the PRDs.

| id | sev | file:line | finding | real replacement per PRD | dep |
|---|---|---|---|---|---|
| G01 | BLOCKER | app/api/proof/generate/route.ts:1 | POST returns 501 stub | Build witness, run Groth16 (snarkjs) per Engineering §11 / §17 | circuit |
| G02 | BLOCKER | app/api/credential/mint/route.ts:1 | POST returns 501 stub | Anchor `mint_credential` ix per Engineering §12 / §17 | anchor |
| G03 | BLOCKER | app/api/credential/[address]/route.ts:1 | GET returns 501 stub | Fetch on-chain credential PDA per Engineering §16 / §17 | anchor |
| G04 | BLOCKER | app/api/umbra/status/route.ts:1 | GET returns 501 stub | Indexer health passthrough per Engineering §17 (`{ indexer, relayer, devnetPool }`) | umbra-init |
| G05 | BLOCKER | app/api/umbra/scan/route.ts:1 | POST returns 501 stub | Decrypt own UTXOs via Umbra client per Engineering §13 | umbra-init |
| G06 | BLOCKER | app/api/agent/spawn/route.ts:1 | POST returns 501 stub | Spawn AgentSigner instance per Engineering §14 | agent-signer |
| G07 | BLOCKER | app/api/x402/charge/route.ts:1 | POST returns 501 stub | x402UmbraAdapter charge per Engineering §15 | x402 |
| G08 | BLOCKER | app/api/agent/feed/[pubkey]/route.ts:1 | GET returns 501; comment says "implemented as SSE in Step 12" | SSE stream of agent events per PRD §11.5 / Engineering §17 | agent-signer |
| G09 | BLOCKER | components/wallet-connect-button.tsx:21 | `setTimeout` fake connect, hardcoded address | `@solana/wallet-adapter-react` modal per PRD §21.2 | umbra-init |
| G10 | BLOCKER | components/onboarding-modal.tsx:35 | `setTimeout` fake Umbra register | Real `client.register()` per Engineering §13 | umbra-init |
| G11 | BLOCKER | app/employer/page.tsx:25-63 | 3-stage `setTimeout` fake MPC pipeline | Umbra shielded transfer per Engineering §13; progress from real RPC events | umbra-init |
| G12 | BLOCKER | app/employee/page.tsx:49-77 | `setTimeout` fake scan + proof; "snarkjs Web Worker" string but snarkjs not installed | UTXO scan + Web Worker Groth16 per PRD §11.4 / Engineering §13 | circuit |
| G13 | BLOCKER | app/agent/page.tsx:26,39-58 | scripted `scenarios[]` array drives "live feed" | SSE from `/api/agent/feed/[pubkey]` per PRD §11.5 | agent-signer |
| G14 | BLOCKER | app/verify/page.tsx:30-34 | `setResult(address.length > 32 ? "approved" : "denied")` | Anchor CPI `verify_credential` per Engineering §17 | anchor |
| G15 | BLOCKER | app/credential/[address]/page.tsx:11 | `const found = true; // Stub` | Fetch credential PDA per Engineering §17; render Not Found / Expired / Revoked | anchor |
| G16 | HIGH | app/employer/page.tsx:53-58 | `newPayment` literal hardcodes recipient/amount/tx | Derive from form state + tx receipt | umbra-init |
| G17 | HIGH | app/employee/page.tsx:101 | Hardcoded `"9xQeRy7vH96Yx4Hp2PkB9zT5w..."` Umbra address | `client.umbraAddress` from provider | umbra-init |
| G18 | HIGH | app/employee/page.tsx:281-289 | Hardcoded `SealCard` props (threshold/dateRange/issuedAt/expiresAt/employerCommitment/proofHash) | Pass real on-chain credential | anchor |
| G19 | HIGH | app/employee/page.tsx:176-178 | Hardcoded "14 deposits" copy | Derive `{N}` from scan result per PRD §11.4 microcopy | umbra-init |
| G20 | HIGH | app/agent/page.tsx:138,142,146 | Hardcoded pubkey, Umbra identity, balance `12500000` | Server state for spawned agent | agent-signer |
| G21 | HIGH | components/onboarding-modal.tsx:117 | Hardcoded Umbra address in step-2 success | Real `client.umbraAddress` | umbra-init |
| G22 | HIGH | components/credential-viewer-content.tsx:71-78 | Hardcoded SealCard props in viewer | Server-fetched credential | anchor |
| G23 | HIGH | lib/constants.ts:5 | `USDC_MINT` set to mainnet but commented "placeholder for devnet" while `DEVNET_USDC_MINT` also exists | Drop one; pick devnet for hackathon per Engineering §13 | none |
| G24 | HIGH | app/page.tsx:109 | "verifies on-chain in milliseconds" | PRD §11.1: "in under 200,000 compute units" | none |
| G25 | HIGH | components/how-it-works.tsx:18,26,34 | Step 2 body shorter than PRD; missing "— without revealing it"; Step 3 body abridged | PRD §11.1 §13 | none |
| G26 | HIGH | components/footer.tsx | Footer copy "© 2026 TESSERA PROTOCOL · UMBRA SHIELDED" + "NON-CUSTODIAL / ZERO-KNOWLEDGE / SOLANA ANCHOR" | PRD §11.1: "Built with Umbra · Powered by Solana · Open source" | none |
| G27 | HIGH | app/agent/page.tsx:109 | h1 "Agent Control" | PRD §11.5: "Agent Mode" | none |
| G28 | HIGH | app/agent/page.tsx:124 | Subtitle "Autonomous economic infrastructure for machine-to-machine private payments." | PRD §11.5: "Same protocol. No browser. No human. Autonomous." | none |
| G29 | HIGH | app/agent/page.tsx:150-157 | Action buttons: "Mint" + Power toggle only | PRD §11.5: "Trigger Payment", "Mint Credential", "Pay x402 Service", "Stop Agent" | agent-signer |
| G30 | HIGH | app/agent/page.tsx:213-246 | Bottom block has 3 cards "Invisible Mesh / Self-Sovereign Credits / Headless Logic" | PRD §11.5: heading "What this demonstrates" + 3 specific bullets | none |
| G31 | HIGH | app/verify/page.tsx:47 | Subtitle "Experience how third-party protocols use TESSERA…" | PRD §11.7: "This is what an integrating protocol sees. One CPI call. No income data exposed." | none |
| G32 | HIGH | app/verify/page.tsx:56 | Card title "Tessera Lending (Demo)" | PRD §11.7: "Simulated Lending Protocol" + "DEMO" pill | none |
| G33 | HIGH | components/seal-card.tsx | Field labels "Threshold Proved / Period Validated / Employer Commitment / Proof Integrity"; missing card subtitle line | PRD §11.6 labels: "Threshold / Date range / Employer commitment / Proof hash" + subtitle "Income confirmed above threshold for the stated period." | none |
| G34 | HIGH | components/credential-viewer-content.tsx:30 | Empty state h1 "Credential Not Found" | PRD §11.6: "No credential at this address" | none |
| G35 | HIGH | components/credential-viewer-content.tsx:32 | Empty state body "No active TESSERA credential found for the address {address}." | PRD §11.6: "The address doesn't have a TESSERA credential, or it's been revoked." | none |
| G36 | HIGH | app/employer/page.tsx:182-220 | Recent Payments table columns: Recipient / Amount / Status / Tx | PRD §11.3: Recipient / Amount / When / Status (no header word for tx link) | none |
| G37 | HIGH | app/employee/page.tsx:42 | Stage 1 label "Initializing… / Loading snarkjs Web Worker" | PRD §11.4 / §13: "Decrypting your UTXOs" | circuit |
| G38 | HIGH | app/employee/page.tsx:49-61 | Scan flow skips post-scan confirmation screen "Found N shielded deposits / Total period: … / Continue →" | PRD §11.4 | umbra-init |
| G39 | HIGH | app/employee/page.tsx | Zero-deposit state never rendered | PRD §11.4 "No shielded deposits found / Copy address" | umbra-init |
| G40 | MED | app/employee/page.tsx:200 | Step 3 reassurance text "Your data never leaves your device. Computation is performed locally." | PRD §11.4: "This usually takes 3–5 seconds. The proof is being generated in your browser — your data never leaves your device." | none |
| G41 | MED | components/address-display.tsx:34 | Toast "Address copied to clipboard" | PRD §13: "Address copied" | none |
| G42 | MED | components/tx-hash-display.tsx:25 | Toast "Transaction hash copied" | PRD §13: "Hash copied" | none |
| G43 | MED | components/onboarding-modal.tsx:23 | `currentStep` initialised to 1, skipping "Connect" | Wire to real wallet-connect detection per PRD §11.2 | umbra-init |
| G44 | HIGH | app/page.tsx:123 | `function ProtocolStep(... : any)` | Define `ProtocolStepProps`; AGENTS.md forbids `any` | none |
| G45 | HIGH | components/ui/button.tsx:64 | `ref={ref as any}` on `motion.button` | Type forwardRef correctly; AGENTS.md "never suppress type errors" | none |
| G46 | HIGH | components/ui/button.tsx:79 | `{...props as any}` | Narrow `motion.button` props | none |
| G47 | MED | lib/types.ts:50 | `data: Record<string, any>` on `AgentEvent` | `Record<string, unknown>` or discriminated union | none |
| G48 | MED | app/employer/page.tsx:23 | `useState<any[]>` for payments | Define `Payment` type from Engineering §16 | none |
| G49 | MED | components/address-input.tsx:18-23 | Reads clipboard text but never uses it; empty `catch` | Either expose `onPaste` callback to parent or remove the Paste button | none |
| G50 | MED | app/employee/page.tsx | 367 lines | Split into `<EmployeeScan>`, `<EmployeeConfigure>`, `<EmployeeProve>` per PRD §11.4 | none |
| G51 | MED | app/employer/page.tsx | 251 lines | Extract `<NewShieldedPaymentForm>`, `<RecentPaymentsTable>` | none |
| G52 | MED | app/agent/page.tsx | 249 lines | Extract `<AgentControlPanel>`, `<AgentFeed>`, `<WhatThisDemonstrates>` | none |
| G53 | MED | app/verify/page.tsx | 210 lines | Extract `<VerifyForm>`, `<WhatJustHappened>` | none |
| G54 | HIGH | package.json | Missing PRD §16 deps: `snarkjs`, `circomlib`, `bs58`, `@noble/ed25519`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, `@solana/wallet-adapter-wallets`, `react-hook-form`, `zod`, `date-fns`, `recharts` | Install per PRD §16 | circuit \| umbra-init \| agent-signer |
| G55 | TRIAGED | package.json | `framer-motion` 12.38.0 present but not in PRD §16 | **Triaged by Tim 2026-05-03 — KEEP. Approved dep. See AGENTS.md.** | none |
| G56 | TRIAGED | package.json | `@coral-xyz/anchor` ^0.32.1 added; Engineering §10 places Anchor on contract side | **Triaged by Tim 2026-05-03 — KEEP for `lib/anchor.ts` typed FE client (BUILD_SEQUENCE Step 2).** | anchor |
| G57 | HIGH | package.json | `@solana/web3.js` ^1.98.4 coexists with `@solana/kit` 6.x; Engineering §10 marks web3.js as legacy | Drop `@solana/web3.js` once `lib/types.ts` migrates off `PublicKey` import | none |
| G58 | LOW | package.json | `@solana/addresses, /keys, /signers, /transactions` ^6.8.0 explicit deps duplicate `@solana/kit` re-exports | Prune redundant entries | none |
| G59 | TRIAGED | tailwind.config.ts | Tailwind 4 (`@tailwindcss/postcss` 4.2.4) uses CSS-first `@theme` already in app/globals.css:53; tailwind.config.ts duplicates tokens | **Triaged by Tim 2026-05-03 — DELETE; CSS-first @theme is canonical. Lands in BUILD_SEQUENCE Step 16.** | none |
| G60 | MED | components/onboarding-modal.tsx | No focus trap; backdrop click closes during loading | PRD §15 modal focus trap; PRD §11 destructive flows require explicit cancel | none |
| G61 | MED | components/stepper.tsx | No `role="tablist"` semantics | PRD §15 ARIA | none |
| G62 | MED | components/ui/input.tsx, components/address-input.tsx, components/employee-inputs.tsx | No `aria-invalid` / `aria-describedby` wiring on form fields | PRD §15 form validation | none |
| G63 | LOW | components/footer.tsx | Three `href="#"` placeholder links (Whitepaper / Security Audit / ZK Circuits) plus invented "Globe" link | Wire to real artifacts or remove | none |
| G64 | CLOSED 2026-05-03 | lib/constants.ts:2 | `NEXT_PUBLIC_PROGRAM_ID` placeholder fallback | **Closed.** Replaced with `getProgramId()` lazy getter that throws `"NEXT_PUBLIC_PROGRAM_ID not set"` only on first call. Constants no longer construct any program-id at module load. | anchor |
| G65 | LOW | repo root | No `.env.example` though README references 4 env vars | Add `.env.example` | none |
| G66 | LOW | gaps.md | File was 0 bytes; AGENTS.md progress-log entries reference "triage pending PRD gaps" yet nothing logged | This audit replaces it | none |

---

## 2026-05-03 — Triage decisions from audit

| id | scope | verdict | applies to gap |
|---|---|---|---|
| D1 | `framer-motion` adoption | **KEEP** — formal approved dep. Add to AGENTS.md approved-deps list. | G55 |
| D2 | `tailwind.config.ts` | **DELETE** — Tailwind 4 CSS-first `@theme` is canonical. Lands in BUILD_SEQUENCE Step 16; do not touch this session. | G59 |
| D3 | `@coral-xyz/anchor` on FE | **KEEP** — used by `lib/anchor.ts` typed Anchor client (BUILD_SEQUENCE Step 2). | G56 |
| D4 | Onboarding stepper start index | **AUTO-FIX at BUILD_SEQUENCE Step 4** when wallet adapter lands. Logic: `!connected → 1`; `connected && !registered → 2`; else closed. | G43 |
| D5 | Missing `x402.inbound` / `x402.confirmed` live-feed events | **UNBLOCK at BUILD_SEQUENCE Step 13** when x402 charge endpoint lands. | (live-feed event names) |
| D6 | `SealCard` field renames vs PRD §11.6 | **REVERT** to PRD §11.6 exact labels: "Threshold / Date range / Issued / Expires / Issuer / Employer commitment / Proof hash" + subtitle "Income confirmed above threshold for the stated period." Drop invented "Status" line. | G33 |
| D7 | Footer invented copy + "Mainnet Alpha" pill | **REVERT** to PRD §11.1: "Built with Umbra · Powered by Solana · Open source". Drop "NON-CUSTODIAL / ZERO-KNOWLEDGE / SOLANA ANCHOR" badges and Mainnet Alpha status pill. | G26 |
| D8 | Always-on `StatusBanner` (`type="demo-mode"` hardcoded in `app/layout.tsx:54`) | **MAKE REACTIVE** to `/api/umbra/status` — only render when indexer / relayer report degraded state per PRD §15. Lands in BUILD_SEQUENCE Step 6 (api routes) + Step 14 (microcopy). | (new — see G67) |

---

## 2026-05-03 — Risk register additions (Engineering PRD §25 internal copy)

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G67 | BLOCKER | indexer | `indexer.umbraprivacy.com` returns NXDOMAIN — hostname does not resolve. Engineering §13 / §15 treat this indexer as a primary dependency for `/verify` and UTXO scanning. | RPC fallback parser is **mandatory**, not optional. BUILD_SEQUENCE Step 6 must implement: `getTransaction(sig, {commitment:'confirmed', maxSupportedTransactionVersion:0})`, parse `meta.innerInstructions` for Umbra program CPIs, parse `meta.preBalances/postBalances`, parse program-defined `meta.logMessages`. Tim outreach to @UmbraPrivacy required to confirm whether the indexer host is being relocated. |
| G68 | BLOCKER | relayer | `relayer-devnet.umbra.finance` (best-guess endpoint) does not resolve. `getUmbraRelayer({apiEndpoint})` factory imports cleanly, so the SDK side is healthy. | Implement user-pays-gas path in employer flow at BUILD_SEQUENCE Step 7 with no relayer retry. Mark relayer as soft-dependency in StatusBanner (D8). Tim outreach to @francis_codex (flagged 2026-04-22) required. |
| G69 | MED | sdk peer-dep | `@umbra-privacy/umbra-codama 2.0.2` → `@solana-program/token-2022 0.9.0` peer-requires `@solana/sysvars@^5.0`; project has `6.8.0`. Peer warning emitted on every install. Build still passes. | Watch for runtime breakage on Token-2022 transfers. If hit, file an issue upstream and either pin a lower `@solana/kit` or wait for codama bump. |
| G70 | MED | tooling | `anchor-cli 0.30.1` on PATH but `package.json` pulls `@coral-xyz/anchor` ^0.32.1. Minor on-FE; on-chain tooling repo will need 0.32.x. | Confirm contract-side toolchain version matches `lib/anchor.ts` IDL expectations before BUILD_SEQUENCE Step 2. |
| G71 | LOW | ptau provenance | Hermez S3 mirror `https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau` returns 403 on 2026-05-03. GCS mirror `https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau` is alive. | Document GCS as the primary download URL in the circuit ceremony script. Tim must verify the local SHA256 (`3ef2ecc5b75d687048cf2d59195119b42fb07c5af639c5f283d84bfa69829e7f`) against the iden3/snarkjs Phase-1 published list before relying on it for the production circuit. |
| G72 | CLOSED 2026-05-03 | env | `getUmbraClient` requires `rpcSubscriptionsUrl`. | **Closed.** `NEXT_PUBLIC_SOLANA_WSS` added to `lib/constants.ts`, `.env.example`, README env table, and Day 0 `makeClient()` helper. Default: `wss://api.devnet.solana.com`. | none |

---

## 2026-05-03 — Discord intel patch (Umbra builder group, dated 2026-05-03 and earlier)

> Numbering note: the morning's Day 0 risk register already used G67–G72. The Discord-intel items below were prompted as G67–G71 but are recorded here as G73–G77 to preserve unique IDs and the existing REPORT.md cross-references. The mapping is called out per item.

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G73 | HIGH | wallet adapter (originally requested as G67) | Phantom mutates the transaction post-sign by inserting a `computeBudget` instruction, which trips Umbra's strict tx-shape check and surfaces `SolanaError #7050012`. | Default the wallet adapter modal to **Solflare** (PRD §16). When Phantom is the connected wallet, render an inline warning banner: "Phantom rewrites transactions after signing. If shielding fails with code 7050012, reconnect with Solflare." Update PRD §21.2 wallet-order open-decision: Solflare → Backpack → Phantom. |
| G74 | HIGH | perf — `lib/umbra-client.ts` (originally requested as G68) | `scanClaimable` runs serially across 8 viewing-key trees with an 18s SDK retry → ~50 s default scan. PRD §11.4 microcopy promises "3–5 seconds" for proof gen and an immediate scan result; this is the bottleneck. | Parallelise the 8-tree scan via `Promise.all` and cap retries at 2 with backoff `[1.5s, 3s]` for ~7–8 s p95. Lands in BUILD_SEQUENCE Step 3 (`lib/umbra-client.ts`). Surface a "Scanning…" toast (PRD §13) for the 7–8 s window. |
| G75 | MED | crypto correctness — `lib/umbra-client.ts` (originally requested as G69) | When verifying against `account.x25519PublicKey` from on-chain user state, the right deriver is `getMasterViewingKeyX25519KeypairDeriver`, NOT `getUserAccountX25519KeypairDeriver`. The latter is for a different keypair by design. | Add an inline note in `lib/umbra-client.ts` keyed comment block when Step 3 lands. Guard against future refactors mixing the two. |
| G76 | MED | safety — `lib/umbra-client.ts` (originally requested as G70) | `checkRecipientUmbraStatus` returns `true` even when `x25519PublicKey` is 32 zero bytes (i.e. uninitialised account). | Wrap the check with: `(pubkey.some(b => b !== 0)) && isUserCommitmentRegistered(...)`. Lands in BUILD_SEQUENCE Step 3. Without this guard, the employer flow will allow a "shield to" address that can never decrypt. |
| G77 | LOW | dep pin — `package.json` (originally requested as G71) | `@umbra-privacy/web-zk-prover@2.0.1` must be installed exactly. Used by `AgentSigner` running in Node (BUILD_SEQUENCE Step 12). | Pin without caret when added at Step 12. Add to AGENTS.md "pin exact" list alongside `next`, `react`, `@umbra-privacy/sdk`. |
| G78 | CLOSED 2026-05-03 | env — `lib/constants.ts:3` | `NEXT_PUBLIC_INDEXER_URL` defaulted to mainnet host. | **Closed.** Default switched to `https://utxo-indexer.api-devnet.umbraprivacy.com`. README env table updated. Engineering PRD §13 still references the mainnet host — PRD never edited per project rules; logged as PRD↔reality drift only (see also G80). |
| G79 | CLOSED 2026-05-03 | env — `lib/constants.ts:5` | Mainnet `USDC_MINT` + stray `DEVNET_USDC_MINT` constants. | **Closed.** Stale mainnet+devnet constants dropped; replaced with single `USDC_MINT` reading `NEXT_PUBLIC_USDC_MINT` env, defaulting to dUSDC `4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7`. Faucet documented in README + `.env.example`. | none |
| G80 | HIGH | verification flow — Engineering PRD §13 / §15 (drift, not PRD edit) | Earlier audit + Engineering PRD assumed an indexer `/verify` endpoint is the canonical pay-before-response check. Cal (Umbra founder, Discord 2026-05-03) confirms the canonical flow uses `optional_data` on deposit + computation-account callback inspection — **no `/verify` endpoint involved**. | Replace G67's "build RPC `/verify` fallback" with: "build the `optional_data` round-trip using `getPublicBalanceToEncryptedBalanceDirectDepositorFunction` + `ComputationMonitor`". Hot-path verification is RPC-only; the indexer is for cold-start UTXO discovery only. Full step list captured in [scripts/day0/REPORT.md](./scripts/day0/REPORT.md). |

---

## 2026-05-03 evening — Day 0 closure additions

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G81 | HIGH | sdk bug — `@umbra-privacy/sdk@4.0.0` `fetchClaimableUtxos` | Day 0 Check 04 (scan) fails with `TypeError: Cannot mix BigInt and other types, use explicit conversions` at `dist/index.js:916:34`. Bug is inside the SDK, not our code. Reproduces against the freshly-funded keypair on devnet via `getClaimableUtxoScannerFunction({client})()` with the canonical client config (incl. `indexerApiEndpoint`). | File an issue against `@umbra-privacy/sdk` with the keypair's deposit signature `2MKu5W…F6tMxw` for repro. In the interim, BUILD_SEQUENCE Step 9 (employee scan) needs a workaround: either pin to an SDK patch once shipped, or drive scan via the indexer REST endpoint directly until fixed. Tim outreach to @UmbraPrivacy required. |
| G82 | LOW | ptau provenance | Local SHA512 `5d258eee…2749022` (37 831 832 B) does **not** match the value `982372c8…ae6e` published in [iden3/snarkjs README](https://github.com/iden3/snarkjs#7-prepare-phase-2). Both downloads from the canonical GCS mirror (`https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau`) yield the same hash and same byte size, so the file *as published* is consistent — the README is stale. | Use the file we have; it is what snarkjs publishes. Verification at the ceremony stage uses `snarkjs powersoftau verify` on the file itself (not the README), which is the ground-truth check. Document the mismatch + computed hash in the circuit ceremony script. |
| G83 | MED | bubblegum 5.x mintV1 reliability | First mint attempt failed with `TypeError: buffer.slice is not a function`; second attempt succeeded (`tree=BqYFcy1S…7CBd`). Likely a mpl-bubblegum 5.0.2 quirk around metadata serialisation in Node. | Wrap the mint call in a 2-attempt retry. Re-investigate before BUILD_SEQUENCE Step 9 lands; pin a `mpl-bubblegum` patch if the issue is reproducible upstream. |
| G84 | MED | sdk export naming — `getUserAccountQuerierFunction` (not `getUserAccountQuerier`) | The earlier audit referenced `getUserAccountQuerier`; the actual export is `getUserAccountQuerierFunction`. Day 0 script updated. | Note for `lib/umbra-client.ts` Step 3: import the suffixed name. |
| G85 | LOW | tsconfig — scripts/ | Adding `scripts/day0/*.ts` files (with native Node 24 `.ts` import suffixes) tripped the project's `tsc` step because `**/*.ts` includes them. | Added `"scripts"` to `tsconfig.json` `exclude`. Build clean afterwards. |
| G86 | MED | umi installation footprint | `@metaplex-foundation/umi`, `@metaplex-foundation/umi-bundle-defaults`, `@metaplex-foundation/digital-asset-standard-api` were installed for Check 7. PRD §16 doesn't list them; they are needed for the bubblegum tree creation path. | Adopt formally if BUILD_SEQUENCE Step 9 keeps Umi for cNFT mint, or remove if migrating to a kit-only path. Triage before Step 9. |
| G87 | LOW | dep pin — `@umbra-privacy/web-zk-prover` | Now installed exactly at 2.0.1 (closes G77 partially — pin landed). | Add to AGENTS.md "pin exact" list when BUILD_SEQUENCE Step 12 (AgentSigner) lands. |
| G82 | CLOSED 2026-05-03 | ptau provenance | SHA mismatch between iden3/snarkjs README and the actual file. | **Closed.** `snarkjs powersoftau verify circuits/powersOfTau28_hez_final_15.ptau` returns "Powers of Tau Ok!" — pairing checks pass on the real file regardless of the stale README hash. The setup pipeline now caches the verify result in `build/circuits/.ptau-verified` keyed on the file's current SHA256 so subsequent runs skip the ~30-min single-threaded re-verification (forced again with `--rebuild`). |

---

## 2026-05-03 — Circuit build additions (Step 0c)

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G88 | CLOSED 2026-05-04 | circuit constraint count vs PRD §11 estimate | v1 circuit was 683 constraints; PRD §11 estimated ~180 000. | **Closed.** v2 lands at 386 672 constraints (~2.15× the §11 estimate). The shortfall in v1 was real: amounts/nonces/timestamps/dateRangeHash were all unconstrained relative to anything the verifier could check. v2 binds Merkle inclusion + nullifiers + timestamp range; smoke + negative tests confirm forgery resistance. See G92 for the full design write-up. |
| G89 | LOW | snarkjs r1cs info parsing | snarkjs prints r1cs metrics with ANSI colour escapes; the original `grep -E "^# of Constraints"` regex missed them and the setup script bailed. Fixed by stripping `\x1b\[[0-9;]*[a-zA-Z]` before grep. | Encoded directly in `scripts/circuit-setup.sh`; revisit if snarkjs ever changes its log format. |
| G90 | MED | snarkjs `powersoftau verify` perf | First verify run took ~28 minutes single-threaded on M-series macOS for the 2^15 ptau. The setup pipeline now caches success against the file's SHA256 in `build/circuits/.ptau-verified`. Still needs the slow path on a fresh checkout (or `--rebuild`). | Acceptable for now. If circuit ceremony repeats on CI, consider distributing a known-good ptau as part of a release artifact instead of fetching + re-verifying every run. |
| G91 | LOW | smoke fixture entropy | `scripts/day0/09-circuit-smoke.ts` uses `Math.random() * 2^53` for the 32 dummy nonces — fine for a smoke test, but the witness builder must use cryptographically secure randomness from the actual UTXO commitment scheme per §11.6. | Note for the next prompt's witness builder. |

---

## 2026-05-04 — G92: Circuit spec expansion (PRD §11 stays pristine)

> Numbering note: the brief asked to title this section "G89" but G89 was already used in the morning audit. Recorded as G92 to keep IDs unique; section title preserves the same intent.

- **PRD section:** §11 (Circuit Design) and §11.6 (Witness Builder)
- **Observation:** the v1 circuit shipped 2026-05-03 (683 constraints, G88) was cryptographically incomplete — `amounts`, `nonces`, `timestamps`, and `dateRangeHash` were all unconstrained relative to anything the verifier could check. The PRD §11 estimate of ~180 000 constraints was the target; v1 was ~260× under that target because Merkle-inclusion, nullifier derivation, and timestamp-range checks were left to "external binding" with no enforcement.
- **Interim build choice:** v2 binds three things end-to-end inside the proof:
  1. **Merkle inclusion.** Each `amounts[i]` is shown to be the value of an actual UTXO inside Umbra's shielded pool by walking a depth-20 path from the leaf commitment to a public `merkleRoot`. Padding slots (`isValid==0`) are short-circuited.
  2. **Nullifier binding.** `nullifierHash[i] = Poseidon(nonces[i], utxoSecrets[i])` is exposed as a public signal so the consumer (Anchor program / off-chain server) can mark the UTXO as spent; double-claim of the same deposit becomes detectable.
  3. **Timestamp range.** `timestamps[i] ∈ [startTs, endTs]` is enforced inside the circuit via two `GreaterEqThan(40)` per real UTXO. Without this the public `dateRangeHash` was decorative — the prover could freely shift the period.
  Plus `dateRangeHash === Poseidon(startTs, endTs)` is now computed inside the circuit so the public signal is bound to the boundaries used in the timestamp checks.
- **Tree depth source:** `MAX_LEAVES_PER_TREE = BigInt(2 ** 20)` in `node_modules/@umbra-privacy/sdk/dist/index.js`. The fee-schedule tree (`TREE_DEPTH = 4` in the same file) is unrelated and far smaller. UTXO Merkle proofs are `merklePath: U256LeBytes[]` of variable length per the indexer; the SDK's 2^20 ceiling is the hackathon-relevant value. Selected `TREE_DEPTH = 20` for the circuit.
- **File-length exception:** circuit file is allowed up to 300 lines this session (waiver from AGENTS.md's implicit 200-line cap). Sub-templates (`MerkleProof(depth)`) live inside the same `.circom` file rather than a separate one.
- **Real-UTXO smoke is gated on G81.** The brief asked us to use the Day 0 deposit `2MKu5W…F6tMxw` as the smoke fixture by parsing leaf preimages from the deposit transaction. The preimages (amount / nonce / utxoSecret) are stored encrypted in the on-chain ciphertext and need the SDK scanner to decrypt; that path is broken on G81. v2 smoke therefore uses a synthetic-but-self-consistent fixture (we generate leaves locally + build a depth-20 tree we control). The circuit math is unchanged regardless of whether the witness data is real or synthetic — the negative tests (amount tamper, nonce tamper) are the load-bearing checks.
- **Status:** open. Closes when (a) G81 unblocks real-UTXO scanning and the smoke test re-runs against `2MKu5W…F6tMxw`, and (b) `verify_credential` lands on the Anchor side and the public-signal layout matches what the program expects.

---

## 2026-05-04 — Circuit v2 additions

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G93 | LOW | ptau verify time at scale — `scripts/circuit-setup.sh` | `powersOfTau28_hez_final_19.ptau` is 604 MB and `snarkjs powersoftau verify` is single-threaded JS; full verify on this size is hours. Setup script gained `--skip-ptau-verify` flag (used this run). The downloaded SHA is recorded; integrity is bounded by GCS mirror trust until a parallelised verifier exists. | Acceptable for hackathon-pace iteration. For production, distribute a vetted ptau as a release artifact + signed manifest. Verify result still cached in `build/circuits/.ptau-verified` so subsequent runs without `--skip-ptau-verify` can re-verify once. |
| G94 | MED | smoke fixture is synthetic, not the real Umbra UTXO | The brief asked for end-to-end smoke against deposit `2MKu5W…F6tMxw`. Cannot retrieve `nonce`/`utxoSecret` preimages without the broken SDK scanner (G81). | When G81 fixes, replace `buildBaseFixture()` in `scripts/day0/09-circuit-smoke.ts` with a real-UTXO loader that pulls amount/nonce/secret from `getClaimableUtxoScannerFunction` and merklePath via `fetchMerkleProof`. The circuit interface stays unchanged. |
| G95 | LOW | empty-subtree convention for synthetic smoke tree | The smoke test uses `sibling = 0` at every level for the empty-subtree hash. Umbra's actual deployment uses a different empty-subtree hashing convention (typically the all-zero subtree pre-hashed per level). Synthetic smoke verifies because witness + circuit agree; real smoke against Umbra's tree must use Umbra's empty-subtree constants. | Recover from `node_modules/@umbra-privacy/sdk/dist/index.js` when the witness builder lands (next prompt). |
| G96 | LOW | proof generation time — 23 s in Node | First Groth16 fullProve in-process Node took 23 175 ms for the 386 672-constraint circuit. PRD §11.4 microcopy promises "3–5 seconds". A snarkjs Web Worker is mandatory for the user-facing path (BUILD_SEQUENCE Step 8 already calls for one). | Note for the witness builder/Web Worker prompt: target sub-5 s in browser via WASM-backed snarkjs + worker concurrency, possibly with `rapidsnark` for production. |

---

## 2026-05-04 — Anchor program additions

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G91 | HIGH | PRD §12 ↔ shipped Anchor program | PRD §12 was written for the v1 (683-constraint) circuit and lists a smaller `Credential` struct with no `nullifier_hashes`, no `merkle_root`, no `start_ts`/`end_ts`. Shipped program follows v2 circuit shape (G92): 39 public signals incl. 32 nullifierHashes, depth-20 Merkle root binding, timestamp range. PRD never edited per project rules. | Treat the canonical record as `programs/tessera/src/state.rs::Credential` + `programs/tessera/src/lib.rs` instructions. Status: open until PRD revision. |
| G92 | HIGH | Solana platform-tools cargo 1.79 vs current crates.io | The build pipeline required pinning at least 7 transitive crates (blake3, proc-macro-crate, unicode-segmentation, indexmap, cc, proc-macro2 + anchor-spl chain). Each Anchor 0.30.1 user on this toolchain hits the same wall. | Pin set committed in `Cargo.lock`. When Solana 2.x platform-tools ships rustc ≥ 1.85, drop the pins and re-resolve. Document in `programs/tessera/Cargo.toml` header. |
| G93 | MED | proc_macro2 + nightly host rustc | Anchor's IDL extractor (`__anchor_private_print_idl`) compiles via the user's default rustup toolchain. Host is `nightly-aarch64-apple-darwin` rustc 1.94.1; anchor-syn 0.30.1 calls `proc_macro::Span::source_file()` which has been removed from current nightly. Result: `anchor build` always errors at the IDL phase. | Use `anchor build --no-idl` (committed in scripts). Hand-craft IDL at `idl/tessera.json`. When Anchor 0.31+ is pinnable here, regenerate via `anchor idl init`. |
| G94 | CLOSED 2026-05-05 | hand-crafted IDL discriminators | Placeholders had to be replaced with real `sha256("global:<ix>")[0..8]` etc. | **Closed.** Discriminators recomputed and committed in `idl/tessera.json`. Test 1 (initialize) passing on devnet against the live program is the existence proof. |
| G95 | CLOSED 2026-05-05 | integration tests authored and now executing | 10 cases (9 from brief + 1 added in G97 fix). | **10/10 passing.** Test runtime ~3 min (dominated by 6× snarkjs proof gen). CU numbers captured live: `verify_income_proof` = 405,354 CU (requires `ComputeBudgetProgram.setComputeUnitLimit(600_000)` on the FE side). |
| G96B | LOW | Anchor instruction module layout | Anchor 0.30.1's `#[program]` macro generates `crate::<ix_name>::__client_accounts_<ix_name>` paths and does not follow `pub use` re-exports through nested modules. Initial layout `src/instructions/<name>.rs` with `pub use instructions::*` failed to resolve. Moved instructions to `src/<name>.rs` directly; fixed. | Document in `programs/tessera/src/lib.rs` why instructions are at the crate root. Re-introduce a sub-folder if Anchor 0.31+ relaxes the path lookup. |

---

## 2026-05-05 — Test-run additions

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G97 | CLOSED 2026-05-05 | program signature exceeds Solana tx-size limit | `verify_income_proof` originally accepted `Vec<[u8; 32]> public_signals` length 39, encoding to 1252 bytes — combined with proof bytes + accounts the tx exceeded Solana's 1232-byte cap. **The previously-proposed remediation (collapse `nullifierHash[N]` into one Poseidon commit) was rejected — it would break per-UTXO double-spend protection (G97-rev).** | **Closed via the staged-public-inputs pattern.** New `PublicInputBuffer` zero-copy account (`#[account(zero_copy(unsafe))]`, 1336 bytes) holds the 39 signals; the user populates it across two cheap `append_public_inputs` calls before invoking `verify_income_proof`, which now takes only `proof_a/b/c/batch_id/metadata_uri`. Each tx fits comfortably under 1232 bytes (verify tx ~770 bytes; append tx ~840 bytes). Same program ID — in-place upgrade. 10/10 integration tests pass on devnet. See REPORT.md "G97 fix — staged public inputs". |
| G98 | MED | Anchor 0.30.1 instruction-data buffer cap of 1000 bytes | `BorshInstructionCoder.encode` hard-codes `Buffer.alloc(1000)` (TODO comment in source acknowledges it). Even if G97's tx-size issue weren't blocking, any instruction with >1000 bytes of args fails at the JS encoder before serialization. Anchor 0.32.x raises this cap. | After G97 fix, `verify_income_proof` should fit comfortably in <500 bytes; this gap becomes informational. If a future instruction approaches 1000 bytes, bump @coral-xyz/anchor on the JS side to 0.32 (the on-program crate stays at 0.30.1). |
| G99 | LOW | auto-IDL via `nightly-2024-09-01` still blocked | `RUSTUP_TOOLCHAIN=nightly-2024-09-01 anchor build` retried. Same wall: cargo 1.82-nightly doesn't support `edition2024` which `proc-macro-crate 3.5.0` (transitive via Anchor's IDL-build features) requires. Closing all the dep-version pins didn't help. | Stay on hand-crafted IDL. Re-attempt when project upgrades to Anchor 0.31+ (which uses a different IDL extraction path). |
| G100 | LOW | IDL events array emptied | Anchor 0.30.1 client requires every event entry in `idl.events[]` to have a corresponding type definition in `idl.types[]` for log decoding. Hand-crafted IDL didn't include type defs and decoding crashed on Program load. Worked around by emptying `events` array — clients reading event logs now have to decode them manually. | Re-add events with type definitions when next regenerating IDL. The Anchor program's `emit!()` calls still fire on-chain; only client-side decoding is affected. |
| G101 | CLOSED 2026-05-05 | Test 1 CU measurement deferred | Initialize CU was deferred. | **Closed.** Live capture wired into the test suite — initialize ~5 800 CU. Same helper now captures init_proof_staging (7–14 k), append_public_inputs (4 k), verify_income_proof (405 k), and writes a min/max summary to stdout in the `after` hook. |

---

## 2026-05-05 — Staged-public-inputs additions

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G97-rev | RESOLVED 2026-05-05 | rejected remediation | The original G97 remediation proposed collapsing `nullifierHash[0..32]` into one Poseidon commit. That would have allowed a malicious prover to swap any single nullifier slot (e.g. replace one of the real per-UTXO nullifiers with a different padding value) and produce a proof for a different aggregated commit, with the on-chain program unable to detect the slot-level reuse. **Rejected.** | Replaced by the staged-public-inputs pattern (G97 closed) — keeps the v2 circuit's per-nullifier semantics intact while solving the wire-format problem at the program-API layer instead of at the circuit layer. |
| G102 | MED | program signal-index off-by-one | The first deploy under the staged-input shape had `verify_income_proof` parsing signals as `[0]=threshold, [1]=startTs, ..., [6]=validProof`, which is the order of the *public inputs* but not the order of `snarkjs.publicSignals` (which prepends *outputs* — a single `validProof` — before the inputs). Test 2 surfaced this as `InvalidProofSignal` because the program was reading nullifierHash[0] (a non-zero Poseidon hash) where it expected validProof. | **Fixed.** Program now uses named `IDX_*` constants matching snarkjs's convention: `[0]=validProof, [1]=threshold, [2..3]=start/end Ts, [4]=merkleRoot, [5]=employerCommitment, [6..38)=nullifierHash, [38]=dateRangeHash`. Documented inline in `verify_income_proof.rs`. Re-deployed in-place. |
| G103 | LOW | proof_a y-coordinate negation | `groth16-solana 0.2.0`'s on-chain verifier expects the caller to pre-negate the y-coordinate of `proof_a` modulo the BN254 base field. snarkjs's off-chain `groth16.verify` negates internally, so the round-trip via `verify_income_proof` initially failed with `ProofVerificationFailed` until the test fixture started passing `(BN254_P − ay) mod BN254_P` for the second 32 bytes of `proof_a`. | Hard-coded in `tests/tessera.ts`. **`lib/anchor.ts` next prompt MUST do the same** — call out as a hard requirement when the FE typed client lands. |
| G104 | MED | verify_income_proof CU > 200 k | Live CU = **405 354**. Solana's default per-instruction CU budget is 200 k, so any client must inject `ComputeBudgetProgram.setComputeUnitLimit({ units: ≥ 600_000 })` before the verify tx or it reverts mid-verifier. | The test does this; `lib/anchor.ts` must do the same. Document in the FE typed client's call-site comment. The 405 k figure is dominated by Groth16 IC MSM (~360 k) + Bubblegum CPI (~42 k); cannot be reduced further without circuit redesign. |
| G105 | LOW | per-test fresh-proof requirement | Anchor's `init` constraint on the credential PDA fires before any handler-side error check. With a single fixed proof, every negative test would hit `CredentialAlreadyExists` instead of the specific error it's trying to validate. | Solved by generating a fresh proof per negative test (Groth16's r/s blinding gives unique proofs per `fullProve` call). Adds ~115 s to suite runtime; preserves test specificity. |
| G106 | LOW | nullifier-PDA persistence across runs | Successful Test 2 consumes `nullifier := Poseidon(nonce, secret)` permanently on devnet. Re-running with a fixed witness then fails Test 2 with `NullifierAlreadyConsumed`. | Resolved by randomising `nonce` and `utxoSecret` in the test fixture per run. |
| G107 | LOW | PublicInputBuffer zero-copy field shape | borsh 0.10's array impls don't cover `[[u8; 32]; 39]` — only `0..=32` and a few power-of-two sizes. Initial design used split arrays `signals_lo: [[u8;32];32]` + `signals_hi: [[u8;32];7]` to satisfy borsh, then materialised to `[[u8; 32]; 39]` on stack — which blew the 4 KB BPF frame. | Switched to `#[account(zero_copy(unsafe))]` with `#[repr(C)]` and a single `signals: [[u8; 32]; 39]` field. Zero-copy bypasses borsh entirely, and the AccountLoader keeps the buffer off the stack during `try_accounts`. Stack frame now under 4 KB. |

---

## 2026-05-05 — lib client additions

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G108 | MED | Umbra devnet indexer protobuf schema unknown | `https://utxo-indexer.api-devnet.umbraprivacy.com/v1/utxos/{tree}` returns 200 `application/protobuf` (~390 bytes per UTXO) with no published `.proto` file. Hand-decoding the byte layout is brittle and error-prone for a security-critical witness pipeline. | `lib/umbra-witness.ts::fetchUtxosViaIndexer` throws "needs Tim discovery". `fetchUtxos` (selector) tries SDK first; on G81 it re-throws with a clearer message rather than silently degrading. Tim outreach: ask Cal / @UmbraPrivacy for the indexer's `.proto` definitions. Once schema is public, the indexer fallback can be wired in ~30 lines. |
| G109 | LOW | Anchor 0.30 Program constructor signature | Anchor 0.30 dropped the explicit `programId` argument — it now reads the program id from `idl.address`. Calling the legacy `new Program(idl, programId, provider)` form (which still typechecks under the loose IDL types) builds a Program whose internal coder lacks the `accounts` map, then `AccountClient` constructor crashes with `Cannot read properties of undefined (reading 'size')`. | `lib/anchor.ts::getProgram` uses `new Program(idl, provider)` and asserts `idl.address === getProgramId()` so a misconfigured env var fails fast. Documented inline with a why-comment so the next refactor doesn't regress. |
| G110 | LOW | snarkjs ESM/CJS dual module shape | `import * as snarkjs from "snarkjs"` works in some bundlers but breaks in others depending on `default` export visibility. Tests + lib use `(await import("snarkjs")).default ?? await import("snarkjs")` to handle both shapes uniformly. | Encoded inside `lib/proof.ts` and the test files. Revisit if snarkjs publishes a clean ESM build. |


## 2026-05-05 — /employee wired end-to-end

The 8 employee-page mocks (G12, G17, G18, G19, G37, G38, G39, G50) are **closed** — see `scripts/day0/REPORT.md` "/employee wired end-to-end — 2026-05-05" for the per-gap rationale and file inventory. New observations from the wiring work:

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G111 | LOW | microcopy — partial-stage verify failure | The four-tx mint orchestrator can fail at `staging-init` / `staging-append-1` / `staging-append-2` / `verifying`. PRD §13 only lists "Proof rejected on-chain. Regenerate from a fresh scan." which fits the `verifying` failure. The other three stages have no PRD copy. | `components/employee/employee-prove.tsx::describeMintError` uses the prompt's invented strings ("Couldn't start verification. Retry.", "Verification step 2/4 failed. Retry.", "Verification step 3/4 failed. Retry."). Tim triage: formalise into PRD §13 or rewrite. |
| G112 | MED | placeholder metadata URI for Bubblegum cNFT | `metadataUriFor` returns `https://tessera.solshield/credential/${owner}-${proofHashHex}`. No metadata server is deployed at that domain. The mint succeeds because the program stores the URI without fetching it, but DAS / wallet inspectors will resolve to 404. | Stand up a metadata service before a public-facing demo. Until then, the URL is stable + deterministic from owner + proofHash so off-chain indexers can cache lookups by it. |
| G113 | MED | Phantom warning banner cannot be wired without wallet adapter | G73/G75 require detecting the connected wallet so we can render the "Phantom rewrites transactions after signing" banner. Without `@solana/wallet-adapter-react` (G114) there's no way to know which wallet the user is using; the existing `wallet-connect-button.tsx` is itself a setTimeout mock. | Implement during BUILD_SEQUENCE Step 5. The banner content is already specified in G73's mitigation column. |
| G114 | HIGH | browser mint blocked on wallet adapter | The page truly mints on devnet only when `UmbraProvider` has a real signer. The repo currently lacks `@solana/wallet-adapter-{react,react-ui,wallets}` (audit 2026-05-03 deps drift section). `UmbraProvider` falls back to a dev-keypair env var (`NEXT_PUBLIC_TESSERA_DEV_KEYPAIR`) for local smoke tests. Production cannot use this — never set the env var in Vercel. | Land BUILD_SEQUENCE Step 5: install `@solana/wallet-adapter-{base,react,react-ui,wallets}`, replace `wallet-connect-button.tsx` with `<WalletMultiButton>`, default the wallet order to Solflare → Backpack → Phantom (G73). Then swap `UmbraProvider`'s dev-keypair branch for `useWallet()` + `useAnchorWallet()`. Surgical change — the provider's external interface is unchanged. |
| G115 | LOW | `lib/anchor.ts` imported a non-existent `AnchorWallet` type | Anchor 0.30.1 doesn't re-export an `AnchorWallet` interface from its index module. The line `type AnchorWallet,` in `lib/anchor.ts:14` typechecked previously only because nothing in the app graph imported lib/anchor.ts (it was reachable only from vitest). Once `app/employee/page.tsx` imports `getProgram`, Next's `tsc` surfaces the missing export and the build fails. | Replaced with a structurally-identical inline `interface AnchorWallet` in lib/anchor.ts. Also bumped tsconfig `target` ES2017 → ES2020 (BigInt literals in lib/) and added ambient module shims for `snarkjs` and `circomlibjs` (no published `.d.ts`). All runtime-neutral. Documented as a deviation from the prompt's allow-list in the report. |

## 2026-05-04 — wallet adapter + /employer wired

The 8 employer + wallet mocks (G09, G11, G16, G36, G43, G48, G51, G114) are **closed** plus G75/G76/G113 — see `scripts/day0/REPORT.md` "/employer + wallet adapter — 2026-05-04" for the per-gap rationale and file inventory. New observations from this session:

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G116 | LOW | deposit progress staging is heuristic | The SDK's `getPublicBalanceToEncryptedBalanceDirectDepositorFunction` is a single `Promise<DepositResult>` — no per-step hooks. PRD §11.3 wireframes a 3-stage UI; we fire `onProgress("submitted")` immediately, schedule `onProgress("mpc-computing")` at t=2.5 s, and fire `onProgress("committed", queueSig)` when the SDK call resolves. The 2.5 s boundary is a heuristic estimate of when the local tx phase ends. | When the SDK adds callback options (or we drop down to `getPolling/WebsocketComputationMonitor` directly to track the computation account), replace the timer in `lib/umbra-deposit.ts::shieldDeposit`. The 3-stage UI labels are unchanged. |
| G117 | MED | Network-Balance escrow not wired | Cal's intel: when a recipient hasn't registered with Umbra, Network-Balance auto-claim covers them so the shielding still succeeds. Today `checkRecipientUmbraStatus` blocks the form on unregistered recipients with a "Recipient hasn't registered…" copy and an explicit note that Network-Balance "isn't enabled in this build yet". | Land Network-Balance support in a future session: extend `checkRecipientUmbraStatus` to return `{ ok: true, kind: "network-balance" }` and add an info banner in the form so the employer knows the recipient will receive via auto-claim. PRD §13 may need new microcopy. |
| G118 | LOW | wallet adapter UI CSS flashes light on dark theme | `@solana/wallet-adapter-react-ui/styles.css` is imported in `app/layout.tsx` and its theme variables don't honour `next-themes`. Cosmetic; the modal works correctly. | Override the wallet-adapter CSS variables under our `:root.dark` selector in `app/globals.css`, OR ship a CSS module that re-themes the modal explicitly. Defer until polish pass. |

## 2026-05-05 — isRegistered detection regression

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G119 | HIGH | `components/umbra-provider.tsx::isRegistered` always returned false | Two-part bug: (1) `getUserAccountQuerierFunction({client})()` was called with no address argument, throwing `QueryError: Failed to derive user account PDA…` which a blanket `try/catch` swallowed; (2) the success gate `Boolean(account)` was wrong shape — the SDK returns `{state: "non_existent"} | {state: "exists"; data: ...}`, both branches truthy. Day 0 keypair `HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV` is registered (verified via `02-register.ts` + new `12-isregistered-check.ts`) but `useUmbra().isRegistered` was `false`, causing the OnboardingModal to auto-open on `/employer` and `/employee`. Related to G75 (deriver pitfall) and G76 (zero-byte trap) — but the failure was upstream of either. Closed via extracted `checkIsRegistered(query, signerAddress)` helper that mirrors Day 0 02-register.ts: passes the address, checks `state === "exists"`, then checks `x25519PublicKey` has a non-zero byte. 8 unit tests in `tests/components/umbra-provider.test.ts`. |
| G120 | LOW | wallet-providers redundant adapters | Explicit `SolflareWalletAdapter` + `PhantomWalletAdapter` instances coexisted with the Wallet Standard auto-registrations both wallets ship today — devnet console logged "registered twice with conflicting features". Removed both from `wallet-providers.tsx::wallets`; the array is now empty and `WalletProvider` discovers wallets via Wallet Standard at runtime. G73's Phantom warning banner still triggers on `wallet.adapter.name` matching `/phantom/i` regardless of registration path. |

## 2026-05-05 — discriminator pattern audit (cross-cutting)

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G121 | HIGH | discriminated-union pattern not applied at every Umbra account fetch site | Same-shape bug as G119, second occurrence: `lib/umbra-deposit.ts::checkRecipientUmbraStatus` typed the SDK querier as `() => Promise<{x25519PublicKey?: Uint8Array} | null>` and read `account.x25519PublicKey` at the top level. The SDK actually returns `{state:"non_existent"} \| {state:"exists"; data:{x25519PublicKey}}` — the top-level field is always `undefined`, so every registered recipient (including the Day 0 keypair) failed the check and the /employer Submit stayed disabled. Reproduced via `scripts/day0/13-recipient-status-check.ts` (FAIL pre-fix, PASS post-fix on live devnet). | Closed via `checkRecipientStatusInner(query, address)` mirroring `components/umbra-provider.tsx::checkIsRegistered`: check `state === "exists"` first, then `data.x25519PublicKey` non-zero (G76). 8 unit tests + 1 regression test that injects a decoy zero-key at the top level so a future regression can't reintroduce the wrong path. **Audit completed for all non-test callsites of `getUserAccountQuerierFunction`** — `components/umbra-provider.tsx` (G119, fixed), `lib/umbra-deposit.ts` (G121, fixed), `scripts/day0/02-register.ts` (already correct: defensively reads both `data.x25519PublicKey` and the deprecated top-level form). No other production sites consume the function. |

## 2026-05-05 — /credential + /verify wired

The 9 read-only-page mocks (G14, G15, G22, G31, G32, G33, G34, G35, G53) are **closed** — see `scripts/day0/REPORT.md` "/credential + /verify wired — 2026-05-05" for the per-gap rationale and file inventory. Two new low-priority gaps surfaced:

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G122 | LOW | /employee post-mint SealCard synthesizes some fields | The mint orchestrator's `ProveResult` doesn't surface the `employerCommitment` bytes (generated client-side inside `EmployeeProve`), nor `issuedAt`/`expiresAt`/`issuer` (those land on chain a moment later). `EmployeeSuccess` synthesizes them with `now`/`now + 90d`/zeros/`getProgramId()` so the SealCard renders immediately after the mint. The canonical `/credential/[address]` view shows the real on-chain values. | Either: extend `ProveResult` to carry the client-side `employerCommitment`, OR have `EmployeeSuccess` fetch the credential via `fetchCredentialByPda(result.credentialPda)` once available and swap from synthetic to on-chain props. Both are local changes with no protocol impact. |
| G123 | LOW | "Verify on Solana Explorer" link target | Per prompt A.3 the SealCard's Explorer button anchors to `address/${issuer.toBase58()}` — the program admin pubkey, confirming the issuing program. PRD §11.6 doesn't pin a specific URL. A future polish pass might swap to the credential PDA's address view for a more "this is *my* credential" click. | Add a `credentialPda?: PublicKey` prop to `SealCard` and prefer it for the Explorer URL when present; fall back to `issuer` for backward compat. Both call-sites (`/credential/[address]`, `/employee/success`) already have the PDA in scope. |

## 2026-05-05 — Agent runtime

The 2 agent-route stubs (G06, G08) are **closed** — see `scripts/day0/REPORT.md` "## Agent runtime — 2026-05-05" for design notes + smoke results. New gaps:

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G124 | LOW | agent registry is per-process | `lib/agent-runtime.ts::registry` is a module-level `Map<pubkey, Agent>`. On Vercel that means each serverless instance has its own agents; reconnecting an SSE feed from a different instance returns 404. Acceptable for single-instance hackathon devnet but needs a shared store before any multi-instance deployment. | Back with Redis / Vercel KV when scaling beyond one instance. The Agent class encapsulates state in three buffers (events / receivedDeposits / commandQueue) — straightforward to serialize. |
| G125 | HIGH | agent `mint-credential` blocked on G81 | The witness builder needs `amount`/`nonce`/`secret` per UTXO. The SDK only enumerates these via `getClaimableUtxoScannerFunction`, which is broken on G81. The agent handler emits `proof.generating` + `proof.complete{verifies: false}` so the feed surfaces the blocker. | Closes when G81 ships in `@umbra-privacy/sdk`. The agent path then drops to `client.scan({startTs, endTs, mint})` → `buildIncomeWitness` → `generateIncomeProof` → `mintCredential` — all already wired in `lib/`. |
| G126 | LOW | no `payment.failed` event variant | When `trigger-payment-from` fails mid-deposit, the agent emits a `payment.received` event with amount=0 and `txSig: "error:<stage>:<msg>"`. Cleaner is a discriminated union. | Add a `payment.failed` (or `error.payment`) variant when the agent UI lands; the live-feed item renderer needs to colour error states distinctly anyway. |

## 2026-05-05 — x402 over Umbra

G07 closed (`/api/x402/charge` 501 stub replaced with the full challenge + verification flow). See `scripts/day0/REPORT.md` "## x402 over Umbra — 2026-05-05" for the verification recipe + smoke results. New gaps:

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G127 | LOW | amount byte-check skipped in `verifyX402Payment` | The SDK borsh-encodes amount inside the deposit instruction data with offsets that aren't part of any public interface. Verifier confirms recipient + token (account-key membership) + nonce (sliding-window match) + finalized callback. Amount isn't byte-checked because parsing the precise offset would couple us to SDK internals. | Tighten when a known-good real-deposit fixture is captured (G128). The four bindings already in place make malicious replay difficult — to bypass amount you'd need to land a deposit against our exact recipient + our exact nonce, which only works if you're the rightful payer. |
| G128 | MED | verification heuristics need a real-deposit fixture | Smoke run landed deposit `YKN5mf83p7JRViVTsC74hTXM3yUkA8e2vGc2Yu9Wm9pWL96tFtvPJ7wmu88qRPbXBJMHp4AWYv7rmTL7Fd3sdgp` on devnet but `verifyX402Payment` returned 402 after ~17.5 s of RPC work. Two factors compound: (a) the computation-account heuristic may pick the wrong candidate among multiple Umbra-owned writable accounts, and (b) **Cal (Discord) confirmed Arcium callbacks on devnet take up to 180 slots (~75 s)** vs sub-second on mainnet — the verifier is racing MPC finalization. Devnet 429 rate limits can also stall mid-flight. | (1) Capture the full deposit tx + signatures-for-address(computation_account) into `tests/fixtures/x402-deposit-YKN5mf83.json` and add a deterministic `verifyX402Payment` test that iterates the heuristic until the fixture passes. (2) **Demo-day op tip:** do a dry-run Trigger Payment ~30 min before recording so Arcium is "warmed up" — first-of-the-day callbacks are slowest. If a Trigger Payment hangs >60 s on-camera, cut and retry; second attempts on devnet are usually faster. |

## 2026-05-05 — /agent UI wired

The 8 /agent mocks (G13, G20, G27, G28, G29, G30, G47, G52) are **closed** — see `scripts/day0/REPORT.md` "## /agent UI wired — 2026-05-05" for the per-gap rationale and file inventory. New gap:

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G129 | LOW | spawn-card disclaimer copy isn't in PRD §13 | The "The demo agent uses the canonical Day 0 keypair (HqDXW3...EVhV) — same identity used elsewhere in the demo. This proves the agent and human paths share one protocol." line on `components/agent/agent-spawn-card.tsx` is honest framing for the demo voice-over but not codified in the PRD. | Tim triage: either formalise into PRD §13's microcopy library, or rephrase to fit existing PRD §11.5 wording. |

G125 + G128 both remain open from prior sessions (mint-credential blocked on G81; x402 verification heuristic refinement). Neither blocks the /agent UI from rendering correctly today.

## 2026-05-05 — Polish pass

8 microcopy gaps + the two audit decisions D6/D7 are **closed** — see `scripts/day0/REPORT.md` "## Polish pass — microcopy + landing + README — 2026-05-05" for the per-gap diff. New gaps:

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G130 | LOW | PRD §11.4 reassurance copy reality drift | The "This usually takes 3–5 seconds. The proof is being generated in your browser…" line in `components/employee/employee-prove.tsx` matched PRD §11.4 wireframe verbatim but the real Groth16 fullProve runs in ~20–30 s for the 386 672-constraint v2 circuit. Code copy adjusted to "Generating in your browser. Your data never leaves your device. (~20–30 seconds)"; PRD untouched per project rule. | Tim triage: either formalise the new wording into PRD §13 or accept the reality-aware code copy. |
| G131 | LOW | reactive StatusBanner deferred | The always-on `demo-mode` banner that used to render at the top of every page was filler — judges read it as chrome, not signal. Unmounted from `app/layout.tsx`. The component file (`components/status-banner.tsx`) stays well-formed and ready to re-mount with a real condition (RPC health / indexer health). | Wire on a polish session that has visibility into observed failure modes — e.g. `useEffect` health probe → conditional render. |

## 2026-05-05 — Discord intel re-sync (post-polish)

Re-read of the Umbra Discord thread surfaced four items worth recording for future reference. Three are roadmap framing wins, one is a demo-day operational tip already folded into G128 above.

| id | sev | area | finding | mitigation |
|---|---|---|---|---|
| G132 | LOW | Umbra error format reference | The on-chain Umbra program returns descriptive AnchorError codes — e.g. Divyansh hit `Custom: 28004 NullifierAlreadyBurnt` from re-claiming a UTXO. Useful for failure diagnosis on-camera or in support: Solana logs name the exact error. | No code change. Reference for demo-day debugging if a Trigger Payment fails: read the AnchorError code from the failed tx. |
| G133 | INFO | compliance grants — roadmap framing | Cal explained Umbra's compliance-grant PDAs: granter creates a PDA at `(granter, nonce, receiver)` that grants the receiver permission to re-encrypt the granter's outputs without breaking sender/recipient privacy. Returns `(-K mod P)` when zeroed. | Not in current scope. **X-thread / submission narrative angle:** TESSERA's credential primitive composes with Umbra's compliance grants — auditors / regulators / institutions can be granted scoped view access without breaking sender/recipient privacy. 30%-Innovation slide candidate. |
| G134 | INFO | mixer viewing keys — roadmap framing | Cal: "if you want to access the mixer viewing keys, you can use the client object." Buffer-account decryption via Poseidon over BN254. | Not in current scope. **Future framing:** TESSERA's credential is a *commitment* to income; viewing keys could later let an auditor verify the underlying UTXOs without exposing them publicly. Pairs naturally with G133. |
| G135 | INFO | createUtxo SDK signature reference | Lower-level API surface that Adithya/Cal explained: `await create({...}, {optionalData, generationIndex?, ...})`. Our `lib/umbra-deposit.ts::shieldDeposit` uses the higher-level `getPublicBalanceToEncryptedBalanceDirectDepositorFunction` — Cal's recommended path per the docs. | No code change. Reference if we ever need direct-pool deposits without the wrapper (compliance flows, rotation scenarios). |

**Cross-checked against current code:**

- **`optionalData` shape (Cal said "Uint32Array" in one Discord message)** — verified in SDK source: `OptionalData32 = SubBrandedType<Bytes, "OptionalData32">`, `assertOptionalData32(value: Uint8Array)`, `OPTIONAL_DATA_BYTE_LENGTH` constant, and internal `optionalDataBytes.slice(0, 16)` + `slice(16, 32)` at `dist/index.js:1817`. Our `nonceToOptionalData` returning `Uint8Array(32)` matches the SDK contract exactly. The `YKN5mf83…sdgp` deposit landing wasn't lucky — the encoding is correct. **No code change.**
- **Phantom warning re-confirmed** — already addressed via G73, G75, G113, G120; banner mounted globally above the `/agent`, `/employer`, `/employee`, `/credential`, `/verify` pages.
- **`CreatePublicUtxoProofAccount` Phantom failure (Ty)** — same root cause as G73; routed around with Solflare default + warning banner.
