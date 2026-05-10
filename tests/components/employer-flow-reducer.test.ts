import { describe, expect, it } from "vitest";

import {
  flowReducer,
  initialFlowPhase,
  stageStatus,
  stageStatusForFinal,
} from "../../components/employer/employer-flow-reducer";
import type {
  PaymentDraft,
  Payment,
} from "../../components/employer/types";

const sampleDraft: PaymentDraft = {
  recipient: "9xQeRy7vH96Yx4Hp2PkB9zT5wAKpDaj1AAAAAAAA",
  amountAtomic: BigInt(1_000_000),
  reference: "March salary",
  mint: "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7",
};

const samplePayment: Payment = {
  id: "queue-sig-1",
  recipient: sampleDraft.recipient,
  amountAtomic: sampleDraft.amountAtomic,
  reference: sampleDraft.reference,
  mint: sampleDraft.mint,
  queueSignature: "queue-sig-1",
  status: "shielded",
  shieldedAt: 1_700_000_000,
};

describe("employer flowReducer", () => {
  describe("submit transitions", () => {
    it("transitions idle → submitting on submit-start", () => {
      // #given
      const state = initialFlowPhase;
      // #when
      const next = flowReducer(state, { type: "submit-start", draft: sampleDraft });
      // #then
      expect(next.kind).toBe("submitting");
      if (next.kind === "submitting") {
        expect(next.stage).toBe("submitted");
        expect(next.draft).toEqual(sampleDraft);
      }
    });

    it("ignores submit-start when already submitting", () => {
      // #given
      const submitting = flowReducer(initialFlowPhase, { type: "submit-start", draft: sampleDraft });
      // #when
      const next = flowReducer(submitting, { type: "submit-start", draft: sampleDraft });
      // #then
      expect(next).toBe(submitting);
    });

    it("advances stage during submitting", () => {
      // #given
      const state = flowReducer(initialFlowPhase, { type: "submit-start", draft: sampleDraft });
      // #when
      const next = flowReducer(state, { type: "stage-advance", stage: "mpc-computing" });
      // #then
      expect(next.kind).toBe("submitting");
      if (next.kind === "submitting") expect(next.stage).toBe("mpc-computing");
    });

    it("transitions to submit-success on success action", () => {
      // #given
      const submitting = flowReducer(initialFlowPhase, { type: "submit-start", draft: sampleDraft });
      // #when
      const next = flowReducer(submitting, { type: "submit-success", payment: samplePayment });
      // #then
      expect(next.kind).toBe("submit-success");
      if (next.kind === "submit-success") expect(next.payment).toBe(samplePayment);
    });

    it("transitions to submit-error on failure with the originating draft", () => {
      // #given
      const submitting = flowReducer(initialFlowPhase, { type: "submit-start", draft: sampleDraft });
      const error = new Error("rpc unavailable");
      // #when
      const next = flowReducer(submitting, { type: "submit-failure", error });
      // #then
      expect(next.kind).toBe("submit-error");
      if (next.kind === "submit-error") {
        expect(next.error).toBe(error);
        expect(next.draft).toEqual(sampleDraft);
      }
    });
  });

  describe("reset", () => {
    it("returns to idle from submit-success", () => {
      // #given
      const submitting = flowReducer(initialFlowPhase, { type: "submit-start", draft: sampleDraft });
      const success = flowReducer(submitting, { type: "submit-success", payment: samplePayment });
      // #when
      const next = flowReducer(success, { type: "reset-to-idle" });
      // #then
      expect(next.kind).toBe("idle");
    });

    it("returns to idle from submit-error", () => {
      // #given
      const submitting = flowReducer(initialFlowPhase, { type: "submit-start", draft: sampleDraft });
      const errored = flowReducer(submitting, { type: "submit-failure", error: new Error("boom") });
      // #when
      const next = flowReducer(errored, { type: "reset-to-idle" });
      // #then
      expect(next.kind).toBe("idle");
    });
  });

  describe("guard rails", () => {
    it("ignores stage-advance when not submitting", () => {
      // #given
      const state = initialFlowPhase;
      // #when
      const next = flowReducer(state, { type: "stage-advance", stage: "committed" });
      // #then
      expect(next).toBe(state);
    });

    it("ignores submit-success when not submitting", () => {
      // #given
      const state = initialFlowPhase;
      // #when
      const next = flowReducer(state, { type: "submit-success", payment: samplePayment });
      // #then
      expect(next).toBe(state);
    });
  });
});

describe("stageStatus mapping", () => {
  it("treats earlier stages as done when current is later", () => {
    // #then
    expect(stageStatus("mpc-computing", "submitted")).toBe("done");
    expect(stageStatus("committed", "submitted")).toBe("done");
    expect(stageStatus("committed", "mpc-computing")).toBe("done");
  });

  it("marks the current stage active", () => {
    // #then
    expect(stageStatus("submitted", "submitted")).toBe("active");
    expect(stageStatus("mpc-computing", "mpc-computing")).toBe("active");
  });

  it("treats later stages as pending", () => {
    // #then
    expect(stageStatus("submitted", "mpc-computing")).toBe("pending");
    expect(stageStatus("submitted", "committed")).toBe("pending");
  });
});

describe("stageStatusForFinal", () => {
  it("marks the final 'committed' stage as done when reached", () => {
    // #then
    expect(stageStatusForFinal("committed", "committed")).toBe("done");
  });

  it("delegates to stageStatus for non-final stages", () => {
    // #then
    expect(stageStatusForFinal("submitted", "submitted")).toBe("active");
    expect(stageStatusForFinal("mpc-computing", "submitted")).toBe("done");
  });
});
