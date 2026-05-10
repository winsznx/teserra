import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Umbra SDK so Agent.spawn doesn't hit devnet during unit tests.
// Each named export is reachable via `await import("@umbra-privacy/sdk")` —
// vitest's `vi.mock` with a factory works for dynamic imports because the
// module URL resolution is cached on first hit.
vi.mock("@umbra-privacy/sdk", () => ({
  createSignerFromPrivateKeyBytes: (_bytes: Uint8Array) => ({
    address: "MOCK_SIGNER",
  }),
  getUmbraClient: async () => ({ kind: "mock-client" }),
  getUserAccountQuerierFunction: () => async () => ({ state: "non_existent" }),
  getUserRegistrationFunction: () => async () => ({ ok: true }),
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction: () => async () => ({
    queueSignature: "MOCK_QUEUE_SIG",
    callbackStatus: "finalized" as const,
    callbackSignature: "MOCK_CB_SIG",
    callbackElapsedMs: 100,
  }),
}));

import { Keypair } from "@solana/web3.js";

import {
  __resetRegistryForTests,
  eventToWire,
  getAgent,
  listAgents,
  spawnAgent,
  validateCommand,
} from "../../lib/agent-runtime";

beforeEach(() => {
  __resetRegistryForTests();
});

afterEach(() => {
  __resetRegistryForTests();
});

describe("registry", () => {
  it("spawnAgent returns the same instance for the same keypair", async () => {
    // #given
    const kp = Keypair.generate();
    // #when
    const a = await spawnAgent(kp);
    const b = await spawnAgent(kp);
    // #then
    expect(a).toBe(b);
    expect(listAgents()).toHaveLength(1);
  });

  it("getAgent returns null for unknown pubkeys", () => {
    // #then
    expect(getAgent("HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV")).toBeNull();
  });

  it("getAgent returns null after the agent stops", async () => {
    // #given
    const kp = Keypair.generate();
    const agent = await spawnAgent(kp);
    // #when
    agent.stop();
    // #then
    expect(getAgent(agent.pubkey.toBase58())).toBeNull();
    expect(listAgents()).toHaveLength(0);
  });
});

describe("Agent ring buffer + subscribers", () => {
  it("emits 'agent.spawned' on spawn", async () => {
    // #given
    const kp = Keypair.generate();
    // #when
    const agent = await spawnAgent(kp);
    // #then
    const events = agent.getRecentEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("agent.spawned");
    if (events[0].type === "agent.spawned") {
      expect(events[0].agentPubkey).toBe(kp.publicKey.toBase58());
    }
  });

  it("subscribe receives newly emitted events", async () => {
    // #given
    const kp = Keypair.generate();
    const agent = await spawnAgent(kp);
    const captured: string[] = [];
    // #when
    agent.subscribe((e) => captured.push(e.type));
    agent.emit({
      type: "payment.received",
      ts: Date.now(),
      amount: BigInt(100),
      from: "test",
      txSig: "sig",
    });
    // #then
    expect(captured).toEqual(["payment.received"]);
  });

  it("unsubscribe removes the listener", async () => {
    // #given
    const kp = Keypair.generate();
    const agent = await spawnAgent(kp);
    const captured: string[] = [];
    const unsubscribe = agent.subscribe((e) => captured.push(e.type));
    // #when
    unsubscribe();
    agent.emit({
      type: "payment.received",
      ts: Date.now(),
      amount: BigInt(100),
      from: "test",
      txSig: "sig",
    });
    // #then
    expect(captured).toEqual([]);
  });

  it("a throwing subscriber doesn't break emit() for siblings", async () => {
    // #given
    const kp = Keypair.generate();
    const agent = await spawnAgent(kp);
    const captured: string[] = [];
    agent.subscribe(() => {
      throw new Error("rude subscriber");
    });
    agent.subscribe((e) => captured.push(e.type));
    // #when
    agent.emit({
      type: "payment.received",
      ts: Date.now(),
      amount: BigInt(0),
      from: "x",
      txSig: "y",
    });
    // #then
    expect(captured).toEqual(["payment.received"]);
  });

  it("ring buffer caps at 256 events, dropping oldest", async () => {
    // #given
    const kp = Keypair.generate();
    const agent = await spawnAgent(kp);
    // agent.spawned already fired, so push 270 more.
    for (let i = 0; i < 270; i++) {
      agent.emit({
        type: "payment.received",
        ts: i,
        amount: BigInt(i),
        from: `from-${i}`,
        txSig: `sig-${i}`,
      });
    }
    // #then
    const events = agent.getRecentEvents();
    expect(events.length).toBe(256);
    // Oldest 'agent.spawned' should be gone — we pushed 270 after it, ring
    // capacity is 256 so we evicted the first 15 (1 spawned + 14 of the 270),
    // leaving from-14 at the head.
    const firstReceived = events[0];
    expect(firstReceived.type).toBe("payment.received");
    if (firstReceived.type === "payment.received") {
      expect(firstReceived.from).toBe("from-14");
    }
  });
});

describe("Agent commands", () => {
  it("pay-x402 emits outbound (with txSig) → confirmed via the real round-trip flow", async () => {
    // #given a mocked service that issues a challenge then accepts payment
    const challenge = {
      x402Version: 1 as const,
      accepts: [
        {
          scheme: "umbra-private" as const,
          network: "solana-devnet" as const,
          recipient: "HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV",
          amount: "1000000",
          token: "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7",
          nonce: "ab".repeat(32),
          expiresAt: Math.floor(Date.now() / 1000) + 60,
        },
      ],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (_url: string | URL | Request, init?: RequestInit) => {
        if (init?.headers && (init.headers as Record<string, string>)["x-payment"]) {
          return new Response(JSON.stringify({ result: "ok" }), { status: 200 });
        }
        return new Response(JSON.stringify(challenge), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      },
    );

    const kp = Keypair.generate();
    const agent = await spawnAgent(kp);
    const captured: { type: string; txSig?: string }[] = [];
    agent.subscribe((e) => {
      if (e.type === "x402.outbound") captured.push({ type: e.type, txSig: e.txSig });
      else captured.push({ type: e.type });
    });
    // #when
    await agent.command({
      type: "pay-x402",
      serviceUrl: "https://example.com/x402",
      amount: BigInt(1_000_000),
      nonce: "abc",
    });
    // #then
    const types = captured.map((c) => c.type);
    expect(types).toContain("x402.outbound");
    expect(types).toContain("x402.confirmed");
    expect(types.indexOf("x402.outbound")).toBeLessThan(types.indexOf("x402.confirmed"));
    // The first outbound is fired before the deposit ("" txSig); the second
    // one carries the queueSignature returned by the mocked SDK deposit.
    const outbounds = captured.filter((c) => c.type === "x402.outbound");
    expect(outbounds[outbounds.length - 1].txSig).toBe("MOCK_QUEUE_SIG");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it("mint-credential emits proof.generating + proof.complete (verifies=false until G81 fix)", async () => {
    // #given
    const kp = Keypair.generate();
    const agent = await spawnAgent(kp);
    const captured: { type: string; verifies?: boolean }[] = [];
    agent.subscribe((e) => {
      if (e.type === "proof.complete") {
        captured.push({ type: e.type, verifies: e.verifies });
      } else {
        captured.push({ type: e.type });
      }
    });
    // #when
    await agent.command({
      type: "mint-credential",
      threshold: BigInt(1_500_000_000),
      startTs: 1_700_000_000,
      endTs: 1_710_000_000,
    });
    // #then
    const proofComplete = captured.find((c) => c.type === "proof.complete");
    expect(captured.map((c) => c.type)).toContain("proof.generating");
    expect(proofComplete?.verifies).toBe(false);
  });

  it("ack-incoming-payment emits payment.received with the supplied tx and amount", async () => {
    // #given
    const kp = Keypair.generate();
    const agent = await spawnAgent(kp);
    const captured: { type: string; amount?: bigint; from?: string; txSig?: string }[] = [];
    agent.subscribe((e) => {
      if (e.type === "payment.received") {
        captured.push({ type: e.type, amount: e.amount, from: e.from, txSig: e.txSig });
      } else {
        captured.push({ type: e.type });
      }
    });
    // #when
    await agent.command({
      type: "ack-incoming-payment",
      txSignature: "ACK_TX_SIG_1234",
      amount: BigInt(500_000),
      fromUmbraAddress: "AlIcEpubkey1234567890",
    });
    // #then
    const received = captured.find((c) => c.type === "payment.received");
    expect(received).toBeDefined();
    expect(received?.amount).toBe(BigInt(500_000));
    expect(received?.from).toBe("AlIcEpubkey1234567890");
    expect(received?.txSig).toBe("ACK_TX_SIG_1234");
  });

  it("rejects commands after stop()", async () => {
    // #given
    const kp = Keypair.generate();
    const agent = await spawnAgent(kp);
    agent.stop();
    // #when / #then
    await expect(
      agent.command({
        type: "pay-x402",
        serviceUrl: "x",
        amount: BigInt(1),
        nonce: "n",
      }),
    ).rejects.toThrow("agent stopped");
  });
});

describe("validateCommand", () => {
  it("accepts a well-formed pay-x402", () => {
    // #when
    const result = validateCommand({
      type: "pay-x402",
      serviceUrl: "https://service",
      amount: "1500000",
      nonce: "abc",
    });
    // #then
    expect(result).toMatchObject({
      type: "pay-x402",
      serviceUrl: "https://service",
      amount: BigInt(1_500_000),
      nonce: "abc",
    });
  });

  it("accepts a well-formed mint-credential", () => {
    // #when
    const result = validateCommand({
      type: "mint-credential",
      threshold: "1500000000",
      startTs: 1_700_000_000,
      endTs: 1_710_000_000,
    });
    // #then
    expect(result).toMatchObject({
      type: "mint-credential",
      threshold: BigInt(1_500_000_000),
      startTs: 1_700_000_000,
      endTs: 1_710_000_000,
    });
  });

  it("rejects unknown command types", () => {
    // #then
    expect(validateCommand({ type: "drop-tables" })).toEqual({
      error: "unknown command.type: drop-tables",
    });
  });

  it("accepts a well-formed ack-incoming-payment", () => {
    // #when
    const result = validateCommand({
      type: "ack-incoming-payment",
      txSignature: "Q".repeat(64),
      amount: "500000",
      fromUmbraAddress: "AlIcEpubkey1234",
    });
    // #then
    expect(result).toMatchObject({
      type: "ack-incoming-payment",
      amount: BigInt(500_000),
      fromUmbraAddress: "AlIcEpubkey1234",
    });
  });

  it("rejects ack-incoming-payment with empty txSignature", () => {
    // #when
    const result = validateCommand({
      type: "ack-incoming-payment",
      txSignature: "",
      amount: "1",
      fromUmbraAddress: "x",
    });
    // #then
    expect(result).toHaveProperty("error");
  });

  it("rejects pay-x402 with non-positive amount", () => {
    // #then
    const r = validateCommand({
      type: "pay-x402",
      serviceUrl: "https://x",
      amount: "0",
      nonce: "n",
    });
    expect(r).toHaveProperty("error");
  });

  it("rejects mint-credential with startTs >= endTs", () => {
    // #then
    const r = validateCommand({
      type: "mint-credential",
      threshold: "1",
      startTs: 200,
      endTs: 100,
    });
    expect(r).toHaveProperty("error");
  });

  it("rejects non-object input", () => {
    // #then
    expect(validateCommand(null)).toEqual({ error: "command must be an object" });
    expect(validateCommand("hi")).toEqual({ error: "command must be an object" });
  });
});

describe("eventToWire", () => {
  it("converts bigint fields to decimal strings so JSON.stringify survives", () => {
    // #when
    const wire = eventToWire({
      type: "payment.received",
      ts: 123,
      amount: BigInt("9999999999999999999999"),
      from: "alice",
      txSig: "sig",
    });
    // #then
    expect(wire.amount).toBe("9999999999999999999999");
    expect(wire.type).toBe("payment.received");
    expect(JSON.stringify(wire)).toContain('"amount":"9999999999999999999999"');
  });
});
