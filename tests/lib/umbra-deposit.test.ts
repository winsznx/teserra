import { describe, expect, it, vi } from "vitest";

vi.mock("@umbra-privacy/sdk", () => {
  return {
    getPublicBalanceToEncryptedBalanceDirectDepositorFunction: () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedDeposit as any,
  };
});

const mockedDeposit = vi.fn(async (_dest: unknown, _mint: unknown, _amount: unknown, options?: { optionalData?: Uint8Array }) => ({
  queueSignature: "QUEUE_SIG",
  callbackStatus: "finalized" as const,
  callbackSignature: "CB_SIG",
  callbackElapsedMs: 25,
  // The handler captures the optionalData so the test can assert it.
  __captured: options?.optionalData ?? null,
}));

import {
  checkRecipientStatusInner,
  isValidSolanaAddress,
  shieldDeposit,
  type UmbraAccountQueryResult,
} from "../../lib/umbra-deposit";

const ADDR = "HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV";

function nonZeroKey(): Uint8Array {
  const buf = new Uint8Array(32);
  buf[0] = 0xc3;
  buf[1] = 0xc4;
  buf[31] = 0x44;
  return buf;
}

describe("isValidSolanaAddress", () => {
  it("accepts a canonical 44-char base58 pubkey", () => {
    // #then
    expect(isValidSolanaAddress("9xQeRy7vH96Yx4Hp2PkB9zT5wAKpDaj1AAAAAAAAAAAA")).toBe(true);
  });

  it("rejects too-short input", () => {
    // #then
    expect(isValidSolanaAddress("9xQ")).toBe(false);
    expect(isValidSolanaAddress("")).toBe(false);
  });

  it("rejects non-base58 characters", () => {
    // #given
    const withInvalidChar = "9xQeRy7vH96Yx4Hp2PkB9zT5wAKpDaj10ll0AAAAAAA0";
    // #then  (contains '0' and 'l' / 'O' which are NOT in base58)
    expect(isValidSolanaAddress(withInvalidChar)).toBe(false);
  });

  it("rejects too-long strings", () => {
    // #given
    const tooLong = "9".repeat(60);
    // #then
    expect(isValidSolanaAddress(tooLong)).toBe(false);
  });
});

describe("checkRecipientStatusInner (G119 discriminator fix)", () => {
  it("returns ok when state==='exists' and x25519PublicKey is non-zero", async () => {
    // #given
    const account: UmbraAccountQueryResult = {
      state: "exists",
      data: { x25519PublicKey: nonZeroKey() },
    };
    const query = vi.fn().mockResolvedValue(account);
    // #when
    const result = await checkRecipientStatusInner(query, ADDR);
    // #then
    expect(result).toEqual({ ok: true });
    expect(query).toHaveBeenCalledWith(ADDR);
  });

  it("rejects state==='non_existent' with reason='not-registered'", async () => {
    // #given
    const query = vi.fn().mockResolvedValue({ state: "non_existent" } as UmbraAccountQueryResult);
    // #when
    const result = await checkRecipientStatusInner(query, ADDR);
    // #then
    expect(result).toEqual({ ok: false, reason: "not-registered" });
  });

  it("rejects state==='exists' but x25519PublicKey all zero (G76)", async () => {
    // #given
    const account: UmbraAccountQueryResult = {
      state: "exists",
      data: { x25519PublicKey: new Uint8Array(32) },
    };
    const query = vi.fn().mockResolvedValue(account);
    // #when
    const result = await checkRecipientStatusInner(query, ADDR);
    // #then
    expect(result).toEqual({ ok: false, reason: "not-registered" });
  });

  it("rejects state==='exists' but x25519PublicKey missing", async () => {
    // #given
    const account: UmbraAccountQueryResult = { state: "exists", data: {} };
    const query = vi.fn().mockResolvedValue(account);
    // #when
    const result = await checkRecipientStatusInner(query, ADDR);
    // #then
    expect(result).toEqual({ ok: false, reason: "not-registered" });
  });

  it("treats 'Account does not exist' errors as not-registered", async () => {
    // #given
    const query = vi.fn().mockRejectedValue(new Error("Account does not exist"));
    // #when
    const result = await checkRecipientStatusInner(query, ADDR);
    // #then
    expect(result).toEqual({ ok: false, reason: "not-registered" });
  });

  it("returns reason='rpc-error' for other thrown errors", async () => {
    // #given
    const query = vi.fn().mockRejectedValue(new Error("connection refused"));
    // #when
    const result = await checkRecipientStatusInner(query, ADDR);
    // #then
    expect(result).toEqual({ ok: false, reason: "rpc-error" });
  });

  it("accepts plain number[] x25519 keys (SDK serialization fallback)", async () => {
    // #given
    const numericKey = Array.from(nonZeroKey());
    const account = {
      state: "exists",
      data: { x25519PublicKey: numericKey },
    } as unknown as UmbraAccountQueryResult;
    const query = vi.fn().mockResolvedValue(account);
    // #when
    const result = await checkRecipientStatusInner(query, ADDR);
    // #then
    expect(result).toEqual({ ok: true });
  });

  it("regression: pre-fix shape (read account.x25519PublicKey at top level) — under the new shape this is undefined", async () => {
    // The OLD code read `account.x25519PublicKey` directly. With the SDK's
    // discriminated union, the key lives at `account.data.x25519PublicKey`.
    // We assert the new code only consults the nested path.
    // #given
    const account = {
      state: "exists",
      // No top-level x25519PublicKey — only nested under data, as the SDK ships
      data: { x25519PublicKey: nonZeroKey() },
      // Decoy top-level key with all zeros — a regression to the old shape
      // would read this and fail the non-zero check.
      x25519PublicKey: new Uint8Array(32),
    } as unknown as UmbraAccountQueryResult;
    const query = vi.fn().mockResolvedValue(account);
    // #when
    const result = await checkRecipientStatusInner(query, ADDR);
    // #then
    expect(result).toEqual({ ok: true });
  });
});

describe("shieldDeposit optional_data plumbing", () => {
  it("forwards a 32-byte optionalData buffer to the SDK deposit call", async () => {
    // #given
    mockedDeposit.mockClear();
    const optional = new Uint8Array(32);
    optional[0] = 0xab;
    optional[31] = 0xcd;
    // #when
    await shieldDeposit({
      client: { mock: true },
      recipientUmbraAddress: ADDR,
      amount: BigInt(1_000_000),
      mint: "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7",
      optionalData: optional,
    });
    // #then
    expect(mockedDeposit).toHaveBeenCalledTimes(1);
    const callArgs = mockedDeposit.mock.calls[0];
    expect(callArgs[3]?.optionalData).toBeInstanceOf(Uint8Array);
    expect(callArgs[3]?.optionalData?.[0]).toBe(0xab);
    expect(callArgs[3]?.optionalData?.[31]).toBe(0xcd);
  });

  it("omits the options argument when optionalData isn't supplied", async () => {
    // #given
    mockedDeposit.mockClear();
    // #when
    await shieldDeposit({
      client: { mock: true },
      recipientUmbraAddress: ADDR,
      amount: BigInt(1_000_000),
      mint: "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7",
    });
    // #then
    expect(mockedDeposit.mock.calls[0][3]).toBeUndefined();
  });
});
