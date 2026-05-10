"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PublicKey } from "@solana/web3.js";

import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/stepper";
import { AddressDisplay } from "@/components/address-display";
import { OnboardingModal } from "@/components/onboarding-modal";

import { useUmbra } from "@/hooks/use-umbra";
import { getProgram, fetchCredentialByPda } from "@/lib/anchor";
import { EmployeeScan } from "@/components/employee/employee-scan";
import { EmployeeConfigure } from "@/components/employee/employee-configure";
import { EmployeeProve } from "@/components/employee/employee-prove";
import { EmployeeCredentialsList } from "@/components/employee/employee-credentials-list";
import {
  ConnectWalletGate,
  InitFailedGate,
  LoadingState,
} from "@/components/employee/employee-gates";
import { EmployeeSuccess } from "@/components/employee/employee-success";
import {
  flowReducer,
  initialFlowPhase,
  stepperIndexFor,
} from "@/components/employee/employee-flow-reducer";
import type { CredentialListEntry } from "@/components/employee/types";

const STEPS = [
  { title: "Scan", description: "Find deposits" },
  { title: "Configure", description: "Set parameters" },
  { title: "Prove", description: "Generate ZK" },
];

const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function EmployeePage() {
  const { state: umbraState } = useUmbra();
  const [phase, dispatch] = React.useReducer(flowReducer, initialFlowPhase);
  const [credentials, setCredentials] = React.useState<CredentialListEntry[]>([]);
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  React.useEffect(() => {
    if (umbraState.phase === "ready" && !umbraState.isRegistered) setShowOnboarding(true);
  }, [umbraState]);

  const refreshCredential = React.useCallback(
    async (pda: PublicKey) => {
      if (umbraState.phase !== "ready") return;
      const program = getProgram(umbraState.connection, umbraState.anchorWallet);
      const account = await fetchCredentialByPda(program, pda);
      if (!account) return;
      setCredentials((prev) =>
        prev.some((e) => e.pda.equals(pda)) ? prev : [{ pda, account }, ...prev],
      );
    },
    [umbraState],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 max-w-screen-xl flex flex-col gap-12 lg:gap-16 pb-24"
    >
      <header className="flex flex-col gap-4">
        <h1 className="text-display-2 font-display uppercase tracking-tight">Employee Dashboard</h1>
        <p className="text-body-lg text-text-secondary max-w-2xl">
          Generate a credential proving your income — without revealing it.
        </p>
      </header>

      {umbraState.phase === "loading" || umbraState.phase === "initializing" ? <LoadingState /> : null}
      {umbraState.phase === "no-wallet" ? <ConnectWalletGate /> : null}
      {umbraState.phase === "init-failed" ? <InitFailedGate error={umbraState.error} /> : null}

      {umbraState.phase === "ready" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 flex flex-col gap-12">
            <Card className="bg-bg-elevated/30 border-border-strong p-8">
              <div className="flex flex-col gap-4">
                <span className="text-overline text-text-muted">Your Umbra Address</span>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <AddressDisplay address={umbraState.umbraAddress} type="umbra" className="text-lg" />
                  <p className="text-caption text-text-muted max-w-[200px] md:text-right">
                    Share with your employer.
                  </p>
                </div>
              </div>
            </Card>

            <section className="flex flex-col gap-8">
              <h2 className="text-h2 font-display uppercase tracking-tight">Generate Credential</h2>
              <Card className="p-0 border-border-strong overflow-hidden">
                <div className="p-8 border-b border-border-subtle bg-bg-elevated/20">
                  <Stepper steps={STEPS} currentStep={stepperIndexFor(phase)} />
                </div>
                <div className="p-8 min-h-[400px]">
                  <AnimatePresence mode="wait">
                    {(phase.kind === "idle" || phase.kind === "scanning" || phase.kind === "scan-error") && (
                      <EmployeeScan
                        key="scan"
                        onComplete={(utxos) => {
                          dispatch({ type: "scan-start" });
                          dispatch({ type: "scan-success", utxos });
                        }}
                        onError={(err) => {
                          dispatch({ type: "scan-start" });
                          dispatch({ type: "scan-failure", error: err });
                        }}
                      />
                    )}
                    {(phase.kind === "scanned" || phase.kind === "configured") && (
                      <EmployeeConfigure
                        key="configure"
                        utxos={phase.utxos}
                        onComplete={(config) => {
                          dispatch({ type: "configure-confirm", config });
                          dispatch({ type: "prove-start" });
                        }}
                      />
                    )}
                    {(phase.kind === "proving" || phase.kind === "prove-error") && (
                      <EmployeeProve
                        key="prove"
                        config={phase.config}
                        onComplete={(result) => {
                          dispatch({ type: "prove-success", result });
                          void refreshCredential(result.credentialPda);
                        }}
                        onError={(error) => dispatch({ type: "prove-failure", error })}
                      />
                    )}
                    {phase.kind === "done" && (
                      <EmployeeSuccess
                        key="done"
                        threshold={phase.config.threshold}
                        startTs={phase.config.startTs}
                        endTs={phase.config.endTs}
                        proofHashHex={phase.result.proofHashHex}
                        onAnother={() => dispatch({ type: "reset" })}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </section>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <EmployeeCredentialsList credentials={credentials} />
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
