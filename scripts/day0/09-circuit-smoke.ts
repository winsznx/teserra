// scripts/day0/09-circuit-smoke.ts
// Smoke test for income_proof v2: single valid UTXO with full Merkle inclusion +
// nullifier + timestamp range checks, plus two negative tests (amount tamper,
// nonce tamper). Uses a synthetic-but-self-consistent depth-20 Merkle tree.
// Real-UTXO end-to-end is gated on G81 (SDK scanner bug); the math under test
// is identical regardless of whether the witness comes from real or synthetic
// data — the negative tests are the load-bearing check.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { logResult, shortError } from "./_lib.ts";

const ID = "09-circuit-smoke";
const HERE = new URL(".", import.meta.url).pathname;
const ROOT = join(HERE, "..", "..");
const PUBLIC_CIRCUITS = join(ROOT, "public", "circuits");

const N = 32;
const DEPTH = 20;

interface PoseidonF {
  toObject(x: unknown): bigint;
}
interface PoseidonHasher {
  (inputs: bigint[]): unknown;
  F: PoseidonF;
}

function buildEmptyArray<T>(n: number, fill: T): T[] { return new Array(n).fill(fill); }

async function buildPoseidon(): Promise<PoseidonHasher> {
  const cl: any = await import("circomlibjs");
  const inst = await cl.buildPoseidon();
  const fn = ((inputs: bigint[]) => inst(inputs)) as PoseidonHasher;
  fn.F = inst.F;
  return fn;
}

function pos(p: PoseidonHasher, a: bigint, b: bigint): bigint {
  return p.F.toObject(p([a, b]));
}

interface SmokeFixture {
  amounts: bigint[];
  isValid: bigint[];
  nonces: bigint[];
  timestamps: bigint[];
  pathElements: bigint[][];
  pathIndices: bigint[][];
  utxoSecrets: bigint[];
  employerSecret: bigint;
  threshold: bigint;
  startTs: bigint;
  endTs: bigint;
  merkleRoot: bigint;
  employerCommitment: bigint;
  nullifierHash: bigint[];
  dateRangeHash: bigint;
}

function buildBaseFixture(p: PoseidonHasher): SmokeFixture {
  const amounts = buildEmptyArray(N, 0n);
  const isValid = buildEmptyArray(N, 0n);
  const nonces  = buildEmptyArray(N, 0n);
  const timestamps = buildEmptyArray(N, 0n);
  const utxoSecrets = buildEmptyArray(N, 0n);
  const pathElements = Array.from({ length: N }, () => buildEmptyArray(DEPTH, 0n));
  const pathIndices  = Array.from({ length: N }, () => buildEmptyArray(DEPTH, 0n));

  // One valid UTXO at index 0.
  const amount = 100_000n;
  const nonce  = 0xDEADBEEFCAFEBABEn;
  const utxoSecret = 0x0123456789ABCDEFn;
  const blockTime = 1_751_000_000n; // 2025-06-27ish

  amounts[0] = amount;
  isValid[0] = 1n;
  nonces[0] = nonce;
  timestamps[0] = blockTime;
  utxoSecrets[0] = utxoSecret;
  // pathElements/pathIndices stay all zero — tree is synthetic, leaf at index 0
  // hashes up against empty siblings (sibling=0 at every level, pathBit=0).

  // Compute the leaf the circuit will compute: Poseidon(Poseidon(amount, nonce), secret).
  const inner = pos(p, amount, nonce);
  const leaf  = pos(p, inner, utxoSecret);

  // Walk the depth-20 Merkle path with siblings = 0, pathBits = 0.
  let node = leaf;
  for (let d = 0; d < DEPTH; d++) {
    node = pos(p, node, 0n);
  }
  const merkleRoot = node;

  // Public bindings.
  const employerSecret = 0x9876543210FEDCBAn;
  const sumValid = amount;
  const threshold = 50_000n;
  const startTs = blockTime - 86_400n;
  const endTs   = blockTime + 86_400n;
  const dateRangeHash = pos(p, startTs, endTs);
  const employerCommitment = pos(p, employerSecret, sumValid);
  const nullifierHash = buildEmptyArray(N, 0n);
  nullifierHash[0] = pos(p, nonce, utxoSecret);

  return {
    amounts, isValid, nonces, timestamps, pathElements, pathIndices, utxoSecrets,
    employerSecret, threshold, startTs, endTs, merkleRoot, employerCommitment,
    nullifierHash, dateRangeHash,
  };
}

function fixtureToWitnessInput(f: SmokeFixture) {
  return {
    amounts:        f.amounts.map(String),
    isValid:        f.isValid.map(String),
    nonces:         f.nonces.map(String),
    timestamps:     f.timestamps.map(String),
    pathElements:   f.pathElements.map(row => row.map(String)),
    pathIndices:    f.pathIndices.map(row => row.map(String)),
    utxoSecrets:    f.utxoSecrets.map(String),
    employerSecret: f.employerSecret.toString(),
    threshold:      f.threshold.toString(),
    startTs:        f.startTs.toString(),
    endTs:          f.endTs.toString(),
    merkleRoot:     f.merkleRoot.toString(),
    employerCommitment: f.employerCommitment.toString(),
    nullifierHash:  f.nullifierHash.map(String),
    dateRangeHash:  f.dateRangeHash.toString(),
  };
}

async function tryProve(snarkjs: any, witness: ReturnType<typeof fixtureToWitnessInput>, wasmPath: string, zkeyPath: string) {
  const t0 = Date.now();
  try {
    const r = await snarkjs.groth16.fullProve(witness, wasmPath, zkeyPath);
    return { ok: true as const, proof: r.proof, publicSignals: r.publicSignals, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false as const, error: shortError(e), ms: Date.now() - t0 };
  }
}

async function main() {
  const t0 = Date.now();

  let snarkjs: any;
  let p: PoseidonHasher;
  try {
    snarkjs = (await import("snarkjs")).default ?? await import("snarkjs");
    p = await buildPoseidon();
  } catch (e) {
    return logResult({ id: ID, status: "FAIL", detail: "snarkjs/circomlibjs import failed", error: shortError(e) });
  }

  const wasmPath = join(PUBLIC_CIRCUITS, "income_proof.wasm");
  const zkeyPath = join(PUBLIC_CIRCUITS, "income_proof_final.zkey");
  const vkPath = join(PUBLIC_CIRCUITS, "verification_key.json");

  // ── Positive case ─────────────────────────────────────────────────────────
  const baseline = buildBaseFixture(p);
  const positive = await tryProve(snarkjs, fixtureToWitnessInput(baseline), wasmPath, zkeyPath);
  if (!positive.ok) {
    return logResult({
      id: ID,
      status: "FAIL",
      detail: "positive smoke: groth16.fullProve threw — circuit + witness inconsistent",
      error: positive.error,
      data: { durationMs: Date.now() - t0 },
    });
  }

  let verifies = false;
  try {
    const vk = JSON.parse(readFileSync(vkPath, "utf8"));
    verifies = await snarkjs.groth16.verify(vk, positive.publicSignals, positive.proof);
  } catch (e) {
    return logResult({
      id: ID,
      status: "FAIL",
      detail: "groth16.verify threw on positive case",
      error: shortError(e),
      data: { durationMs: Date.now() - t0, proveMs: positive.ms },
    });
  }

  // ── Negative test 1: tampered amount ──────────────────────────────────────
  const tamperedAmount = buildBaseFixture(p);
  tamperedAmount.amounts[0] = 200_000n; // claim 2x
  // employerCommitment + sumValid logic adapt — but the circuit's filteredAmounts
  // accumulator will produce 200_000, while the leaf still hashes the original 100_000.
  // The Merkle inclusion check will fail because innerHash(200_000, nonce) != real inner.
  const neg1 = await tryProve(snarkjs, fixtureToWitnessInput(tamperedAmount), wasmPath, zkeyPath);

  // ── Negative test 2: tampered nonce ───────────────────────────────────────
  const tamperedNonce = buildBaseFixture(p);
  tamperedNonce.nonces[0] = tamperedNonce.nonces[0] + 1n;
  // leaf changes; nullifierHash will also change. The fixture's
  // nullifierHash[0] was computed against the original nonce, so the
  // nullifier check will fail. The Merkle inclusion check ALSO fails because
  // the leaf changed but the path elements still target the original root.
  const neg2 = await tryProve(snarkjs, fixtureToWitnessInput(tamperedNonce), wasmPath, zkeyPath);

  const neg1Rejected = !neg1.ok;
  const neg2Rejected = !neg2.ok;
  const negativeTestsRejected = neg1Rejected && neg2Rejected;

  const allOk = verifies && negativeTestsRejected;
  return logResult({
    id: ID,
    status: allOk ? "PASS" : "FAIL",
    detail: allOk
      ? `circuit v2 smoke PASS — proof verified in ${positive.ms}ms; both negative tests rejected witness gen as expected`
      : `circuit v2 smoke FAIL — verifies=${verifies}, neg1Rejected=${neg1Rejected}, neg2Rejected=${neg2Rejected}`,
    data: {
      durationMs: Date.now() - t0,
      proveMs: positive.ms,
      verifies,
      negativeTests: {
        amountTamper: { rejected: neg1Rejected, error: neg1.ok ? null : neg1.error, ms: neg1.ms },
        nonceTamper:  { rejected: neg2Rejected, error: neg2.ok ? null : neg2.error, ms: neg2.ms },
      },
      witnessFixture: {
        kind: "synthetic",
        validUtxoCount: 1,
        merkleDepth: DEPTH,
        amount: "100000",
        threshold: baseline.threshold.toString(),
        merkleRootHex: "0x" + baseline.merkleRoot.toString(16),
        nullifierHashHex: "0x" + baseline.nullifierHash[0].toString(16),
        rationale: "Real-UTXO smoke against deposit 2MKu5W…F6tMxw is gated on G81 (SDK scanner bug); preimages are encrypted in the on-chain ciphertext and need the SDK decryption path.",
      },
      publicSignalsLen: positive.publicSignals.length,
    },
  });
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
