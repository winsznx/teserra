// lib/proof.ts — Groth16 proof generation + on-chain encoding.
//
// The on-chain program uses groth16-solana 0.2.0 (Lightprotocol). Two encoding
// transforms that look like trivia but are load-bearing for verification:
//   1. proof_a's y-coordinate is NEGATED mod BN254_P. snarkjs's off-chain
//      `groth16.verify` negates internally; on-chain expects pre-negated.
//   2. proof_b's G2 coordinates are emitted in c1c0 order (not c0c1) for
//      both x and y. The Solana alt_bn128 syscall ABI uses this.
//
// Skipping either transform makes every proof submission fail with
// ProofVerificationFailed, regardless of the underlying math being correct.

import type { IncomeWitness } from "./witness";
import {
  N_UTXOS,
  PUBLIC_SIGNALS_COUNT,
  bigintToBe32,
  witnessToPublicSignals,
} from "./witness";

export const BN254_P = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

export type ProofStage = "witness-build" | "proof-compute" | "encoding";

export interface GenerateProofParams {
  witness: IncomeWitness;
  wasmPath: string;
  zkeyPath: string;
  onStage?: (stage: ProofStage) => void;
}

export interface ProofResult {
  proof: {
    a: Uint8Array; // 64 bytes
    b: Uint8Array; // 128 bytes
    c: Uint8Array; // 64 bytes
  };
  publicSignals: Uint8Array[]; // 39 × 32 bytes
  generationMs: number;
}

export function decimalToBigint(s: string): bigint {
  return BigInt(s);
}

export function negateFq(y: bigint): bigint {
  const reduced = ((y % BN254_P) + BN254_P) % BN254_P;
  return (BN254_P - reduced) % BN254_P;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function encodeProofA(piA: string[]): Uint8Array {
  const ax = decimalToBigint(piA[0]);
  const ay = decimalToBigint(piA[1]);
  return concat(bigintToBe32(ax), bigintToBe32(negateFq(ay)));
}

export function encodeProofB(piB: string[][]): Uint8Array {
  // pi_b is [[x.c0, x.c1], [y.c0, y.c1], [1, 0]]; emit c1c0 ordering.
  return concat(
    bigintToBe32(decimalToBigint(piB[0][1])),
    bigintToBe32(decimalToBigint(piB[0][0])),
    bigintToBe32(decimalToBigint(piB[1][1])),
    bigintToBe32(decimalToBigint(piB[1][0])),
  );
}

export function encodeProofC(piC: string[]): Uint8Array {
  return concat(bigintToBe32(decimalToBigint(piC[0])), bigintToBe32(decimalToBigint(piC[1])));
}

function witnessForSnarkjs(w: IncomeWitness): Record<string, unknown> {
  const stringify = (x: bigint) => x.toString();
  return {
    amounts: w.amounts.map(stringify),
    isValid: w.isValid.map(stringify),
    nonces: w.nonces.map(stringify),
    timestamps: w.timestamps.map(stringify),
    pathElements: w.pathElements.map((row) => row.map(stringify)),
    pathIndices: w.pathIndices.map((row) => row.map(stringify)),
    employerSecret: stringify(w.employerSecret),
    utxoSecrets: w.utxoSecrets.map(stringify),
    threshold: stringify(w.threshold),
    startTs: stringify(w.startTs),
    endTs: stringify(w.endTs),
    merkleRoot: stringify(w.merkleRoot),
    employerCommitment: stringify(w.employerCommitment),
    dateRangeHash: stringify(w.dateRangeHash),
    nullifierHash: w.nullifierHash.map(stringify),
  };
}

export async function generateIncomeProof(params: GenerateProofParams): Promise<ProofResult> {
  const t0 = Date.now();
  params.onStage?.("witness-build");

  const witnessInput = witnessForSnarkjs(params.witness);

  // Dynamic import so the lib loads in environments without snarkjs (e.g. SSR).
  const snarkjsModule: any = await import("snarkjs");
  const snarkjs: any = snarkjsModule.default ?? snarkjsModule;

  params.onStage?.("proof-compute");
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    witnessInput,
    params.wasmPath,
    params.zkeyPath,
  );

  params.onStage?.("encoding");
  const a = encodeProofA(proof.pi_a);
  const b = encodeProofB(proof.pi_b);
  const c = encodeProofC(proof.pi_c);

  // snarkjs publicSignals layout matches our `witnessToPublicSignals` order;
  // prefer the prover's authoritative output to avoid drift.
  const signals = (publicSignals as string[]).map((s) => bigintToBe32(BigInt(s)));
  if (signals.length !== PUBLIC_SIGNALS_COUNT) {
    throw new Error(`unexpected publicSignals length: ${signals.length}, want ${PUBLIC_SIGNALS_COUNT}`);
  }

  return {
    proof: { a, b, c },
    publicSignals: signals,
    generationMs: Date.now() - t0,
  };
}

/**
 * Build the encoded public signals from a witness alone (no snarkjs prove).
 * Matches the layout the program reads. Useful for tests that need to
 * stage signals without running fullProve.
 */
export function encodePublicSignalsFromWitness(w: IncomeWitness): Uint8Array[] {
  return witnessToPublicSignals(w);
}

export const __reexports = { N_UTXOS };
