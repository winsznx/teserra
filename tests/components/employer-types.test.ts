import { describe, expect, it } from "vitest";

import {
  DEPOSIT_STAGES,
  USDC_DECIMALS,
  atomicToUsdc,
  usdcAmountToAtomic,
} from "../../components/employer/types";

describe("usdcAmountToAtomic", () => {
  it("converts integer dollar amounts at 6 decimal precision", () => {
    // #then
    expect(usdcAmountToAtomic(1)).toBe(BigInt(1_000_000));
    expect(usdcAmountToAtomic(1000)).toBe(BigInt(1_000_000_000));
  });

  it("rounds to the nearest atomic unit beyond 6 dp", () => {
    // #then
    expect(usdcAmountToAtomic(1.234567)).toBe(BigInt(1_234_567));
    expect(usdcAmountToAtomic(0.0000004)).toBe(BigInt(0));
  });

  it("returns 0n on non-positive / non-finite input", () => {
    // #then
    expect(usdcAmountToAtomic(0)).toBe(BigInt(0));
    expect(usdcAmountToAtomic(-1)).toBe(BigInt(0));
    expect(usdcAmountToAtomic(Number.NaN)).toBe(BigInt(0));
  });
});

describe("atomicToUsdc", () => {
  it("formats whole units without trailing zeros", () => {
    // #then
    expect(atomicToUsdc(BigInt(1_000_000))).toBe("1");
    expect(atomicToUsdc(BigInt(0))).toBe("0");
  });

  it("formats fractional units with the right precision", () => {
    // #then
    expect(atomicToUsdc(BigInt(1_500_000))).toBe("1.5");
    expect(atomicToUsdc(BigInt(1_234_567))).toBe("1.234567");
  });

  it("strips redundant trailing zeros", () => {
    // #then
    expect(atomicToUsdc(BigInt(2_500_000))).toBe("2.5");
    expect(atomicToUsdc(BigInt(2_000_000))).toBe("2");
  });
});

describe("DEPOSIT_STAGES", () => {
  it("matches PRD §11.3 verbatim labels", () => {
    // #then
    expect(DEPOSIT_STAGES.map((s) => s.label)).toEqual([
      "Submitted to Solana",
      "Encrypting via Arcium MPC",
      "UTXO committed",
    ]);
  });

  it("uses the lib/umbra-deposit DepositStage IDs", () => {
    // #then
    expect(DEPOSIT_STAGES.map((s) => s.id)).toEqual([
      "submitted",
      "mpc-computing",
      "committed",
    ]);
  });
});

describe("USDC_DECIMALS constant", () => {
  it("matches the Umbra dUSDC mint precision", () => {
    // #then
    expect(USDC_DECIMALS).toBe(6);
  });
});
