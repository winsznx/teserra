// Per-process in-memory challenge store. Keys nonces → requirements + state.
//
// Limitations (acceptable for the hackathon devnet demo):
//   - Per-Vercel-serverless-instance — same caveat as the agent registry.
//     A nonce issued by instance A and replayed against instance B would
//     trigger a "challenge-not-found" 402 response.
//   - Bounded by NODE memory; stale entries pruned on a 60s timer.
//
// The leading underscore in the directory name (`_lib`) keeps Next from
// treating this as a route segment.

import "server-only";

import type {
  UmbraPaymentRequirement,
  X402Challenge,
} from "@/lib/x402-adapter";

interface StoredChallenge {
  requirement: UmbraPaymentRequirement;
  consumed: boolean;
  storedAt: number;
}

const PRUNE_INTERVAL_MS = 60_000;
const MAX_ENTRIES = 4_096;

const store = new Map<string, StoredChallenge>();

let pruneTimer: NodeJS.Timeout | null = null;

function pruneExpired(now = Math.floor(Date.now() / 1000)): void {
  for (const [nonce, entry] of store) {
    if (entry.requirement.expiresAt < now) store.delete(nonce);
  }
}

function ensurePruneTimer(): void {
  if (pruneTimer != null) return;
  pruneTimer = setInterval(pruneExpired, PRUNE_INTERVAL_MS);
  if (typeof pruneTimer === "object" && pruneTimer && "unref" in pruneTimer) {
    pruneTimer.unref();
  }
}

export function storeChallenge(
  challenge: X402Challenge,
  requirement: UmbraPaymentRequirement,
): void {
  if (store.size >= MAX_ENTRIES) {
    pruneExpired();
  }
  if (store.size >= MAX_ENTRIES) {
    // Capacity still pinned (everything in-window) — drop the oldest entry
    // to keep accepting new challenges. Old challenges that haven't been
    // paid yet may transiently fail to verify; that's acceptable degradation.
    const oldestKey = store.keys().next().value;
    if (oldestKey != null) store.delete(oldestKey);
  }
  store.set(challenge.accepts[0].nonce, {
    requirement,
    consumed: false,
    storedAt: Date.now(),
  });
  ensurePruneTimer();
}

export function getStoredChallenge(nonce: string): UmbraPaymentRequirement | null {
  const entry = store.get(nonce);
  if (!entry) return null;
  if (entry.consumed) return null;
  if (entry.requirement.expiresAt < Math.floor(Date.now() / 1000)) {
    store.delete(nonce);
    return null;
  }
  return entry.requirement;
}

export function consumeNonce(nonce: string): boolean {
  const entry = store.get(nonce);
  if (!entry) return false;
  if (entry.consumed) return false;
  entry.consumed = true;
  return true;
}

export function __resetStoreForTests(): void {
  store.clear();
  if (pruneTimer != null) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
}

export function __debugSize(): number {
  return store.size;
}
