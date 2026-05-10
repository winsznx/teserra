# BUILD_SEQUENCE.md

Order rule: deepest dependency first. Circuit + Anchor program land before lib/umbra wiring lands before component mock swaps. Nothing builds on a missing artifact.

Session estimate ≈ 1 focused hour.

---

## Step 1 — Verify upstream artifacts (out-of-repo)
- **Goal:** confirm Engineering §11 circuit (`income_proof.circom` + `.wasm` + `.zkey`) and §12 Anchor program (deployed program ID, IDL) exist before any FE wiring.
- **Files touched:** none in this repo (external check).
- **Gaps closed (prereq):** unblocks G01, G02, G03, G12, G14, G15.
- **Stop condition:** known program ID, IDL JSON in hand, circuit artifacts URL (or local path).
- **Sessions:** 1.

## Step 2 — `lib/anchor.ts` typed program client
- **Goal:** typed Anchor client wrapping the program; replace `TESSERA_PROGRAM_ID_PLACEHOLDER`.
- **Files touched:** `lib/anchor.ts` (new), `lib/constants.ts`, `.env.example` (new), `README.md` env table.
- **Gaps closed:** G56, G64, G65.
- **Stop condition:** importing `program` from `lib/anchor.ts` compiles; `pnpm build` clean.
- **Sessions:** 1.

## Step 3 — Install + scaffold Umbra client
- **Goal:** `lib/umbra-client.ts` + `<UmbraProvider>` wrapping app; install missing PRD §16 crypto deps.
- **Files touched:** `lib/umbra-client.ts` (new), `components/umbra-provider.tsx` (new), `app/layout.tsx`, `package.json`.
- **Deps added:** `bs58`, `@noble/ed25519`, `snarkjs`, `circomlib`, `react-hook-form`, `zod`, `date-fns`.
- **Gaps closed:** part of G54.
- **Stop condition:** provider mounted; `useUmbra()` returns `{ client, address, isRegistered, scan, register }`.
- **Sessions:** 2.

## Step 4 — Wallet adapter
- **Goal:** real `@solana/wallet-adapter-react` modal (Phantom + Backpack + Solflare per PRD §21.2).
- **Files touched:** `package.json`, `app/layout.tsx`, `components/wallet-connect-button.tsx` (rewrite).
- **Deps added:** `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, `@solana/wallet-adapter-wallets`.
- **Gaps closed:** G09, part of G54.
- **Stop condition:** real wallet connection persists `localStorage` (PRD §21.2); disconnect works; truncated label matches PRD.
- **Sessions:** 1.

## Step 5 — Onboarding modal real flow
- **Goal:** real `client.register()` driven by wallet signature; show real `umbraAddress`; gate by `client.isRegistered`.
- **Files touched:** `components/onboarding-modal.tsx`, `components/umbra-provider.tsx`.
- **Gaps closed:** G10, G21, G43.
- **Stop condition:** modal auto-opens for unregistered wallets on `/employer | /employee | /agent`; "User rejected" error path shows PRD §11.2 toast.
- **Sessions:** 1.

## Step 6 — `/api/umbra/*` + `/api/agent/feed` real handlers
- **Goal:** indexer health passthrough, server-side UTXO scan endpoint, SSE feed scaffold.
- **Files touched:** `app/api/umbra/status/route.ts`, `app/api/umbra/scan/route.ts`, `app/api/agent/feed/[pubkey]/route.ts`.
- **Gaps closed:** G04, G05, G08.
- **Stop condition:** `curl /api/umbra/status` → real JSON; SSE stream emits keep-alive.
- **Sessions:** 2.

## Step 7 — Employer shielded payment flow
- **Goal:** real `client.shield()`; recent-payments query with `When` column; remove fake MPC stages.
- **Files touched:** `app/employer/page.tsx` (refactor), `components/new-shielded-payment-form.tsx` (new), `components/recent-payments-table.tsx` (new), `lib/types.ts` (add `Payment`).
- **Gaps closed:** G11, G16, G36, G48, G51.
- **Stop condition:** payment submits real tx on devnet; row appears in table with truncated `Tx` link to Solana Explorer.
- **Sessions:** 2.

## Step 8 — snarkjs Web Worker
- **Goal:** off-thread Groth16 proof generation; load `.wasm` + `.zkey` from Step 1.
- **Files touched:** `workers/snarkjs.worker.ts` (new), `lib/witness.ts` (new), `next.config.ts` (worker loader if needed).
- **Gaps closed:** none directly; unblocks G12, G37.
- **Stop condition:** worker emits valid proof for a fixture witness in dev.
- **Sessions:** 2.

## Step 9 — Employee scan → configure → prove → mint
- **Goal:** full PRD §11.4 flow with real UTXO scan, post-scan confirmation, zero-deposit empty state, real proof gen, real mint.
- **Files touched:** `app/employee/page.tsx` (refactor), `components/employee-scan.tsx` (new), `components/employee-configure.tsx` (new), `components/employee-prove.tsx` (new), `components/employee-credentials-list.tsx` (new), `app/api/proof/generate/route.ts`, `app/api/credential/mint/route.ts`.
- **Gaps closed:** G01, G02, G12, G17, G18, G19, G37, G38, G39, G40, G50.
- **Stop condition:** end-to-end mint produces a credential PDA visible at `/credential/[address]`.
- **Sessions:** 3.

## Step 10 — Credential viewer (server fetch)
- **Goal:** server-component fetch of credential PDA; render `SealCard` with PRD §11.6 labels and subtitle; handle Loading / Not Found / Expired / Revoked.
- **Files touched:** `app/credential/[address]/page.tsx`, `app/api/credential/[address]/route.ts`, `components/seal-card.tsx`, `components/credential-viewer-content.tsx`.
- **Gaps closed:** G03, G15, G22, G33, G34, G35.
- **Stop condition:** `/credential/<minted_pda>` renders correct card; `/credential/<random>` renders empty state with PRD copy.
- **Sessions:** 2.

## Step 11 — Verifier demo (Anchor CPI)
- **Goal:** real `verify_credential` call; copy aligned to PRD §11.7.
- **Files touched:** `app/verify/page.tsx` (refactor), `components/verify-form.tsx` (new), `components/what-just-happened.tsx` (new), `lib/anchor.ts`.
- **Gaps closed:** G14, G31, G32, G53.
- **Stop condition:** known credential resolves to Approved with real expiry; unknown wallet → "No credential found".
- **Sessions:** 1.

## Step 12 — AgentSigner + agent runtime
- **Goal:** `AgentSigner` from `AGENT_PRIVATE_KEY` (server-only); SSE feed of real events; PRD §11.5 microcopy + 4 buttons + "What this demonstrates" block.
- **Files touched:** `lib/agent-signer.ts` (new), `app/api/agent/spawn/route.ts`, `app/agent/page.tsx` (refactor), `components/agent-control-panel.tsx` (new), `components/agent-feed.tsx` (new), `components/what-this-demonstrates.tsx` (new).
- **Gaps closed:** G06, G08 (closure), G13, G20, G27, G28, G29, G30, G47, G52.
- **Stop condition:** agent spawn → identity, balance, live feed all backed by real state; "Stop Agent" halts loop.
- **Sessions:** 3.

## Step 13 — x402 charge endpoint + agent payments
- **Goal:** `x402UmbraAdapter` server-side; agent "Pay x402 Service" button works.
- **Files touched:** `app/api/x402/charge/route.ts`, `lib/x402-adapter.ts` (new).
- **Gaps closed:** G07.
- **Stop condition:** agent pays demo paid endpoint; live feed shows `x402.outbound` then service response.
- **Sessions:** 2.

## Step 14 — Microcopy + landing pass
- **Goal:** align all PRD §11.1 / §13 strings exactly.
- **Files touched:** `app/page.tsx`, `components/how-it-works.tsx`, `components/footer.tsx`, `components/address-display.tsx`, `components/tx-hash-display.tsx`.
- **Gaps closed:** G24, G25, G26, G41, G42.
- **Stop condition:** PRD §13 microcopy library grep passes.
- **Sessions:** 1.

## Step 15 — Type cleanup
- **Goal:** zero `any` / `as any` per AGENTS.md.
- **Files touched:** `app/page.tsx`, `components/ui/button.tsx`, `lib/types.ts`, `app/employer/page.tsx`, `components/address-input.tsx`.
- **Gaps closed:** G44, G45, G46, G47, G48, G49.
- **Stop condition:** `grep -rE "as any|: any|@ts-(ignore|expect-error)"` returns zero.
- **Sessions:** 1.

## Step 16 — A11y + Tailwind config
- **Goal:** PRD §15 baseline; remove redundant Tailwind 4 config.
- **Files touched:** delete `tailwind.config.ts`, `components/onboarding-modal.tsx` (focus trap + Esc), `components/stepper.tsx` (`role="tablist"`), `components/ui/input.tsx` + form components (`aria-invalid`, `aria-describedby`), `components/footer.tsx`, `components/header.tsx`.
- **Gaps closed:** G59, G60, G61, G62, G63.
- **Stop condition:** axe-core run on `/`, `/employer`, `/employee`, `/agent`, `/verify` clean.
- **Sessions:** 1.

## Step 17 — Dep prune
- **Goal:** package.json matches PRD §16 exactly; drop drift, log surviving exceptions in gaps.md.
- **Files touched:** `package.json`, `pnpm-lock.yaml` (regen), `lib/types.ts` (drop `@solana/web3.js` import).
- **Gaps closed:** G23, G55, G57, G58.
- **Stop condition:** `pnpm build` clean; surviving non-PRD deps justified inline in gaps.md.
- **Sessions:** 1.

## Step 18 — gaps.md discipline
- **Goal:** any drift discovered while building Steps 2–17 lands in gaps.md before the code lands.
- **Files touched:** `gaps.md` (append), `AGENTS.md` Progress Log.
- **Gaps closed:** G66 (ongoing).
- **Stop condition:** every PR cites a gap id or "no drift".
- **Sessions:** ongoing.
