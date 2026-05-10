// lib/anchor.ts — typed Tessera program client.
//
// The hand-crafted IDL at idl/tessera.json is canonical (Anchor 0.30.1's
// auto-IDL extractor is broken on host nightly — see G93). This module wraps
// it with PDA helpers, account fetchers, the verify_credential reader, and
// the four-tx mint orchestrator (init_proof_staging → 2× append_public_inputs
// → verify_income_proof) introduced by the G97 staged-public-inputs fix.

import {
  AnchorProvider,
  BN,
  Program,
  type Idl,
} from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  type Connection,
  PublicKey,
  SystemProgram,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";

// Anchor 0.30.1 doesn't re-export an `AnchorWallet` type from its index — the
// previously-imported name compiled only because nothing in the app graph
// transitively imported this module. Defining the structural shape here keeps
// callers (e.g. components/umbra-provider.tsx) free of deep package paths.
export interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

import idlJson from "../idl/tessera.json" with { type: "json" };

import { getProgramId } from "./constants";

export const TESSERA_IDL = idlJson as unknown as Idl;

export const MPL_BUBBLEGUM_ID = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
export const SPL_NOOP_ID = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");
export const SPL_COMPRESSION_ID = new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");

/** CU consumed by verify_income_proof (live measurement, 2026-05-05). The
 *  Solana default 200k cap is too small; every verify call must request this
 *  via ComputeBudgetProgram.setComputeUnitLimit. Margin beyond observed 405k
 *  to absorb snarkjs IC variance and Bubblegum CPI fluctuations. */
export const VERIFY_INCOME_PROOF_CU = 600_000;

const STATE_SEED = Buffer.from("tessera_state");
const CREDENTIAL_SEED = Buffer.from("credential");
const BUFFER_SEED = Buffer.from("public_input_buffer");
const NULLIFIER_SEED = Buffer.from("nullifier");

export type TesseraProgram = Program<Idl>;

export function getProgram(connection: Connection, wallet: AnchorWallet): TesseraProgram {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  // Anchor 0.30 reads the program id from idl.address; the lazy getProgramId()
  // throws if NEXT_PUBLIC_PROGRAM_ID isn't set so callers fail fast on misconfig.
  const programIdStr = getProgramId();
  if (programIdStr !== (TESSERA_IDL as unknown as { address: string }).address) {
    throw new Error(
      `program id mismatch: env=${programIdStr} idl=${(TESSERA_IDL as unknown as { address: string }).address}`,
    );
  }
  return new Program(TESSERA_IDL, provider) as unknown as TesseraProgram;
}

// ── PDA helpers ────────────────────────────────────────────────────────

function asBuffer(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export function deriveStatePda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([STATE_SEED], programId);
}

export function deriveCredentialPda(
  owner: PublicKey,
  proofHash: Uint8Array,
  programId: PublicKey,
): [PublicKey, number] {
  if (proofHash.length !== 32) throw new Error(`proofHash must be 32 bytes, got ${proofHash.length}`);
  return PublicKey.findProgramAddressSync([CREDENTIAL_SEED, owner.toBuffer(), asBuffer(proofHash)], programId);
}

export function deriveBufferPda(
  owner: PublicKey,
  batchId: Uint8Array,
  programId: PublicKey,
): [PublicKey, number] {
  if (batchId.length !== 32) throw new Error(`batchId must be 32 bytes, got ${batchId.length}`);
  return PublicKey.findProgramAddressSync([BUFFER_SEED, owner.toBuffer(), asBuffer(batchId)], programId);
}

export function deriveNullifierPda(
  nullifierHash: Uint8Array,
  programId: PublicKey,
): [PublicKey, number] {
  if (nullifierHash.length !== 32) throw new Error(`nullifierHash must be 32 bytes, got ${nullifierHash.length}`);
  return PublicKey.findProgramAddressSync([NULLIFIER_SEED, asBuffer(nullifierHash)], programId);
}

export function deriveTreeAuthorityPda(tree: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([tree.toBuffer()], MPL_BUBBLEGUM_ID);
}

// ── Account shapes (TS mirrors of state.rs) ────────────────────────────

export interface TesseraStateAccount {
  admin: PublicKey;
  feeLamports: bigint;
  totalCredentialsIssued: bigint;
  merkleTree: PublicKey;
  bump: number;
}

export interface CredentialAccount {
  owner: PublicKey;
  incomeAboveThreshold: boolean;
  threshold: bigint;
  startTs: bigint;
  endTs: bigint;
  dateRangeHash: Uint8Array;
  merkleRoot: Uint8Array;
  employerCommitment: Uint8Array;
  proofHash: Uint8Array;
  nullifierHashes: Uint8Array[]; // 32 entries
  issuedAt: bigint;
  expiresAt: bigint;
  issuer: PublicKey;
  cnftAssetId: PublicKey;
  bump: number;
}

function bnToBigint(x: BN | bigint | number): bigint {
  if (typeof x === "bigint") return x;
  if (typeof x === "number") return BigInt(x);
  return BigInt(x.toString());
}

function arrayToU8(x: number[] | Uint8Array): Uint8Array {
  return x instanceof Uint8Array ? x : Uint8Array.from(x);
}

function decodeTesseraState(raw: any): TesseraStateAccount {
  return {
    admin: new PublicKey(raw.admin),
    feeLamports: bnToBigint(raw.feeLamports),
    totalCredentialsIssued: bnToBigint(raw.totalCredentialsIssued),
    merkleTree: new PublicKey(raw.merkleTree),
    bump: Number(raw.bump),
  };
}

function decodeCredential(raw: any): CredentialAccount {
  return {
    owner: new PublicKey(raw.owner),
    incomeAboveThreshold: Boolean(raw.incomeAboveThreshold),
    threshold: bnToBigint(raw.threshold),
    startTs: bnToBigint(raw.startTs),
    endTs: bnToBigint(raw.endTs),
    dateRangeHash: arrayToU8(raw.dateRangeHash),
    merkleRoot: arrayToU8(raw.merkleRoot),
    employerCommitment: arrayToU8(raw.employerCommitment),
    proofHash: arrayToU8(raw.proofHash),
    nullifierHashes: (raw.nullifierHashes as Array<number[] | Uint8Array>).map(arrayToU8),
    issuedAt: bnToBigint(raw.issuedAt),
    expiresAt: bnToBigint(raw.expiresAt),
    issuer: new PublicKey(raw.issuer),
    cnftAssetId: new PublicKey(raw.cnftAssetId),
    bump: Number(raw.bump),
  };
}

async function fetchOrNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Account does not exist|has no data|Account not found/i.test(msg)) return null;
    throw e;
  }
}

export async function fetchTesseraState(program: TesseraProgram): Promise<TesseraStateAccount | null> {
  const [pda] = deriveStatePda(program.programId);
  const raw = await fetchOrNull(() => (program.account as any).tesseraState.fetch(pda));
  return raw ? decodeTesseraState(raw) : null;
}

export async function fetchCredential(
  program: TesseraProgram,
  owner: PublicKey,
  proofHash: Uint8Array,
): Promise<CredentialAccount | null> {
  const [pda] = deriveCredentialPda(owner, proofHash, program.programId);
  return fetchCredentialByPda(program, pda);
}

export async function fetchCredentialByPda(
  program: TesseraProgram,
  credentialPda: PublicKey,
): Promise<CredentialAccount | null> {
  const raw = await fetchOrNull(() => (program.account as any).credential.fetch(credentialPda));
  return raw ? decodeCredential(raw) : null;
}

// ── verify_credential read wrapper ─────────────────────────────────────

export interface VerifyCredentialResult {
  valid: boolean;
  threshold: bigint;
  expiresAt: number;
  reason: 0 | 1 | 2;
}

export async function verifyCredential(
  program: TesseraProgram,
  credentialPda: PublicKey,
  requiredThreshold: bigint,
): Promise<VerifyCredentialResult> {
  const out: any = await (program.methods as any)
    .verifyCredential(new BN(requiredThreshold.toString()))
    .accounts({ credential: credentialPda })
    .view();
  return {
    valid: Boolean(out.valid),
    threshold: bnToBigint(out.threshold),
    expiresAt: Number(bnToBigint(out.expiresAt)),
    reason: Number(out.reason) as 0 | 1 | 2,
  };
}

// ── mintCredential orchestrator (G97 staged-public-inputs flow) ────────

export type MintStage =
  | "staging-init"
  | "staging-append-1"
  | "staging-append-2"
  | "verifying"
  | "complete";

export interface MintCredentialParams {
  program: TesseraProgram;
  owner: PublicKey;
  proof: { a: Uint8Array; b: Uint8Array; c: Uint8Array };
  publicSignals: Uint8Array[]; // 39 × 32 bytes
  metadataUri: string;
  merkleTree: PublicKey;
  /** Override the random batchId. Defaults to crypto.getRandomValues. */
  batchId?: Uint8Array;
  onProgress?: (stage: MintStage, txSig?: string) => void;
}

export interface MintCredentialResult {
  credentialPda: PublicKey;
  cnftAssetId: PublicKey;
  txSignatures: { init: string; append1: string; append2: string; verify: string };
  batchId: Uint8Array;
}

export class MintCredentialError extends Error {
  constructor(
    public stage: MintStage,
    public underlying: unknown,
    message: string,
  ) {
    super(message);
    this.name = "MintCredentialError";
  }
}

import { keccak_256 } from "@noble/hashes/sha3.js";

function deriveProofHash(a: Uint8Array, b: Uint8Array, c: Uint8Array): Uint8Array {
  const buf = new Uint8Array(a.length + b.length + c.length);
  buf.set(a, 0);
  buf.set(b, a.length);
  buf.set(c, a.length + b.length);
  return keccak_256(buf);
}

function randomBatchId(): Uint8Array {
  const out = new Uint8Array(32);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(out);
  } else {
    // SSR / Node fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require("node:crypto");
    out.set(randomBytes(32));
  }
  return out;
}

const APPEND_CHUNK_LO = 20;
const APPEND_CHUNK_HI = 19;

export async function mintCredential(params: MintCredentialParams): Promise<MintCredentialResult> {
  const { program, owner, proof, publicSignals, metadataUri, merkleTree, onProgress } = params;
  if (publicSignals.length !== 39) {
    throw new Error(`publicSignals must have length 39, got ${publicSignals.length}`);
  }

  const batchId = params.batchId ?? randomBatchId();
  if (batchId.length !== 32) throw new Error(`batchId must be 32 bytes, got ${batchId.length}`);

  const proofHash = deriveProofHash(proof.a, proof.b, proof.c);
  const [bufferPda] = deriveBufferPda(owner, batchId, program.programId);
  const [credentialPda] = deriveCredentialPda(owner, proofHash, program.programId);
  const [statePda] = deriveStatePda(program.programId);
  const [treeAuthority] = deriveTreeAuthorityPda(merkleTree);

  const batchIdArr = Array.from(batchId);

  // ── 1. init_proof_staging ────────────────────────────────────────────
  let initSig: string;
  try {
    onProgress?.("staging-init");
    initSig = await (program.methods as any)
      .initProofStaging(batchIdArr)
      .accountsPartial({
        buffer: bufferPda,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });
  } catch (e) {
    throw new MintCredentialError("staging-init", e, "init_proof_staging failed");
  }

  // ── 2. append_public_inputs (chunk 0) ────────────────────────────────
  let append1Sig: string;
  try {
    onProgress?.("staging-append-1", initSig);
    const chunk = publicSignals.slice(0, APPEND_CHUNK_LO).map((s) => Array.from(s));
    append1Sig = await (program.methods as any)
      .appendPublicInputs(batchIdArr, 0, chunk)
      .accountsPartial({ buffer: bufferPda, owner })
      .rpc({ commitment: "confirmed" });
  } catch (e) {
    throw new MintCredentialError("staging-append-1", e, "append_public_inputs (chunk 0) failed");
  }

  // ── 3. append_public_inputs (chunk 1) ────────────────────────────────
  let append2Sig: string;
  try {
    onProgress?.("staging-append-2", append1Sig);
    const chunk = publicSignals.slice(APPEND_CHUNK_LO, APPEND_CHUNK_LO + APPEND_CHUNK_HI).map((s) => Array.from(s));
    append2Sig = await (program.methods as any)
      .appendPublicInputs(batchIdArr, APPEND_CHUNK_LO, chunk)
      .accountsPartial({ buffer: bufferPda, owner })
      .rpc({ commitment: "confirmed" });
  } catch (e) {
    throw new MintCredentialError("staging-append-2", e, "append_public_inputs (chunk 1) failed");
  }

  // ── 4. verify_income_proof ───────────────────────────────────────────
  let verifySig: string;
  try {
    onProgress?.("verifying", append2Sig);

    const remainingAccounts = nullifierAccountsFromSignals(publicSignals, program.programId);

    verifySig = await (program.methods as any)
      .verifyIncomeProof(
        Array.from(proof.a),
        Array.from(proof.b),
        Array.from(proof.c),
        batchIdArr,
        metadataUri,
      )
      .accountsPartial({
        state: statePda,
        buffer: bufferPda,
        credential: credentialPda,
        owner,
        merkleTree,
        treeAuthority,
        logWrapper: SPL_NOOP_ID,
        compressionProgram: SPL_COMPRESSION_ID,
        bubblegumProgram: MPL_BUBBLEGUM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: VERIFY_INCOME_PROOF_CU }),
      ])
      .remainingAccounts(remainingAccounts)
      .rpc({ commitment: "confirmed" });
  } catch (e) {
    throw new MintCredentialError("verifying", e, "verify_income_proof failed");
  }

  onProgress?.("complete", verifySig);

  // The cnft asset id stored on the credential is the merkle tree pubkey
  // (the program currently uses it as a proxy; the FE resolves the real
  // asset id via DAS getAsset on top).
  return {
    credentialPda,
    cnftAssetId: merkleTree,
    txSignatures: { init: initSig, append1: append1Sig, append2: append2Sig, verify: verifySig },
    batchId,
  };
}

const NULLIFIER_BASE_OFFSET = 6;
const NULLIFIER_COUNT = 32;

function nullifierAccountsFromSignals(signals: Uint8Array[], programId: PublicKey) {
  const out: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] = [];
  for (let i = 0; i < NULLIFIER_COUNT; i++) {
    const nh = signals[NULLIFIER_BASE_OFFSET + i];
    if (!nh.some((b) => b !== 0)) continue;
    const [pda] = deriveNullifierPda(nh, programId);
    out.push({ pubkey: pda, isSigner: false, isWritable: true });
  }
  return out;
}
