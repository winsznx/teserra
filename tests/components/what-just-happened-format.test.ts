import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";

import {
  outcomeJson,
  shortAddrBase58,
} from "../../components/verify/what-just-happened-format";
import type { VerifyOutcome } from "../../components/verify/verify-flow";

const PDA = new PublicKey("BPSRtkvuqKpuaK1mSY3LgqtcZqupzz8FZdQ1GrKvDaFz");

describe("shortAddrBase58", () => {
  it("renders first 6 + last 4 characters with ellipsis", () => {
    // #given
    const addr = "HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV";
    // #when/#then
    expect(shortAddrBase58(addr)).toBe(`${addr.slice(0, 6)}...${addr.slice(-4)}`);
  });
});

describe("outcomeJson", () => {
  it("renders the approved JSON with valid:true + atomic threshold", () => {
    // #given
    const outcome: VerifyOutcome = {
      kind: "approved",
      required: BigInt(1_500_000_000),
      existing: BigInt(3_000_000_000),
      expiresAt: 1_710_000_000,
      credentialPda: PDA,
    };
    // #when
    const json = outcomeJson(outcome);
    // #then
    expect(json).toContain("valid: true");
    expect(json).toContain("threshold: 3000000000n");
    expect(json).toContain("expires_at: 1710000000");
  });

  it("renders the below-threshold case with valid:false + the existing chain threshold", () => {
    // #given
    const outcome: VerifyOutcome = {
      kind: "below-threshold",
      required: BigInt(5_000_000_000),
      existing: BigInt(1_000_000_000),
      expiresAt: 1_710_000_000,
      credentialPda: PDA,
    };
    // #when
    const json = outcomeJson(outcome);
    // #then
    expect(json).toContain("valid: false");
    expect(json).toContain("threshold: 1000000000n");
  });

  it("renders 'null' for the no-credential case (no on-chain account to read)", () => {
    // #given
    const outcome: VerifyOutcome = {
      kind: "no-credential",
      required: BigInt(1_500_000_000),
    };
    // #when
    const json = outcomeJson(outcome);
    // #then
    expect(json).toBe("null");
  });

  it("renders '{ rpc-error }' for the rpc-error case", () => {
    // #given
    const outcome: VerifyOutcome = {
      kind: "rpc-error",
      required: BigInt(1_500_000_000),
      error: new Error("boom"),
    };
    // #when
    const json = outcomeJson(outcome);
    // #then
    expect(json).toBe("{ rpc-error }");
  });
});
