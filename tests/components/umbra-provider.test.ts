import { describe, expect, it, vi } from "vitest";
import {
  checkIsRegistered,
  type UmbraUserAccountQueryResult,
} from "../../components/umbra-provider";

const ADDR = "HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV";

function nonZeroKey(): Uint8Array {
  const buf = new Uint8Array(32);
  buf[0] = 0xc3;
  buf[1] = 0xc4;
  buf[31] = 0x44;
  return buf;
}

describe("checkIsRegistered", () => {
  it("returns true when state==='exists' and x25519PublicKey is non-zero", async () => {
    // #given
    const account: UmbraUserAccountQueryResult = {
      state: "exists",
      data: { x25519PublicKey: nonZeroKey() },
    };
    const query = vi.fn().mockResolvedValue(account);
    // #when
    const result = await checkIsRegistered(query, ADDR);
    // #then
    expect(result).toBe(true);
    expect(query).toHaveBeenCalledWith(ADDR);
  });

  it("returns false when state==='exists' but x25519PublicKey is all zero (G76 trap)", async () => {
    // #given
    const account: UmbraUserAccountQueryResult = {
      state: "exists",
      data: { x25519PublicKey: new Uint8Array(32) },
    };
    const query = vi.fn().mockResolvedValue(account);
    // #when
    const result = await checkIsRegistered(query, ADDR);
    // #then
    expect(result).toBe(false);
  });

  it("returns false when state==='exists' but x25519PublicKey is missing", async () => {
    // #given
    const account: UmbraUserAccountQueryResult = { state: "exists", data: {} };
    const query = vi.fn().mockResolvedValue(account);
    // #when
    const result = await checkIsRegistered(query, ADDR);
    // #then
    expect(result).toBe(false);
  });

  it("returns false when state==='non_existent'", async () => {
    // #given
    const account: UmbraUserAccountQueryResult = { state: "non_existent" };
    const query = vi.fn().mockResolvedValue(account);
    // #when
    const result = await checkIsRegistered(query, ADDR);
    // #then
    expect(result).toBe(false);
  });

  it("treats 'Account does not exist' errors as not-registered", async () => {
    // #given
    const query = vi.fn().mockRejectedValue(new Error("Account does not exist"));
    // #when
    const result = await checkIsRegistered(query, ADDR);
    // #then
    expect(result).toBe(false);
  });

  it("propagates other errors so RPC outages aren't masked", async () => {
    // #given
    const rpcError = new Error("connection refused");
    const query = vi.fn().mockRejectedValue(rpcError);
    // #when / #then
    await expect(checkIsRegistered(query, ADDR)).rejects.toBe(rpcError);
  });

  it("accepts plain number[] x25519 keys (SDK serialization fallback)", async () => {
    // #given
    const numericKey = Array.from(nonZeroKey());
    const account = {
      state: "exists",
      data: { x25519PublicKey: numericKey },
    } as unknown as UmbraUserAccountQueryResult;
    const query = vi.fn().mockResolvedValue(account);
    // #when
    const result = await checkIsRegistered(query, ADDR);
    // #then
    expect(result).toBe(true);
  });

  it("regression: rejects the previously-buggy call shape (no address arg)", async () => {
    // The pre-fix code path called querier() with no arg and the SDK threw
    // `Failed to derive user account PDA: Cannot read properties of undefined`.
    // With the fix, the helper always passes the signer address through. We
    // assert the address is forwarded so that regression can't recur.
    // #given
    const query = vi.fn(async (a: string) => {
      if (!a) throw new Error("Failed to derive user account PDA");
      return { state: "non_existent" } satisfies UmbraUserAccountQueryResult;
    });
    // #when
    await checkIsRegistered(query, ADDR);
    // #then
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(ADDR);
  });
});
