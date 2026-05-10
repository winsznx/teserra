import type { DepositStage } from "@/lib/umbra-deposit";
import type { PaymentDraft, Payment } from "./types";

export type FlowPhase =
  | { kind: "idle" }
  | { kind: "submitting"; draft: PaymentDraft; stage: DepositStage }
  | { kind: "submit-error"; draft: PaymentDraft; error: Error }
  | { kind: "submit-success"; payment: Payment };

export type FlowAction =
  | { type: "submit-start"; draft: PaymentDraft }
  | { type: "stage-advance"; stage: DepositStage }
  | { type: "submit-success"; payment: Payment }
  | { type: "submit-failure"; error: Error }
  | { type: "reset-to-idle" };

export const initialFlowPhase: FlowPhase = { kind: "idle" };

export function flowReducer(state: FlowPhase, action: FlowAction): FlowPhase {
  switch (action.type) {
    case "submit-start":
      if (state.kind === "submitting") return state;
      return { kind: "submitting", draft: action.draft, stage: "submitted" };

    case "stage-advance":
      if (state.kind !== "submitting") return state;
      return { ...state, stage: action.stage };

    case "submit-success":
      if (state.kind !== "submitting") return state;
      return { kind: "submit-success", payment: action.payment };

    case "submit-failure":
      if (state.kind !== "submitting") return state;
      return { kind: "submit-error", draft: state.draft, error: action.error };

    case "reset-to-idle":
      return { kind: "idle" };
  }
}

export type StageStatus = "pending" | "active" | "done";

export function stageStatus(currentStage: DepositStage, stage: DepositStage): StageStatus {
  const order: DepositStage[] = ["submitted", "mpc-computing", "committed"];
  const cur = order.indexOf(currentStage);
  const tgt = order.indexOf(stage);
  if (cur > tgt) return "done";
  if (cur === tgt) return "active";
  return "pending";
}

/** A stage at the final position is "done" once we land on it (not active). */
export function stageStatusForFinal(currentStage: DepositStage, stage: DepositStage): StageStatus {
  if (currentStage === "committed") return "done";
  return stageStatus(currentStage, stage);
}
