# Tessera — Implementation Gaps

This document tracks technical and architectural gaps in the current frontend implementation that must be addressed before production.

## 1. Wallet & Identity
- [ ] **Solana Wallet Integration:** `WalletConnectButton` currently has no provider logic. Needs `@solana/wallet-adapter-react` integration.
- [ ] **Umbra Key Derivation:** `OnboardingModal` uses mock signature logic. Needs to implement the deterministic derivation of Umbra master keys from Solana signatures as per PRD §11.2.
- [ ] **Session Persistence:** Identity state is not persisted across reloads (except for theme). Needs a secure local storage or cookie-based session manager for the Umbra identity.

## 2. API & Backend Wiring
- [ ] **Route Implementation:** All routes in `/api/...` currently return `501 Not Implemented`.
- [ ] **ZK Proving:** `handleProve` in `/employee` is a pure simulation. Needs integration with the browser-based Groth16 worker and circuit files.
- [ ] **Arcium/MPC Integration:** Employer shielded payments need to call the actual MPC service for blinding, not just a timeout simulation.
- [ ] **Indexer Connection:** Empty states in history sections need to be wired to a real-time indexer or RPC scan.

## 3. Protocol Logic
- [ ] **Compressed NFT Minting:** Credential minting logic needs to call the Solana program to mint a compressed NFT (cNFT) using the Bubblegum SDK.
- [ ] **Address Validation:** Implement stricter validation for Umbra stealth addresses vs. standard Solana public keys in `AddressInput`.
- [ ] **Error Handling:** Global error boundary and specific transaction failure states are basic. Needs "The Seal is Broken" aesthetic error states for failed proofs.

## 4. Design & UX
- [ ] **Real-time Feed:** `/agent` feed is a randomized simulation. Needs to be wired to SSE or WebSocket events from the indexer.
- [ ] **Motion Polish:** "The Credential Mint Moment" (§7) needs final CSS keyframe refinement for the parchment/seal animation.
- [ ] **Typography:** Ensure `Fraunces` variable axes (SOFT/WONK) are fully utilized for semantic emphasis in the UI.

## 5. Security
- [ ] **Secret Handling:** Verify that no private data (Umbra viewing keys) is logged to the console during simulation transitions.
- [ ] **Audit:** Frontend security audit for XSS in address displays and transaction hash parsing.
