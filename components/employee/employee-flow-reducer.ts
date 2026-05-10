import type { RawUmbraUtxo } from "@/lib/umbra-witness";
import type { ProofConfig, ProveResult } from "./types";

export type FlowPhase =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "scan-error"; error: Error }
  | { kind: "scanned"; utxos: RawUmbraUtxo[] }
  | { kind: "configured"; utxos: RawUmbraUtxo[]; config: ProofConfig }
  | { kind: "proving"; utxos: RawUmbraUtxo[]; config: ProofConfig }
  | { kind: "prove-error"; utxos: RawUmbraUtxo[]; config: ProofConfig; error: Error }
  | { kind: "done"; utxos: RawUmbraUtxo[]; config: ProofConfig; result: ProveResult };

export type FlowAction =
  | { type: "scan-start" }
  | { type: "scan-success"; utxos: RawUmbraUtxo[] }
  | { type: "scan-failure"; error: Error }
  | { type: "configure-back" }
  | { type: "configure-confirm"; config: ProofConfig }
  | { type: "prove-start" }
  | { type: "prove-success"; result: ProveResult }
  | { type: "prove-failure"; error: Error }
  | { type: "reset" };

export const initialFlowPhase: FlowPhase = { kind: "idle" };

export function flowReducer(state: FlowPhase, action: FlowAction): FlowPhase {
  switch (action.type) {
    case "reset":
      return { kind: "idle" };

    case "scan-start":
      if (state.kind === "scanning") return state;
      return { kind: "scanning" };

    case "scan-success":
      if (state.kind !== "scanning") return state;
      return { kind: "scanned", utxos: action.utxos };

    case "scan-failure":
      if (state.kind !== "scanning") return state;
      return { kind: "scan-error", error: action.error };

    case "configure-back":
      if (state.kind === "configured") return { kind: "scanned", utxos: state.utxos };
      return state;

    case "configure-confirm":
      if (state.kind !== "scanned" && state.kind !== "configured") return state;
      return { kind: "configured", utxos: state.utxos, config: action.config };

    case "prove-start":
      if (state.kind !== "configured" && state.kind !== "prove-error") return state;
      return { kind: "proving", utxos: state.utxos, config: state.config };

    case "prove-success":
      if (state.kind !== "proving") return state;
      return {
        kind: "done",
        utxos: state.utxos,
        config: state.config,
        result: action.result,
      };

    case "prove-failure":
      if (state.kind !== "proving") return state;
      return {
        kind: "prove-error",
        utxos: state.utxos,
        config: state.config,
        error: action.error,
      };
  }
}

export type StepperIndex = 0 | 1 | 2;

export function stepperIndexFor(phase: FlowPhase): StepperIndex {
  switch (phase.kind) {
    case "idle":
    case "scanning":
    case "scan-error":
      return 0;
    case "scanned":
    case "configured":
      return 1;
    case "proving":
    case "prove-error":
    case "done":
      return 2;
  }
}
