import { describe, expect, it } from "vitest";

import {
  formatAgentEvent,
  formatTime,
  type WireAgentEvent,
} from "../../components/agent/event-formatter";

const TS = 1_777_976_400_000; // 2026-05-05 ~10:00 local

describe("formatTime", () => {
  it("renders HH:MM:SS in 24h local format", () => {
    // #given/then
    expect(formatTime(TS)).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});

describe("formatAgentEvent", () => {
  it("agent.spawned renders the umbra address short form", () => {
    // #given
    const e: WireAgentEvent = {
      type: "agent.spawned",
      ts: TS,
      agentPubkey: "HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV",
      umbraAddress: "HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV",
    };
    // #when
    const row = formatAgentEvent(e);
    // #then
    expect(row.type).toBe("agent.spawned");
    expect(row.status).toBe("success");
    expect(row.description).toContain("HqDXW3...EVhV");
    expect(row.payload.umbra).toBe("HqDXW3...EVhV");
  });

  it("payment.received renders amount in dUSDC and short tx", () => {
    // #given (atomic 500_000 = 0.5 dUSDC at 6 decimals)
    const e: WireAgentEvent = {
      type: "payment.received",
      ts: TS,
      amount: "500000",
      from: "AlIcE",
      txSig: "QUEUE_SIG_FULL_LENGTH_AAAAAAAAAAAAAAAAAA",
    };
    // #when
    const row = formatAgentEvent(e);
    // #then
    expect(row.status).toBe("success");
    expect(row.description).toBe("Received 0.5 dUSDC private payment");
    expect(row.payload.amount).toBe("0.5 dUSDC");
    expect(row.payload.tx).toMatch(/^QUEUE_SI\.\.\..{4}$/);
  });

  it("payment.received with error txSig renders as failure", () => {
    // #given
    const e: WireAgentEvent = {
      type: "payment.received",
      ts: TS,
      amount: "0",
      from: "AlIcE",
      txSig: "error:submitted:rpc unavailable",
    };
    // #when
    const row = formatAgentEvent(e);
    // #then
    expect(row.status).toBe("error");
    expect(row.description).toContain("Payment failed");
  });

  it("proof.generating is in-progress with threshold dUSDC", () => {
    // #given
    const e: WireAgentEvent = {
      type: "proof.generating",
      ts: TS,
      threshold: "1500000000",
      rangeMs: [TS - 86_400_000, TS],
    };
    // #when
    const row = formatAgentEvent(e);
    // #then
    expect(row.status).toBe("in-progress");
    expect(row.description).toBe("Generating ZK proof for income range...");
    expect(row.payload.threshold).toBe("1,500 dUSDC");
  });

  it("proof.complete with verifies=true is success with duration", () => {
    // #given
    const e: WireAgentEvent = {
      type: "proof.complete",
      ts: TS,
      durationMs: 2_134,
      verifies: true,
    };
    // #when
    const row = formatAgentEvent(e);
    // #then
    expect(row.status).toBe("success");
    expect(row.description).toBe("Proof verified ✓ (2,134ms)");
  });

  it("proof.complete with verifies=false honestly surfaces G125", () => {
    // #given
    const e: WireAgentEvent = {
      type: "proof.complete",
      ts: TS,
      durationMs: 50,
      verifies: false,
    };
    // #when
    const row = formatAgentEvent(e);
    // #then
    expect(row.status).toBe("error");
    expect(row.description).toContain("G125");
    expect(row.description).toContain("scanner");
  });

  it("credential.minted renders the credential PDA short form", () => {
    // #given
    const e: WireAgentEvent = {
      type: "credential.minted",
      ts: TS,
      credentialPda: "BPSRtkvuqKpuaK1mSY3LgqtcZqupzz8FZdQ1GrKvDaFz",
      cnftAssetId: "BqYFcy1S",
      txSig: "GaVFR3fRgusRQT2cXV7j1GEhFpGNqd2tjHdQF8NcJz2r",
    };
    // #when
    const row = formatAgentEvent(e);
    // #then
    expect(row.status).toBe("success");
    expect(row.description).toContain("BPSRtk...DaFz");
  });

  it("x402.outbound is in-progress before deposit settles, success after", () => {
    // #given the pre-deposit emit
    const before: WireAgentEvent = {
      type: "x402.outbound",
      ts: TS,
      serviceUrl: "http://localhost:3000/api/x402/charge",
      amount: "10000",
      txSig: "",
    };
    // #when
    const beforeRow = formatAgentEvent(before);
    // #then
    expect(beforeRow.status).toBe("in-progress");
    expect(beforeRow.description).toContain("Calling");

    // #given the post-deposit emit
    const after: WireAgentEvent = {
      type: "x402.outbound",
      ts: TS,
      serviceUrl: "http://localhost:3000/api/x402/charge",
      amount: "10000",
      txSig: "YKN5mf83p7JRViVTsC74hTXM3yUkA8e2vGc2Yu9Wm9pWL96tFtvP",
    };
    // #when
    const afterRow = formatAgentEvent(after);
    // #then
    expect(afterRow.status).toBe("success");
    expect(afterRow.description).toContain("Paid");
  });

  it("x402.inbound is success when verified, error otherwise", () => {
    // #given
    const verified: WireAgentEvent = {
      type: "x402.inbound",
      ts: TS,
      from: "<umbra-hidden-sender>",
      amount: "10000",
      verified: true,
    };
    const unverified = { ...verified, verified: false };
    // #when/then
    expect(formatAgentEvent(verified).status).toBe("success");
    expect(formatAgentEvent(unverified).status).toBe("error");
  });

  it("x402.confirmed renders duration", () => {
    // #given
    const e: WireAgentEvent = {
      type: "x402.confirmed",
      ts: TS,
      serviceUrl: "http://localhost:3000/api/x402/charge",
      durationMs: 22_345,
    };
    // #when
    const row = formatAgentEvent(e);
    // #then
    expect(row.status).toBe("success");
    expect(row.description).toBe("Service responded ✓ (22,345ms)");
  });

  it("unknown event types fall through to a sensible default row", () => {
    // #given
    const e: WireAgentEvent = { type: "future.event", ts: TS, hello: "world" };
    // #when
    const row = formatAgentEvent(e);
    // #then
    expect(row.type).toBe("future.event");
    expect(row.status).toBe("in-progress");
    expect(row.description).toBe("future.event");
  });
});
