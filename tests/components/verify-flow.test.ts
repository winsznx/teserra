import { describe, expect, it, vi } from "vitest";
import { PublicKey } from "@solana/web3.js";

import {
  atomicToUsdc,
  runVerification,
  usdcToAtomic,
  type VerifyDeps,
} from "../../components/verify/verify-flow";

const OWNER = new PublicKey("HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV");
const PDA = new PublicKey("BPSRtkvuqKpuaK1mSY3LgqtcZqupzz8FZdQ1GrKvDaFz");

function deps(overrides: Partial<VerifyDeps> = {}): VerifyDeps {
  return {
    findMostRecentByOwner: vi.fn().mockResolvedValue({
      pda: PDA,
      issuedAt: BigInt(1_700_000_000),
      expiresAt: BigInt(1_710_000_000),
    }),
    verify: vi.fn().mockResolvedValue({
      valid: true,
      threshold: BigInt(3_000_000_000),
      expiresAt: 1_710_000_000,
      reason: 0 as const,
    }),
    ...overrides,
  };
}

describe("runVerification", () => {
  describe("happy path", () => {
    it("returns kind='approved' with the credential threshold + expiry", async () => {
      // #given
      const d = deps();
      // #when
      const out = await runVerification(d, OWNER, BigInt(1_500_000_000));
      // #then
      expect(out.kind).toBe("approved");
      expect(out.required).toBe(BigInt(1_500_000_000));
      expect(out.existing).toBe(BigInt(3_000_000_000));
      expect(out.expiresAt).toBe(1_710_000_000);
      expect(out.credentialPda?.toBase58()).toBe(PDA.toBase58());
      expect(d.verify).toHaveBeenCalledWith(PDA, BigInt(1_500_000_000));
    });
  });

  describe("denial paths", () => {
    it("returns 'no-credential' when the owner has no credentials", async () => {
      // #given
      const d = deps({
        findMostRecentByOwner: vi.fn().mockResolvedValue(null),
      });
      // #when
      const out = await runVerification(d, OWNER, BigInt(1_500_000_000));
      // #then
      expect(out.kind).toBe("no-credential");
      expect(out.required).toBe(BigInt(1_500_000_000));
      expect(d.verify).not.toHaveBeenCalled();
    });

    it("returns 'below-threshold' when verify_credential reports reason=2", async () => {
      // #given
      const d = deps({
        verify: vi.fn().mockResolvedValue({
          valid: false,
          threshold: BigInt(1_000_000_000),
          expiresAt: 1_710_000_000,
          reason: 2 as const,
        }),
      });
      // #when
      const out = await runVerification(d, OWNER, BigInt(5_000_000_000));
      // #then
      expect(out.kind).toBe("below-threshold");
      expect(out.existing).toBe(BigInt(1_000_000_000));
      expect(out.required).toBe(BigInt(5_000_000_000));
    });

    it("returns 'expired' when verify_credential reports reason=1", async () => {
      // #given
      const d = deps({
        verify: vi.fn().mockResolvedValue({
          valid: false,
          threshold: BigInt(3_000_000_000),
          expiresAt: 1_600_000_000,
          reason: 1 as const,
        }),
      });
      // #when
      const out = await runVerification(d, OWNER, BigInt(1_500_000_000));
      // #then
      expect(out.kind).toBe("expired");
      expect(out.expiresAt).toBe(1_600_000_000);
    });
  });

  describe("rpc errors", () => {
    it("reports rpc-error when the owner lookup throws", async () => {
      // #given
      const d = deps({
        findMostRecentByOwner: vi.fn().mockRejectedValue(new Error("connection refused")),
      });
      // #when
      const out = await runVerification(d, OWNER, BigInt(1_500_000_000));
      // #then
      expect(out.kind).toBe("rpc-error");
      expect(out.error?.message).toBe("connection refused");
      expect(out.credentialPda).toBeUndefined();
    });

    it("reports rpc-error when verify_credential throws but keeps the PDA", async () => {
      // #given
      const d = deps({
        verify: vi.fn().mockRejectedValue(new Error("RPC down")),
      });
      // #when
      const out = await runVerification(d, OWNER, BigInt(1_500_000_000));
      // #then
      expect(out.kind).toBe("rpc-error");
      expect(out.credentialPda?.toBase58()).toBe(PDA.toBase58());
    });
  });
});

describe("usdcToAtomic / atomicToUsdc", () => {
  it("converts integer dollar amounts at 6 decimals", () => {
    // #then
    expect(usdcToAtomic(1)).toBe(BigInt(1_000_000));
    expect(usdcToAtomic(1500)).toBe(BigInt(1_500_000_000));
  });

  it("clamps non-positive / non-finite input to 0", () => {
    // #then
    expect(usdcToAtomic(0)).toBe(BigInt(0));
    expect(usdcToAtomic(-5)).toBe(BigInt(0));
    expect(usdcToAtomic(Number.NaN)).toBe(BigInt(0));
  });

  it("renders atomic amounts with thousands separators (no fractional digits)", () => {
    // #then
    expect(atomicToUsdc(BigInt(1_000_000))).toBe("1");
    expect(atomicToUsdc(BigInt(1_500_000_000))).toBe("1,500");
  });
});
