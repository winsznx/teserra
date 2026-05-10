"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Circle, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TxHashDisplay } from "@/components/tx-hash-display";
import { ProgressWithStatus } from "@/components/progress-with-status";
import type { DepositStage } from "@/lib/umbra-deposit";

import { DEPOSIT_STAGES } from "./types";
import {
  stageStatus,
  stageStatusForFinal,
  type StageStatus,
} from "./employer-flow-reducer";

interface PaymentProgressProps {
  stage: DepositStage;
  queueSig: string | null;
  errorMessage: string | null;
  onRetry?: () => void;
}

export function PaymentProgress({
  stage,
  queueSig,
  errorMessage,
  onRetry,
}: PaymentProgressProps) {
  const completedCount = DEPOSIT_STAGES.filter((s, i) => {
    const status =
      i === DEPOSIT_STAGES.length - 1
        ? stageStatusForFinal(stage, s.id)
        : stageStatus(stage, s.id);
    return status === "done";
  }).length;
  const progressPct = (completedCount / DEPOSIT_STAGES.length) * 100;
  const activeLabel =
    DEPOSIT_STAGES.find((s) => stageStatus(stage, s.id) === "active")?.label ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      className="flex flex-col gap-4"
    >
      <ProgressWithStatus
        progress={progressPct}
        status={errorMessage ?? activeLabel}
        subStatus=""
      />

      <div className="flex flex-col gap-3">
        {DEPOSIT_STAGES.map((s, idx) => {
          const status: StageStatus =
            idx === DEPOSIT_STAGES.length - 1
              ? stageStatusForFinal(stage, s.id)
              : stageStatus(stage, s.id);
          return (
            <AnimatePresence key={s.id}>
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
                className="flex items-center justify-between p-3 bg-bg-surface/40 border border-border-subtle rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 flex items-center justify-center" aria-hidden="true">
                    {status === "done" ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : status === "active" ? (
                      <Loader2 className="w-4 h-4 text-cipher animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                  <span className="text-sm">
                    {idx + 1}. {s.label}
                  </span>
                </div>
                {s.id === "submitted" && queueSig ? (
                  <TxHashDisplay hash={queueSig} className="text-[10px]" />
                ) : null}
              </motion.div>
            </AnimatePresence>
          );
        })}
      </div>

      <p className="text-xs text-text-muted text-center italic mt-2">
        MPC computation can take up to 30 seconds — your payment is being
        encrypted off-chain before commitment.
      </p>

      {errorMessage ? (
        <div className="p-3 bg-error/5 border border-error/30 rounded-md flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-error mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-xs text-error">{errorMessage}</p>
            {onRetry ? (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
