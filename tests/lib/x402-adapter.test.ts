import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Umbra SDK so payX402Private's transitive shieldDeposit doesn't
// hit the network. Each x402 unit test that exercises the client path swaps
// in its own implementation via `vi.mocked(...).mockImplementation(...)`.
vi.mock("@umbra-privacy/sdk", () => ({
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction: () => async () => ({
    queueSignature: "MOCK_QUEUE_SIG",
    callbackStatus: "finalized" as const,
    callbackSignature: "MOCK_CB_SIG",
    callbackElapsedMs: 80,
  }),
}));

import { PublicKey } from "@solana/web3.js";

import {
  bufferContainsNonce,
  build402Challenge,
  generateNonce,
  isValidNonce,
  nonceToOptionalData,
  payX402Private,
  verifyX402Payment,
  __resetVerifyCacheForTests,
  type X402PaymentProof,
  type UmbraPaymentRequirement,
} from "../../lib/x402-adapter";
import { UMBRA_PROGRAM_ID } from "../../lib/constants";

const RECIPIENT = "HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV";
const TOKEN = "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7";

describe("nonce helpers", () => {
  it("generateNonce produces 64-char lowercase hex", () => {
    // #given
    const nonce = generateNonce();
    // #then
    expect(nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(isValidNonce(nonce)).toBe(true);
  });

  it("rejects malformed nonces", () => {
    // #then
    expect(isValidNonce("")).toBe(false);
    expect(isValidNonce("not-hex")).toBe(false);
    expect(isValidNonce("a".repeat(63))).toBe(false);
    expect(isValidNonce("z".repeat(64))).toBe(false);
  });

  it("nonceToOptionalData round-trips through bufferContainsNonce", () => {
    // #given
    const nonce = "deadbeef".repeat(8);
    const data = new Uint8Array(96);
    // Place the nonce bytes at offset 32 — verifyX402Payment uses sliding
    // window matching since the SDK doesn't pin optional_data's offset.
    data.set(nonceToOptionalData(nonce), 32);
    // #then
    expect(bufferContainsNonce(data, nonce)).toBe(true);
  });

  it("bufferContainsNonce returns false when bytes don't appear", () => {
    // #given
    const nonce = "ab".repeat(32);
    const haystack = new Uint8Array(64);
    // #then
    expect(bufferContainsNonce(haystack, nonce)).toBe(false);
  });
});

describe("build402Challenge", () => {
  it("emits a single umbra-private accept entry with stringified amount", () => {
    // #when
    const { challenge, requirement } = build402Challenge({
      recipientUmbraAddress: RECIPIENT,
      amount: BigInt(10_000),
      token: TOKEN,
      description: "test",
      ttlSeconds: 60,
    });
    // #then
    expect(challenge.x402Version).toBe(1);
    expect(challenge.accepts).toHaveLength(1);
    const accept = challenge.accepts[0];
    expect(accept.scheme).toBe("umbra-private");
    expect(accept.recipient).toBe(RECIPIENT);
    expect(accept.amount).toBe("10000");
    expect(accept.token).toBe(TOKEN);
    expect(accept.nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(accept.extra?.description).toBe("test");
    expect(requirement.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

// ── Mock Connection scaffolding for verifyX402Payment ──────────────────

const COMPUTATION_ACCOUNT = "Comp1AB1NkVfBRhRzHrcGDsbCmFLnEa9GpHxUNBb1234";
const RECIPIENT_KEY = RECIPIENT;

interface InstructionFixture {
  programIdIndex: number;
  data: Uint8Array;
  accountKeyIndexes: number[];
}

function makeDepositTx(opts: {
  err?: unknown;
  blockTime?: number;
  nonce?: string;
  excludeUmbraIx?: boolean;
  excludeRecipient?: boolean;
  excludeToken?: boolean;
}) {
  const accountKeys: string[] = [];
  const push = (key: string) => {
    accountKeys.push(key);
    return accountKeys.length - 1;
  };
  const programIdx = push(UMBRA_PROGRAM_ID);
  const recipientIdx = opts.excludeRecipient
    ? push("11111111111111111111111111111111")
    : push(RECIPIENT_KEY);
  const compAcctIdx = push(COMPUTATION_ACCOUNT);
  const tokenIdx = opts.excludeToken ? push("11111111111111111111111111111111") : push(TOKEN);

  const data = new Uint8Array(80);
  if (opts.nonce) {
    data.set(nonceToOptionalData(opts.nonce), 16);
  }

  const instruction: InstructionFixture = {
    programIdIndex: programIdx,
    data,
    accountKeyIndexes: [recipientIdx, compAcctIdx, tokenIdx],
  };

  return {
    blockTime: opts.blockTime ?? Math.floor(Date.now() / 1000),
    meta: {
      err: opts.err ?? null,
      innerInstructions: [],
      logMessages: [],
    },
    transaction: {
      message: {
        accountKeys: accountKeys.map((k) => new PublicKey(k)),
        compiledInstructions: opts.excludeUmbraIx ? [] : [instruction],
      },
    },
  };
}

function makeCallbackTx(success: boolean) {
  return {
    blockTime: Math.floor(Date.now() / 1000),
    meta: {
      err: success ? null : "InstructionError",
      innerInstructions: [],
      logMessages: success
        ? ["Program log: Umbra:Callback finalized for deposit"]
        : ["Program log: Umbra:Callback failed: insufficient funds"],
    },
    transaction: {
      message: {
        accountKeys: [],
        compiledInstructions: [],
      },
    },
  };
}

interface MockConnectionState {
  txByEither: Map<string, ReturnType<typeof makeDepositTx>>;
  callbacks: { signature: string; err: unknown }[];
  callbackTxs: Map<string, ReturnType<typeof makeCallbackTx>>;
  ownerByAddress: Map<string, string>;
  getTransactionCalls: number;
}

function makeConnection(state: MockConnectionState) {
  return {
    getTransaction: vi.fn(async (sig: string) => {
      state.getTransactionCalls += 1;
      return state.txByEither.get(sig) ?? state.callbackTxs.get(sig) ?? null;
    }),
    getSignaturesForAddress: vi.fn(async () => state.callbacks),
    getAccountInfo: vi.fn(async (key: PublicKey) => {
      const owner = state.ownerByAddress.get(key.toBase58());
      if (!owner) return null;
      return { owner: new PublicKey(owner) };
    }),
  };
}

const NONCE = "ab".repeat(32);
const TX_SIG = "depositSig11111111111111111111111111111111";

const baseRequirement: UmbraPaymentRequirement = {
  recipientUmbraAddress: RECIPIENT,
  amount: BigInt(10_000),
  token: TOKEN,
  nonce: NONCE,
  expiresAt: Math.floor(Date.now() / 1000) + 60,
};

function baseProof(): X402PaymentProof {
  return { scheme: "umbra-private", txSignature: TX_SIG, nonce: NONCE };
}

describe("verifyX402Payment", () => {
  beforeEach(() => {
    __resetVerifyCacheForTests();
  });

  afterEach(() => {
    __resetVerifyCacheForTests();
  });

  it("returns 'tx-not-found' when getTransaction yields null", async () => {
    // #given
    const state: MockConnectionState = {
      txByEither: new Map(),
      callbacks: [],
      callbackTxs: new Map(),
      ownerByAddress: new Map(),
      getTransactionCalls: 0,
    };
    const conn = makeConnection(state);
    // #when
    const result = await verifyX402Payment(conn as never, baseProof(), baseRequirement);
    // #then
    expect(result).toEqual({ ok: false, reason: "tx-not-found" });
  });

  it("returns 'tx-failed' when meta.err is set", async () => {
    // #given
    const state: MockConnectionState = {
      txByEither: new Map([[TX_SIG, makeDepositTx({ err: "InstructionError", nonce: NONCE })]]),
      callbacks: [],
      callbackTxs: new Map(),
      ownerByAddress: new Map(),
      getTransactionCalls: 0,
    };
    // #when
    const result = await verifyX402Payment(makeConnection(state) as never, baseProof(), baseRequirement);
    // #then
    expect(result).toEqual({ ok: false, reason: "tx-failed" });
  });

  it("returns 'no-umbra-cpi' when the deposit tx has no Umbra invocation", async () => {
    // #given
    const state: MockConnectionState = {
      txByEither: new Map([[TX_SIG, makeDepositTx({ nonce: NONCE, excludeUmbraIx: true })]]),
      callbacks: [],
      callbackTxs: new Map(),
      ownerByAddress: new Map(),
      getTransactionCalls: 0,
    };
    // #when
    const result = await verifyX402Payment(makeConnection(state) as never, baseProof(), baseRequirement);
    // #then
    expect(result).toEqual({ ok: false, reason: "no-umbra-cpi" });
  });

  it("returns 'wrong-recipient' when the recipient isn't in the Umbra ix accounts", async () => {
    // #given
    const state: MockConnectionState = {
      txByEither: new Map([[TX_SIG, makeDepositTx({ nonce: NONCE, excludeRecipient: true })]]),
      callbacks: [],
      callbackTxs: new Map(),
      ownerByAddress: new Map(),
      getTransactionCalls: 0,
    };
    // #when
    const result = await verifyX402Payment(makeConnection(state) as never, baseProof(), baseRequirement);
    // #then
    expect(result).toEqual({ ok: false, reason: "wrong-recipient" });
  });

  it("returns 'wrong-nonce' when proof.nonce ≠ expected.nonce", async () => {
    // #given a fresh tx with the expected nonce, but the proof carries a
    //         different one
    const state: MockConnectionState = {
      txByEither: new Map([[TX_SIG, makeDepositTx({ nonce: NONCE })]]),
      callbacks: [],
      callbackTxs: new Map(),
      ownerByAddress: new Map(),
      getTransactionCalls: 0,
    };
    const proof: X402PaymentProof = { ...baseProof(), nonce: "ff".repeat(32) };
    // #when
    const result = await verifyX402Payment(makeConnection(state) as never, proof, baseRequirement);
    // #then
    expect(result).toEqual({ ok: false, reason: "wrong-nonce" });
  });

  it("returns 'wrong-nonce' when the deposit tx doesn't carry the expected nonce bytes", async () => {
    // #given the tx encodes a different nonce inside its instruction data
    const state: MockConnectionState = {
      txByEither: new Map([[TX_SIG, makeDepositTx({ nonce: "cd".repeat(32) })]]),
      callbacks: [],
      callbackTxs: new Map(),
      ownerByAddress: new Map(),
      getTransactionCalls: 0,
    };
    // #when
    const result = await verifyX402Payment(makeConnection(state) as never, baseProof(), baseRequirement);
    // #then
    expect(result).toEqual({ ok: false, reason: "wrong-nonce" });
  });

  it("returns 'expired' when blockTime > requirement.expiresAt", async () => {
    // #given
    const past: UmbraPaymentRequirement = {
      ...baseRequirement,
      expiresAt: Math.floor(Date.now() / 1000) + 1,
    };
    const state: MockConnectionState = {
      txByEither: new Map([
        [
          TX_SIG,
          makeDepositTx({ nonce: NONCE, blockTime: Math.floor(Date.now() / 1000) + 999 }),
        ],
      ]),
      callbacks: [],
      callbackTxs: new Map(),
      ownerByAddress: new Map(),
      getTransactionCalls: 0,
    };
    // #when
    const result = await verifyX402Payment(makeConnection(state) as never, baseProof(), past);
    // #then
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("returns 'no-callback' when no successful callback signature exists", async () => {
    // #given the tx is fine, the computation_account has no callbacks
    const state: MockConnectionState = {
      txByEither: new Map([[TX_SIG, makeDepositTx({ nonce: NONCE })]]),
      callbacks: [],
      callbackTxs: new Map(),
      ownerByAddress: new Map([[COMPUTATION_ACCOUNT, UMBRA_PROGRAM_ID]]),
      getTransactionCalls: 0,
    };
    // #when
    const result = await verifyX402Payment(makeConnection(state) as never, baseProof(), baseRequirement);
    // #then
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no-callback");
    expect(result.computationAccount).toBe(COMPUTATION_ACCOUNT);
  });

  it("returns ok:true on the happy path with a finalized callback", async () => {
    // #given
    const callbackSig = "cb_sig_" + "1".repeat(80);
    const state: MockConnectionState = {
      txByEither: new Map([[TX_SIG, makeDepositTx({ nonce: NONCE })]]),
      callbacks: [{ signature: callbackSig, err: null }],
      callbackTxs: new Map([[callbackSig, makeCallbackTx(true)]]),
      ownerByAddress: new Map([[COMPUTATION_ACCOUNT, UMBRA_PROGRAM_ID]]),
      getTransactionCalls: 0,
    };
    // #when
    const result = await verifyX402Payment(makeConnection(state) as never, baseProof(), baseRequirement);
    // #then
    expect(result.ok).toBe(true);
    expect(result.computationAccount).toBe(COMPUTATION_ACCOUNT);
    expect(result.callbackTxSignatures).toEqual([callbackSig]);
  });

  it("caches successful verifications to avoid re-fetching the deposit tx", async () => {
    // #given a winning fixture
    const callbackSig = "cb_sig_" + "9".repeat(80);
    const state: MockConnectionState = {
      txByEither: new Map([[TX_SIG, makeDepositTx({ nonce: NONCE })]]),
      callbacks: [{ signature: callbackSig, err: null }],
      callbackTxs: new Map([[callbackSig, makeCallbackTx(true)]]),
      ownerByAddress: new Map([[COMPUTATION_ACCOUNT, UMBRA_PROGRAM_ID]]),
      getTransactionCalls: 0,
    };
    const conn = makeConnection(state);
    // #when
    const a = await verifyX402Payment(conn as never, baseProof(), baseRequirement);
    const b = await verifyX402Payment(conn as never, baseProof(), baseRequirement);
    // #then
    expect(a).toEqual(b);
    // First call hits TX_SIG + the callback tx (2 calls). Second call returns
    // from cache without any RPC.
    expect(conn.getTransaction).toHaveBeenCalledTimes(2);
  });
});

describe("payX402Private", () => {
  it("calls shieldDeposit with the nonce embedded in optional_data", async () => {
    // #given a challenge built from the same helper the server uses
    const { challenge } = build402Challenge({
      recipientUmbraAddress: RECIPIENT,
      amount: BigInt(10_000),
      token: TOKEN,
      ttlSeconds: 60,
    });
    // #when
    const proof = await payX402Private({} as unknown, challenge);
    // #then
    expect(proof.scheme).toBe("umbra-private");
    expect(proof.txSignature).toBe("MOCK_QUEUE_SIG");
    expect(proof.nonce).toBe(challenge.accepts[0].nonce);
  });
});
