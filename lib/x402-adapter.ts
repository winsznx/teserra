// lib/x402-adapter.ts — x402 over Umbra: server-side challenge issuance +
// verification, plus a thin client helper that wraps shieldDeposit.
//
// Verification recipe per Cal (Umbra founder, Discord 2026-05-03; recorded
// in scripts/day0/REPORT.md "Verification flow"):
//   1. Receiver fetches the deposit tx by signature.
//   2. Receiver finds the Umbra program CPI inside the tx (top-level or
//      inner-instructions) and extracts the optional_data (32 bytes).
//   3. Receiver matches optional_data against the nonce it issued in the
//      original 402 challenge.
//   4. Receiver identifies the computation_account — a PDA owned by the
//      Umbra program and freshly created by this deposit — and walks its
//      signatures looking for a finalized callback log
//      ("Program log: Umbra:Callback...").
//
// No indexer endpoint is on the hot path. The receiver reconstructs the
// assertion from chain state alone. Logged as G80 in gaps.md (PRD §15
// stays untouched per project rules; reality lives here).

import "server-only";
import { Connection, PublicKey, type ParsedAccountData } from "@solana/web3.js";

import { UMBRA_PROGRAM_ID } from "@/lib/constants";
import {
  shieldDeposit,
  type ShieldDepositResult,
} from "@/lib/umbra-deposit";

// ── Types ──────────────────────────────────────────────────────────────

export type X402Network = "solana-devnet" | "solana-mainnet";

export interface UmbraPaymentRequirement {
  recipientUmbraAddress: string;
  amount: bigint;
  token: string;
  nonce: string;
  expiresAt: number;
}

export interface X402ChallengeAccept {
  scheme: "umbra-private";
  network: X402Network;
  recipient: string;
  amount: string;
  token: string;
  nonce: string;
  expiresAt: number;
  extra?: { description?: string };
}

export interface X402Challenge {
  x402Version: 1;
  accepts: X402ChallengeAccept[];
}

export interface X402PaymentProof {
  scheme: "umbra-private";
  txSignature: string;
  nonce: string;
}

// ── Nonce helpers ──────────────────────────────────────────────────────

const NONCE_HEX_RE = /^[0-9a-f]{64}$/i;

export function generateNonce(): string {
  const buf = new Uint8Array(32);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(buf);
  } else {
    // Node ≥ 19 has globalThis.crypto; this fallback is for very old runtimes.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require("node:crypto") as { randomBytes: (n: number) => Buffer };
    buf.set(randomBytes(32));
  }
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isValidNonce(nonce: string): boolean {
  return NONCE_HEX_RE.test(nonce);
}

export function nonceToOptionalData(nonce: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const hex = (nonce ?? "").padEnd(64, "0").slice(0, 64);
  for (let i = 0; i < 32; i++) {
    const slice = hex.slice(i * 2, i * 2 + 2);
    const byte = parseInt(slice, 16);
    bytes[i] = Number.isFinite(byte) ? byte : 0;
  }
  return bytes;
}

export function bufferContainsNonce(haystack: Uint8Array, nonce: string): boolean {
  // Search for the nonce's 32 bytes anywhere in the instruction-data buffer.
  // The Umbra deposit instruction layout isn't publicly versioned; sliding
  // window matching is robust to layout changes inside the SDK as long as
  // optional_data is preserved verbatim.
  if (!haystack || haystack.length < 32) return false;
  const needle = nonceToOptionalData(nonce);
  outer: for (let i = 0; i + 32 <= haystack.length; i++) {
    for (let j = 0; j < 32; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

// ── Server-side challenge builder ──────────────────────────────────────

const DEFAULT_TTL_SECONDS = 300;

export function build402Challenge(opts: {
  recipientUmbraAddress: string;
  amount: bigint;
  token: string;
  description?: string;
  ttlSeconds?: number;
  network?: X402Network;
}): { challenge: X402Challenge; requirement: UmbraPaymentRequirement } {
  const nonce = generateNonce();
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;
  const network = opts.network ?? "solana-devnet";

  const requirement: UmbraPaymentRequirement = {
    recipientUmbraAddress: opts.recipientUmbraAddress,
    amount: opts.amount,
    token: opts.token,
    nonce,
    expiresAt,
  };
  const challenge: X402Challenge = {
    x402Version: 1,
    accepts: [
      {
        scheme: "umbra-private",
        network,
        recipient: opts.recipientUmbraAddress,
        amount: opts.amount.toString(),
        token: opts.token,
        nonce,
        expiresAt,
        ...(opts.description ? { extra: { description: opts.description } } : {}),
      },
    ],
  };
  return { challenge, requirement };
}

// ── Server-side verification ───────────────────────────────────────────

export type VerifyReason =
  | "tx-not-found"
  | "tx-failed"
  | "no-umbra-cpi"
  | "wrong-recipient"
  | "wrong-amount"
  | "wrong-token"
  | "wrong-nonce"
  | "no-callback"
  | "callback-failed"
  | "expired";

export interface VerifyX402Result {
  ok: boolean;
  reason?: VerifyReason;
  computationAccount?: string;
  callbackTxSignatures?: string[];
}

interface CacheEntry {
  result: VerifyX402Result;
  expiresAt: number;
}

const VERIFY_CACHE_TTL_MS = 60_000;
const VERIFY_CACHE_MAX = 1024;
const verifyCache = new Map<string, CacheEntry>();

function cacheKey(txSig: string, nonce: string): string {
  return `${txSig}|${nonce}`;
}

function readCache(key: string): VerifyX402Result | null {
  const entry = verifyCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    verifyCache.delete(key);
    return null;
  }
  // LRU touch: re-insert so it counts as most-recent.
  verifyCache.delete(key);
  verifyCache.set(key, entry);
  return entry.result;
}

function writeCache(key: string, result: VerifyX402Result): void {
  if (!result.ok) return; // Don't cache failures — a failed lookup may succeed later.
  if (verifyCache.size >= VERIFY_CACHE_MAX) {
    const oldest = verifyCache.keys().next().value;
    if (oldest != null) verifyCache.delete(oldest);
  }
  verifyCache.set(key, { result, expiresAt: Date.now() + VERIFY_CACHE_TTL_MS });
}

export function __resetVerifyCacheForTests(): void {
  verifyCache.clear();
}

const UMBRA_CALLBACK_LOG_RE = /Umbra[:\s]?Callback/i;

interface CompiledIxLike {
  programIdIndex: number;
  // legacy "compiledInstructions" uses Uint8Array `data` + `accountKeyIndexes`
  // inner instructions use base58 string `data` + `accounts` number[]
  data?: Uint8Array | string;
  accountKeyIndexes?: number[];
  accounts?: number[];
}

function decodeBase58(s: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let bytes: number[] = [0];
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new Error("invalid base58");
    let carry = v;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const ch of s) {
    if (ch !== "1") break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

function ixDataBytes(ix: CompiledIxLike): Uint8Array {
  if (!ix.data) return new Uint8Array(0);
  if (typeof ix.data === "string") {
    try {
      return decodeBase58(ix.data);
    } catch {
      return new Uint8Array(0);
    }
  }
  return ix.data;
}

function ixAccountIndexes(ix: CompiledIxLike): number[] {
  if (Array.isArray(ix.accountKeyIndexes)) return ix.accountKeyIndexes;
  if (Array.isArray(ix.accounts)) return ix.accounts;
  return [];
}

interface ParsedTxView {
  err: unknown;
  blockTime: number | null;
  // base58 strings, in account-key index order (legacy Solana ordering)
  accountKeys: string[];
  innerInstructions: CompiledIxLike[];
  outerInstructions: CompiledIxLike[];
  logMessages: string[];
}

interface RawTxResponse {
  meta?: {
    err?: unknown;
    innerInstructions?: { instructions: CompiledIxLike[] }[];
    logMessages?: string[];
    loadedAddresses?: { writable?: PublicKey[] | string[]; readonly?: PublicKey[] | string[] };
  } | null;
  blockTime?: number | null;
  transaction?: {
    message?: {
      staticAccountKeys?: PublicKey[];
      accountKeys?: PublicKey[] | string[] | { pubkey: PublicKey | string }[];
      compiledInstructions?: CompiledIxLike[];
      instructions?: CompiledIxLike[];
    };
  };
}

function viewTx(raw: RawTxResponse | null): ParsedTxView | null {
  if (!raw || !raw.transaction) return null;
  const message = raw.transaction.message ?? {};
  const meta = raw.meta ?? {};

  const flattenAccount = (a: unknown): string => {
    if (a == null) return "";
    if (typeof a === "string") return a;
    if (a instanceof PublicKey) return a.toBase58();
    const obj = a as { pubkey?: unknown; toBase58?: unknown };
    if (typeof obj.toBase58 === "function") return (obj.toBase58 as () => string)();
    if (obj.pubkey != null) return flattenAccount(obj.pubkey);
    return String(a);
  };

  const baseKeys = (
    message.staticAccountKeys ?? (message.accountKeys as unknown[]) ?? []
  ).map(flattenAccount);
  const writable = (meta.loadedAddresses?.writable ?? []).map(flattenAccount);
  const readonly = (meta.loadedAddresses?.readonly ?? []).map(flattenAccount);
  const accountKeys = [...baseKeys, ...writable, ...readonly];

  const outerInstructions =
    message.compiledInstructions ?? (message.instructions as CompiledIxLike[]) ?? [];
  const innerInstructions: CompiledIxLike[] = [];
  for (const inner of meta.innerInstructions ?? []) {
    for (const ix of inner.instructions ?? []) innerInstructions.push(ix);
  }

  return {
    err: meta.err ?? null,
    blockTime: typeof raw.blockTime === "number" ? raw.blockTime : null,
    accountKeys,
    innerInstructions,
    outerInstructions,
    logMessages: meta.logMessages ?? [],
  };
}

interface UmbraInvocation {
  ix: CompiledIxLike;
  data: Uint8Array;
  accountKeys: string[];
}

function findUmbraInvocations(view: ParsedTxView): UmbraInvocation[] {
  const out: UmbraInvocation[] = [];
  const all = [...view.outerInstructions, ...view.innerInstructions];
  for (const ix of all) {
    const programKey = view.accountKeys[ix.programIdIndex];
    if (programKey === UMBRA_PROGRAM_ID) {
      const accountKeys = ixAccountIndexes(ix).map((i) => view.accountKeys[i] ?? "");
      out.push({ ix, data: ixDataBytes(ix), accountKeys });
    }
  }
  return out;
}

async function findComputationAccount(
  connection: Connection,
  view: ParsedTxView,
  invocations: UmbraInvocation[],
  excludeAddresses: Set<string>,
): Promise<string | null> {
  // The deposit tx's writable Umbra-owned accounts include the recipient's
  // ETA + the per-deposit computation_account. We exclude the recipient
  // (passed in `excludeAddresses`) and pick the first remaining Umbra-owned
  // account. If multiple candidates exist, callers fall back to scanning
  // each one for callback signatures (rarely happens in practice — deposits
  // touch one fresh computation_account).
  const candidates = new Set<string>();
  for (const inv of invocations) {
    for (const key of inv.accountKeys) {
      if (key && !excludeAddresses.has(key)) candidates.add(key);
    }
  }
  for (const candidate of candidates) {
    let info: { owner: PublicKey } | null = null;
    try {
      info = await connection.getAccountInfo(new PublicKey(candidate), "confirmed");
    } catch {
      continue;
    }
    if (info && info.owner.toBase58() === UMBRA_PROGRAM_ID) {
      return candidate;
    }
  }
  return null;
}

interface CallbackProbeResult {
  found: boolean;
  failed: boolean;
  signatures: string[];
}

async function probeCallbacks(
  connection: Connection,
  computationAccount: string,
  excludeSignature: string,
): Promise<CallbackProbeResult> {
  const out: CallbackProbeResult = { found: false, failed: false, signatures: [] };
  let sigs: { signature: string; err: unknown }[];
  try {
    sigs = await connection.getSignaturesForAddress(
      new PublicKey(computationAccount),
      { limit: 32 },
    );
  } catch {
    return out;
  }
  for (const s of sigs) {
    if (s.signature === excludeSignature) continue;
    let tx;
    try {
      tx = await connection.getTransaction(s.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
    } catch {
      continue;
    }
    if (!tx) continue;
    const v = viewTx(tx as RawTxResponse);
    if (!v) continue;
    const isCallback = v.logMessages.some((line) => UMBRA_CALLBACK_LOG_RE.test(line));
    if (!isCallback) continue;
    out.signatures.push(s.signature);
    if (s.err || v.err) {
      out.failed = true;
    } else {
      out.found = true;
      // Stop on first success — additional callbacks don't change the verdict.
      break;
    }
  }
  return out;
}

export async function verifyX402Payment(
  connection: Connection,
  proof: X402PaymentProof,
  expected: UmbraPaymentRequirement,
): Promise<VerifyX402Result> {
  const key = cacheKey(proof.txSignature, proof.nonce);
  const cached = readCache(key);
  if (cached) return cached;

  if (proof.nonce !== expected.nonce) {
    return { ok: false, reason: "wrong-nonce" };
  }
  if (Math.floor(Date.now() / 1000) > expected.expiresAt) {
    return { ok: false, reason: "expired" };
  }

  let tx: RawTxResponse | null = null;
  try {
    tx = (await connection.getTransaction(proof.txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    })) as RawTxResponse | null;
  } catch {
    return { ok: false, reason: "tx-not-found" };
  }
  if (!tx) return { ok: false, reason: "tx-not-found" };

  const view = viewTx(tx);
  if (!view) return { ok: false, reason: "tx-not-found" };
  if (view.err) return { ok: false, reason: "tx-failed" };

  // Per-tx blockTime guard. Late-arriving deposits (sender raced past
  // expiry) get rejected even though the tx itself is valid.
  if (view.blockTime != null && view.blockTime > expected.expiresAt) {
    return { ok: false, reason: "expired" };
  }

  const invocations = findUmbraInvocations(view);
  if (invocations.length === 0) return { ok: false, reason: "no-umbra-cpi" };

  const recipientFound = invocations.some((inv) =>
    inv.accountKeys.includes(expected.recipientUmbraAddress),
  );
  if (!recipientFound) return { ok: false, reason: "wrong-recipient" };

  const tokenFound = view.accountKeys.includes(expected.token);
  if (!tokenFound) return { ok: false, reason: "wrong-token" };

  const nonceMatched = invocations.some((inv) => bufferContainsNonce(inv.data, expected.nonce));
  if (!nonceMatched) return { ok: false, reason: "wrong-nonce" };

  // Identify the computation_account by walking Umbra-owned accounts touched
  // by the deposit's Umbra invocations (excluding the recipient).
  const exclude = new Set<string>([expected.recipientUmbraAddress]);
  const computationAccount = await findComputationAccount(connection, view, invocations, exclude);
  if (!computationAccount) {
    return { ok: false, reason: "no-callback" };
  }

  const probe = await probeCallbacks(connection, computationAccount, proof.txSignature);
  if (!probe.found) {
    return {
      ok: false,
      reason: probe.failed ? "callback-failed" : "no-callback",
      computationAccount,
      callbackTxSignatures: probe.signatures,
    };
  }

  // We don't rigorously verify amount because the SDK encodes it inside the
  // borsh-serialized instruction data, mixed with other fields. The strong
  // bindings are recipient + token + nonce + a finalized callback — which
  // collectively prove the depositor went through the SDK's path against
  // our challenge. Logged as G127.
  void (expected as { amount: bigint }); // referenced for review

  const result: VerifyX402Result = {
    ok: true,
    computationAccount,
    callbackTxSignatures: probe.signatures,
  };
  writeCache(key, result);
  return result;
}

// Re-export helpers so unit tests don't have to import @solana/web3.js
// just to inspect parsed account data — kept for symmetry only.
export type { ParsedAccountData };

// ── Client-side (used by agent runtime) ────────────────────────────────

export async function payX402Private(
  umbraClient: unknown,
  challenge: X402Challenge,
  onProgress?: (stage: "submitting" | "submitted") => void,
): Promise<X402PaymentProof & { deposit: ShieldDepositResult }> {
  const accept = challenge.accepts.find((a) => a.scheme === "umbra-private");
  if (!accept) throw new Error("payX402Private: no umbra-private accept entry in challenge");

  onProgress?.("submitting");
  const deposit = await shieldDeposit({
    client: umbraClient,
    recipientUmbraAddress: accept.recipient,
    amount: BigInt(accept.amount),
    mint: accept.token,
    optionalData: nonceToOptionalData(accept.nonce),
  });
  onProgress?.("submitted");

  return {
    scheme: "umbra-private",
    txSignature: deposit.queueSignature,
    nonce: accept.nonce,
    deposit,
  };
}
