// lib/witness.ts — pure witness builder for income_proof.circom v2.
// No snarkjs, no @coral-xyz/anchor, no I/O. Unit-testable in isolation.
//
// The circuit's public-signal layout (snarkjs convention: outputs first,
// then public inputs in declaration order):
//   [0]      validProof
//   [1]      threshold
//   [2]      startTs
//   [3]      endTs
//   [4]      merkleRoot
//   [5]      employerCommitment
//   [6..38)  nullifierHash[0..32]
//   [38]     dateRangeHash
//
// `witnessToPublicSignals` produces this exact order — must match the
// program's IDX_* constants in programs/tessera/src/verify_income_proof.rs.

import { poseidon2 } from "poseidon-lite";

export const N_UTXOS = 32;
export const TREE_DEPTH = 20;
export const PUBLIC_SIGNALS_COUNT = 39;

export interface UmbraUtxoData {
  amount: bigint;
  nonce: bigint;
  secret: bigint;
  timestamp: number;
  pathElements: bigint[];
  pathIndices: number[];
}

export interface IncomeProofInputs {
  utxos: UmbraUtxoData[];
  employerSecret: bigint;
  threshold: bigint;
  startTs: number;
  endTs: number;
  merkleRoot: bigint;
}

export interface IncomeWitness {
  amounts: bigint[];
  isValid: bigint[];
  nonces: bigint[];
  timestamps: bigint[];
  pathElements: bigint[][];
  pathIndices: bigint[][];
  employerSecret: bigint;
  utxoSecrets: bigint[];
  threshold: bigint;
  startTs: bigint;
  endTs: bigint;
  merkleRoot: bigint;
  employerCommitment: bigint;
  dateRangeHash: bigint;
  nullifierHash: bigint[];
}

export class WitnessValidationError extends Error {
  constructor(public reason: string) {
    super(`witness validation failed: ${reason}`);
    this.name = "WitnessValidationError";
  }
}

function poseidon(a: bigint, b: bigint): bigint {
  return poseidon2([a, b]);
}

export function buildIncomeWitness(inputs: IncomeProofInputs): IncomeWitness {
  if (inputs.utxos.length < 1 || inputs.utxos.length > N_UTXOS) {
    throw new WitnessValidationError(`utxos.length must be in [1, ${N_UTXOS}], got ${inputs.utxos.length}`);
  }
  if (inputs.startTs >= inputs.endTs) {
    throw new WitnessValidationError(`startTs (${inputs.startTs}) must be < endTs (${inputs.endTs})`);
  }
  for (let i = 0; i < inputs.utxos.length; i++) {
    const u = inputs.utxos[i];
    if (u.pathElements.length !== TREE_DEPTH) {
      throw new WitnessValidationError(`utxo[${i}].pathElements.length must be ${TREE_DEPTH}, got ${u.pathElements.length}`);
    }
    if (u.pathIndices.length !== TREE_DEPTH) {
      throw new WitnessValidationError(`utxo[${i}].pathIndices.length must be ${TREE_DEPTH}, got ${u.pathIndices.length}`);
    }
    if (u.timestamp < inputs.startTs || u.timestamp > inputs.endTs) {
      throw new WitnessValidationError(`utxo[${i}].timestamp ${u.timestamp} not in [${inputs.startTs}, ${inputs.endTs}]`);
    }
  }
  const sumValid = inputs.utxos.reduce((s, u) => s + u.amount, 0n);
  if (sumValid < inputs.threshold) {
    throw new WitnessValidationError(`sum of UTXOs (${sumValid}) is below threshold (${inputs.threshold})`);
  }

  const amounts = new Array<bigint>(N_UTXOS).fill(0n);
  const isValid = new Array<bigint>(N_UTXOS).fill(0n);
  const nonces = new Array<bigint>(N_UTXOS).fill(0n);
  const timestamps = new Array<bigint>(N_UTXOS).fill(0n);
  const utxoSecrets = new Array<bigint>(N_UTXOS).fill(0n);
  const pathElements: bigint[][] = Array.from({ length: N_UTXOS }, () => new Array<bigint>(TREE_DEPTH).fill(0n));
  const pathIndices: bigint[][] = Array.from({ length: N_UTXOS }, () => new Array<bigint>(TREE_DEPTH).fill(0n));
  const nullifierHash = new Array<bigint>(N_UTXOS).fill(0n);

  for (let i = 0; i < inputs.utxos.length; i++) {
    const u = inputs.utxos[i];
    amounts[i] = u.amount;
    isValid[i] = 1n;
    nonces[i] = u.nonce;
    timestamps[i] = BigInt(u.timestamp);
    utxoSecrets[i] = u.secret;
    for (let d = 0; d < TREE_DEPTH; d++) {
      pathElements[i][d] = u.pathElements[d];
      pathIndices[i][d] = BigInt(u.pathIndices[d] & 1);
    }
    nullifierHash[i] = poseidon(u.nonce, u.secret);
  }

  const employerCommitment = poseidon(inputs.employerSecret, sumValid);
  const dateRangeHash = poseidon(BigInt(inputs.startTs), BigInt(inputs.endTs));

  return {
    amounts,
    isValid,
    nonces,
    timestamps,
    pathElements,
    pathIndices,
    employerSecret: inputs.employerSecret,
    utxoSecrets,
    threshold: inputs.threshold,
    startTs: BigInt(inputs.startTs),
    endTs: BigInt(inputs.endTs),
    merkleRoot: inputs.merkleRoot,
    employerCommitment,
    dateRangeHash,
    nullifierHash,
  };
}

export function bigintToBe32(x: bigint): Uint8Array {
  if (x < 0n) throw new Error("negative bigint cannot encode to BE32");
  const out = new Uint8Array(32);
  let v = x;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new Error("bigint overflows 32 bytes");
  return out;
}

/**
 * Encode the witness's public signals in the exact order the program reads
 * them. Index layout matches `IDX_*` constants in verify_income_proof.rs.
 *
 * Note: this function is suitable when staging the buffer ahead of a verify
 * that you DON'T expect to fail. If the proof comes from snarkjs.fullProve,
 * use the `publicSignals` array snarkjs returns directly — it has the same
 * order. This helper is the canonical reference for that order.
 */
export function witnessToPublicSignals(w: IncomeWitness): Uint8Array[] {
  const signals = new Array<Uint8Array>(PUBLIC_SIGNALS_COUNT);
  signals[0] = bigintToBe32(1n); // validProof
  signals[1] = bigintToBe32(w.threshold);
  signals[2] = bigintToBe32(w.startTs);
  signals[3] = bigintToBe32(w.endTs);
  signals[4] = bigintToBe32(w.merkleRoot);
  signals[5] = bigintToBe32(w.employerCommitment);
  for (let i = 0; i < N_UTXOS; i++) {
    signals[6 + i] = bigintToBe32(w.nullifierHash[i]);
  }
  signals[6 + N_UTXOS] = bigintToBe32(w.dateRangeHash);
  return signals;
}

export function decimalSignalsToBytes(decimals: string[]): Uint8Array[] {
  if (decimals.length !== PUBLIC_SIGNALS_COUNT) {
    throw new Error(`expected ${PUBLIC_SIGNALS_COUNT} signals, got ${decimals.length}`);
  }
  return decimals.map((s) => bigintToBe32(BigInt(s)));
}
