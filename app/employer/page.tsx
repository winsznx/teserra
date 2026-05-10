"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useUmbra } from "@/hooks/use-umbra";

import { NewShieldedPaymentForm } from "@/components/employer/new-shielded-payment-form";
import { PaymentProgress } from "@/components/employer/payment-progress";
import { RecentPaymentsTable } from "@/components/employer/recent-payments-table";
import {
  EmployerConnectGate,
  EmployerInitFailedGate,
  EmployerLoadingState,
} from "@/components/employer/employer-gates";
import {
  flowReducer,
  initialFlowPhase,
} from "@/components/employer/employer-flow-reducer";
import type { Payment, PaymentDraft } from "@/components/employer/types";
import { ShieldDepositError } from "@/lib/umbra-deposit";

function describeDepositError(err: unknown): string {
  if (err instanceof ShieldDepositError) {
    if (err.stage === "validation") return err.message;
    if (err.stage === "submitted") return "Couldn't reach Solana. Try again in a moment.";
    if (err.stage === "mpc-computing") {
      return "Encryption is taking longer than expected. Your payment will appear shortly.";
    }
  }
  if (err instanceof Error) {
    if (/User rejected|cancelled/i.test(err.message)) return "Transaction cancelled.";
    if (/insufficient/i.test(err.message)) {
      return "Wallet has insufficient dUSDC. Add funds or reduce the amount.";
    }
  }
  return "Couldn't reach Solana. Try again in a moment.";
}

export default function EmployerPage() {
  const { state: umbraState, deposit } = useUmbra();
  const [phase, dispatch] = React.useReducer(flowReducer, initialFlowPhase);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [queueSig, setQueueSig] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (umbraState.phase === "ready" && !umbraState.isRegistered) setShowOnboarding(true);
  }, [umbraState]);

  const handleSubmit = async (draft: PaymentDraft) => {
    setQueueSig(null);
    dispatch({ type: "submit-start", draft });
    try {
      const result = await deposit({
        recipientUmbraAddress: draft.recipient,
        amount: draft.amountAtomic,
        mint: draft.mint,
        onProgress: (stage, txSig) => {
          if (txSig) setQueueSig(txSig);
          dispatch({ type: "stage-advance", stage });
        },
      });
      const newPayment: Payment = {
        id: result.queueSignature,
        recipient: draft.recipient,
        amountAtomic: draft.amountAtomic,
        reference: draft.reference,
        mint: draft.mint,
        queueSignature: result.queueSignature,
        callbackSignature: result.callbackSignature,
        status: "shielded",
        shieldedAt: Math.floor(Date.now() / 1000),
      };
      setPayments((prev) => [newPayment, ...prev]);
      setHighlightId(newPayment.id);
      dispatch({ type: "submit-success", payment: newPayment });
      toast.success("Payment shielded ✓");
      window.setTimeout(() => dispatch({ type: "reset-to-idle" }), 1_500);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const message = describeDepositError(err);
      toast.error(message);
      dispatch({ type: "submit-failure", error: new Error(message) });
    }
  };

  const isInProgress = phase.kind === "submitting" || phase.kind === "submit-error";
  const submitting = phase.kind === "submitting";
  const errorMessage = phase.kind === "submit-error" ? phase.error.message : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 max-w-screen-xl flex flex-col gap-12 lg:gap-16"
    >
      <header className="flex flex-col gap-4">
        <h1 className="text-display-2 font-display uppercase tracking-tight">Employer Dashboard</h1>
        <p className="text-body-lg text-text-secondary max-w-2xl">
          Pay salaries privately. Recipients see amounts; the world doesn&apos;t.
        </p>
      </header>

      {umbraState.phase === "loading" || umbraState.phase === "initializing" ? <EmployerLoadingState /> : null}
      {umbraState.phase === "no-wallet" ? <EmployerConnectGate /> : null}
      {umbraState.phase === "init-failed" ? <EmployerInitFailedGate error={umbraState.error} /> : null}

      {umbraState.phase === "ready" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 flex flex-col gap-8">
            <Card className="bg-bg-elevated/30 border-border-strong">
              <CardHeader>
                <CardTitle className="text-h3 font-display">New Shielded Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <NewShieldedPaymentForm
                  client={umbraState.client}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
                <AnimatePresence>
                  {isInProgress ? (
                    <div className="mt-6">
                      <PaymentProgress
                        stage={phase.kind === "submitting" ? phase.stage : "submitted"}
                        queueSig={queueSig}
                        errorMessage={errorMessage}
                        onRetry={
                          phase.kind === "submit-error"
                            ? () => handleSubmit(phase.draft)
                            : undefined
                        }
                      />
                    </div>
                  ) : null}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="text-overline text-text-muted">Recent Payments</div>
            <RecentPaymentsTable payments={payments} highlightId={highlightId ?? undefined} />
          </div>
        </div>
      )}

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => setShowOnboarding(false)}
      />
    </motion.div>
  );
}
