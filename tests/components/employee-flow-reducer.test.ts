import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";

import {
  flowReducer,
  initialFlowPhase,
  stepperIndexFor,
} from "../../components/employee/employee-flow-reducer";
import type { ProofConfig } from "../../components/employee/types";
import type { RawUmbraUtxo } from "../../lib/umbra-witness";

function utxo(amount: bigint, ts: number): RawUmbraUtxo {
  return {
    amount,
    nonce: 1n,
    secret: 2n,
    timestamp: ts,
    leafIndex: 0,
    merkleProof: new Array(20).fill(0n),
  };
}

const sampleConfig: ProofConfig = {
  threshold: 1_000n,
  startTs: 1_700_000_000,
  endTs: 1_710_000_000,
  filteredUtxos: [utxo(2_000n, 1_705_000_000)],
};

const sampleResult = {
  credentialPda: new PublicKey("11111111111111111111111111111111"),
  cnftAssetId: new PublicKey("11111111111111111111111111111111"),
  proofHashHex: "deadbeef",
  generationMs: 1234,
  verifyTxSig: "abcd",
};

describe("flowReducer", () => {
  describe("scan transitions", () => {
    it("starts scanning from idle", () => {
      // #given
      const state = initialFlowPhase;
      // #when
      const next = flowReducer(state, { type: "scan-start" });
      // #then
      expect(next.kind).toBe("scanning");
    });

    it("transitions scanning → scanned on success", () => {
      // #given
      const state = flowReducer(initialFlowPhase, { type: "scan-start" });
      const utxos = [utxo(1n, 1)];
      // #when
      const next = flowReducer(state, { type: "scan-success", utxos });
      // #then
      expect(next.kind).toBe("scanned");
      if (next.kind === "scanned") expect(next.utxos).toEqual(utxos);
    });

    it("transitions scanning → scan-error on failure", () => {
      // #given
      const state = flowReducer(initialFlowPhase, { type: "scan-start" });
      const error = new Error("rpc down");
      // #when
      const next = flowReducer(state, { type: "scan-failure", error });
      // #then
      expect(next.kind).toBe("scan-error");
      if (next.kind === "scan-error") expect(next.error).toBe(error);
    });

    it("ignores scan-success when not scanning", () => {
      // #given
      const state = initialFlowPhase;
      // #when
      const next = flowReducer(state, { type: "scan-success", utxos: [] });
      // #then
      expect(next).toBe(state);
    });
  });

  describe("configure transitions", () => {
    it("transitions scanned → configured on confirm", () => {
      // #given
      const scanned = flowReducer(
        flowReducer(initialFlowPhase, { type: "scan-start" }),
        { type: "scan-success", utxos: sampleConfig.filteredUtxos },
      );
      // #when
      const next = flowReducer(scanned, { type: "configure-confirm", config: sampleConfig });
      // #then
      expect(next.kind).toBe("configured");
      if (next.kind === "configured") expect(next.config).toBe(sampleConfig);
    });

    it("rolls back configured → scanned on configure-back", () => {
      // #given
      const scanned = flowReducer(
        flowReducer(initialFlowPhase, { type: "scan-start" }),
        { type: "scan-success", utxos: sampleConfig.filteredUtxos },
      );
      const configured = flowReducer(scanned, { type: "configure-confirm", config: sampleConfig });
      // #when
      const next = flowReducer(configured, { type: "configure-back" });
      // #then
      expect(next.kind).toBe("scanned");
    });

    it("ignores configure-confirm when idle", () => {
      // #given
      const state = initialFlowPhase;
      // #when
      const next = flowReducer(state, { type: "configure-confirm", config: sampleConfig });
      // #then
      expect(next).toBe(state);
    });
  });

  describe("prove transitions", () => {
    function configuredState() {
      const scanned = flowReducer(
        flowReducer(initialFlowPhase, { type: "scan-start" }),
        { type: "scan-success", utxos: sampleConfig.filteredUtxos },
      );
      return flowReducer(scanned, { type: "configure-confirm", config: sampleConfig });
    }

    it("transitions configured → proving on prove-start", () => {
      // #given
      const state = configuredState();
      // #when
      const next = flowReducer(state, { type: "prove-start" });
      // #then
      expect(next.kind).toBe("proving");
    });

    it("transitions proving → done on prove-success", () => {
      // #given
      const state = flowReducer(configuredState(), { type: "prove-start" });
      // #when
      const next = flowReducer(state, { type: "prove-success", result: sampleResult });
      // #then
      expect(next.kind).toBe("done");
      if (next.kind === "done") expect(next.result).toBe(sampleResult);
    });

    it("transitions proving → prove-error on prove-failure", () => {
      // #given
      const state = flowReducer(configuredState(), { type: "prove-start" });
      const error = new Error("groth16 failed");
      // #when
      const next = flowReducer(state, { type: "prove-failure", error });
      // #then
      expect(next.kind).toBe("prove-error");
      if (next.kind === "prove-error") expect(next.error).toBe(error);
    });

    it("retries from prove-error → proving on prove-start", () => {
      // #given
      const proving = flowReducer(configuredState(), { type: "prove-start" });
      const errored = flowReducer(proving, {
        type: "prove-failure",
        error: new Error("x"),
      });
      // #when
      const next = flowReducer(errored, { type: "prove-start" });
      // #then
      expect(next.kind).toBe("proving");
    });

    it("ignores prove-start from idle", () => {
      // #given
      const state = initialFlowPhase;
      // #when
      const next = flowReducer(state, { type: "prove-start" });
      // #then
      expect(next).toBe(state);
    });
  });

  describe("reset", () => {
    it("returns to idle from done", () => {
      // #given
      const proving = flowReducer(
        flowReducer(
          flowReducer(
            flowReducer(initialFlowPhase, { type: "scan-start" }),
            { type: "scan-success", utxos: sampleConfig.filteredUtxos },
          ),
          { type: "configure-confirm", config: sampleConfig },
        ),
        { type: "prove-start" },
      );
      const done = flowReducer(proving, { type: "prove-success", result: sampleResult });
      // #when
      const next = flowReducer(done, { type: "reset" });
      // #then
      expect(next.kind).toBe("idle");
    });
  });
});

describe("stepperIndexFor", () => {
  it("returns 0 for scan phases", () => {
    // #given/when/then
    expect(stepperIndexFor({ kind: "idle" })).toBe(0);
    expect(stepperIndexFor({ kind: "scanning" })).toBe(0);
    expect(stepperIndexFor({ kind: "scan-error", error: new Error() })).toBe(0);
  });

  it("returns 1 for configure phases", () => {
    // #given/when/then
    expect(stepperIndexFor({ kind: "scanned", utxos: [] })).toBe(1);
    expect(
      stepperIndexFor({ kind: "configured", utxos: [], config: sampleConfig }),
    ).toBe(1);
  });

  it("returns 2 for prove + done phases", () => {
    // #given/when/then
    expect(stepperIndexFor({ kind: "proving", utxos: [], config: sampleConfig })).toBe(2);
    expect(
      stepperIndexFor({
        kind: "prove-error",
        utxos: [],
        config: sampleConfig,
        error: new Error(),
      }),
    ).toBe(2);
    expect(
      stepperIndexFor({
        kind: "done",
        utxos: [],
        config: sampleConfig,
        result: sampleResult,
      }),
    ).toBe(2);
  });
});
