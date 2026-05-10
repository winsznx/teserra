import { describe, expect, it } from "vitest";
import { poseidon2 } from "poseidon-lite";

import {
  N_UTXOS,
  PUBLIC_SIGNALS_COUNT,
  bigintToBe32,
  buildIncomeWitness,
  decimalSignalsToBytes,
  WitnessValidationError,
  witnessToPublicSignals,
} from "../../lib/witness";

const TREE_DEPTH = 20;

function syntheticUtxo(overrides: Partial<{ amount: bigint; nonce: bigint; secret: bigint; ts: number }> = {}) {
  const amount = overrides.amount ?? 100_000n;
  const nonce = overrides.nonce ?? 0xDEADBEEFCAFEBABEn;
  const secret = overrides.secret ?? 0x0123456789ABCDEFn;
  const ts = overrides.ts ?? 1_751_000_000;
  return {
    amount,
    nonce,
    secret,
    timestamp: ts,
    pathElements: new Array<bigint>(TREE_DEPTH).fill(0n),
    pathIndices: new Array<number>(TREE_DEPTH).fill(0),
  };
}

describe("witness — construction", () => {
  it("builds a valid witness for one UTXO and pads the rest", () => {
    const u = syntheticUtxo();
    const inputs = {
      utxos: [u],
      employerSecret: 0x9876543210FEDCBAn,
      threshold: 50_000n,
      startTs: u.timestamp - 86_400,
      endTs: u.timestamp + 86_400,
      merkleRoot: 12345n,
    };
    const w = buildIncomeWitness(inputs);

    expect(w.amounts).toHaveLength(N_UTXOS);
    expect(w.isValid).toHaveLength(N_UTXOS);
    expect(w.amounts[0]).toBe(u.amount);
    expect(w.isValid[0]).toBe(1n);
    for (let i = 1; i < N_UTXOS; i++) {
      expect(w.amounts[i]).toBe(0n);
      expect(w.isValid[i]).toBe(0n);
      expect(w.nullifierHash[i]).toBe(0n);
    }
    expect(w.nullifierHash[0]).toBe(poseidon2([u.nonce, u.secret]));
    expect(w.employerCommitment).toBe(poseidon2([inputs.employerSecret, u.amount]));
    expect(w.dateRangeHash).toBe(poseidon2([BigInt(inputs.startTs), BigInt(inputs.endTs)]));
    expect(w.pathElements).toHaveLength(N_UTXOS);
    expect(w.pathElements[0]).toHaveLength(TREE_DEPTH);
  });

  it("rejects sum-below-threshold", () => {
    const u = syntheticUtxo({ amount: 1_000n });
    expect(() =>
      buildIncomeWitness({
        utxos: [u],
        employerSecret: 1n,
        threshold: 50_000n,
        startTs: u.timestamp - 100,
        endTs: u.timestamp + 100,
        merkleRoot: 0n,
      }),
    ).toThrow(WitnessValidationError);
  });

  it("rejects timestamps outside the window", () => {
    const u = syntheticUtxo({ ts: 1_700_000_000 });
    expect(() =>
      buildIncomeWitness({
        utxos: [u],
        employerSecret: 1n,
        threshold: 0n,
        startTs: 1_750_000_000,
        endTs: 1_760_000_000,
        merkleRoot: 0n,
      }),
    ).toThrow(WitnessValidationError);
  });

  it("rejects more than 32 utxos", () => {
    const tooMany = Array.from({ length: 33 }, () => syntheticUtxo());
    expect(() =>
      buildIncomeWitness({
        utxos: tooMany,
        employerSecret: 1n,
        threshold: 0n,
        startTs: 1_750_000_000,
        endTs: 1_752_000_000,
        merkleRoot: 0n,
      }),
    ).toThrow(WitnessValidationError);
  });
});

describe("witness — public-signals encoding", () => {
  it("matches the program's IDX_* layout", () => {
    const u = syntheticUtxo();
    const w = buildIncomeWitness({
      utxos: [u],
      employerSecret: 7n,
      threshold: 99n,
      startTs: u.timestamp - 1,
      endTs: u.timestamp + 1,
      merkleRoot: 0xABCDn,
    });
    const sig = witnessToPublicSignals(w);

    expect(sig).toHaveLength(PUBLIC_SIGNALS_COUNT);
    expect(sig[0]).toEqual(bigintToBe32(1n)); // validProof
    expect(sig[1]).toEqual(bigintToBe32(99n)); // threshold
    expect(sig[2]).toEqual(bigintToBe32(BigInt(u.timestamp - 1)));
    expect(sig[3]).toEqual(bigintToBe32(BigInt(u.timestamp + 1)));
    expect(sig[4]).toEqual(bigintToBe32(0xABCDn));
    expect(sig[5]).toEqual(bigintToBe32(poseidon2([7n, u.amount])));
    expect(sig[6]).toEqual(bigintToBe32(poseidon2([u.nonce, u.secret])));
    for (let i = 7; i < 38; i++) {
      expect(sig[i]).toEqual(bigintToBe32(0n));
    }
    expect(sig[38]).toEqual(bigintToBe32(poseidon2([BigInt(u.timestamp - 1), BigInt(u.timestamp + 1)])));
  });

  it("decimalSignalsToBytes round-trips a snarkjs-style array", () => {
    const decimals = ["1", "100000", "0", "0"].concat(new Array(35).fill("0"));
    const bytes = decimalSignalsToBytes(decimals);
    expect(bytes).toHaveLength(PUBLIC_SIGNALS_COUNT);
    expect(bytes[0]).toEqual(bigintToBe32(1n));
    expect(bytes[1]).toEqual(bigintToBe32(100_000n));
  });
});

describe("bigintToBe32", () => {
  it("encodes 0n as 32 zero bytes", () => {
    const b = bigintToBe32(0n);
    expect(b).toHaveLength(32);
    expect(Array.from(b)).toEqual(new Array(32).fill(0));
  });

  it("encodes 1n with last byte = 1", () => {
    const b = bigintToBe32(1n);
    expect(b[31]).toBe(1);
    for (let i = 0; i < 31; i++) expect(b[i]).toBe(0);
  });

  it("rejects negatives + overflow", () => {
    expect(() => bigintToBe32(-1n)).toThrow();
    const tooBig = 1n << 257n;
    expect(() => bigintToBe32(tooBig)).toThrow();
  });
});
