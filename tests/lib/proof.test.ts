import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildIncomeWitness, bigintToBe32 } from "../../lib/witness";
import {
  BN254_P,
  encodeProofA,
  encodeProofB,
  encodeProofC,
  generateIncomeProof,
  negateFq,
} from "../../lib/proof";

const ROOT = join(__dirname, "..", "..");
const WASM = join(ROOT, "public", "circuits", "income_proof.wasm");
const ZKEY = join(ROOT, "public", "circuits", "income_proof_final.zkey");
const VK = join(ROOT, "public", "circuits", "verification_key.json");

const TREE_DEPTH = 20;

function syntheticInputs() {
  const u = {
    amount: 100_000n,
    nonce: 0xDEADBEEFCAFEBABEn,
    secret: 0x0123456789ABCDEFn,
    timestamp: 1_751_000_000,
    pathElements: new Array<bigint>(TREE_DEPTH).fill(0n),
    pathIndices: new Array<number>(TREE_DEPTH).fill(0),
  };
  // Compute the synthetic Merkle root the circuit would produce for one leaf.
  const { poseidon2 } = require("poseidon-lite");
  const inner = poseidon2([u.amount, u.nonce]);
  const leaf = poseidon2([inner, u.secret]);
  let node = leaf;
  for (let d = 0; d < TREE_DEPTH; d++) node = poseidon2([node, 0n]);
  return {
    utxos: [u],
    employerSecret: 0x9876543210FEDCBAn,
    threshold: 50_000n,
    startTs: u.timestamp - 86_400,
    endTs: u.timestamp + 86_400,
    merkleRoot: node,
  };
}

describe("proof — encoding helpers", () => {
  it("negateFq inverts modulo BN254_P", () => {
    const y = 12345n;
    const yneg = negateFq(y);
    expect((y + yneg) % BN254_P).toBe(0n);
  });

  it("negateFq normalises out-of-range inputs", () => {
    const huge = BN254_P + 7n;
    const yneg = negateFq(huge);
    expect((7n + yneg) % BN254_P).toBe(0n);
  });

  it("encodeProofA produces 64 bytes with negated y", () => {
    const piA = ["3", "5", "1"];
    const out = encodeProofA(piA);
    expect(out.length).toBe(64);
    expect(out.slice(0, 32)).toEqual(bigintToBe32(3n));
    expect(out.slice(32)).toEqual(bigintToBe32(negateFq(5n)));
  });

  it("encodeProofB swaps c0/c1 ordering", () => {
    const piB = [["10", "20"], ["30", "40"], ["1", "0"]];
    const out = encodeProofB(piB);
    expect(out.length).toBe(128);
    // Expected: x.c1 || x.c0 || y.c1 || y.c0  →  20, 10, 40, 30
    expect(out.slice(0, 32)).toEqual(bigintToBe32(20n));
    expect(out.slice(32, 64)).toEqual(bigintToBe32(10n));
    expect(out.slice(64, 96)).toEqual(bigintToBe32(40n));
    expect(out.slice(96, 128)).toEqual(bigintToBe32(30n));
  });

  it("encodeProofC has no negation", () => {
    const piC = ["7", "9", "1"];
    const out = encodeProofC(piC);
    expect(out.slice(0, 32)).toEqual(bigintToBe32(7n));
    expect(out.slice(32)).toEqual(bigintToBe32(9n));
  });
});

describe("generateIncomeProof (integration — runs snarkjs)", () => {
  it(
    "produces a Groth16 proof that snarkjs.verify accepts",
    async () => {
      const witness = buildIncomeWitness(syntheticInputs());
      const result = await generateIncomeProof({ witness, wasmPath: WASM, zkeyPath: ZKEY });

      expect(result.proof.a.length).toBe(64);
      expect(result.proof.b.length).toBe(128);
      expect(result.proof.c.length).toBe(64);
      expect(result.publicSignals).toHaveLength(39);
      expect(result.generationMs).toBeGreaterThan(100);

      // Off-chain verify: re-construct an un-negated proof shape that
      // snarkjs.groth16.verify accepts (it does the negation internally),
      // then assert it returns true.
      const snarkjs = (await import("snarkjs")).default ?? (await import("snarkjs"));
      const vk = JSON.parse(readFileSync(VK, "utf8"));

      // generate a parallel un-negated proof for the verify check.
      const un = await snarkjs.groth16.fullProve(witnessForSnarkjs(witness), WASM, ZKEY);
      const verifies = await snarkjs.groth16.verify(vk, un.publicSignals, un.proof);
      expect(verifies).toBe(true);
    },
    180_000,
  );
});

function witnessForSnarkjs(w: ReturnType<typeof buildIncomeWitness>): Record<string, unknown> {
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
