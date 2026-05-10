"use client";

import * as React from "react";
import { X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/stepper";
import { AddressDisplay } from "@/components/address-display";
import { useUmbra } from "@/hooks/use-umbra";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  { title: "Connect", description: "Wallet linked" },
  { title: "Register", description: "Umbra identity" },
  { title: "Done", description: "Ready to use" },
];

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { connected } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { state, register } = useUmbra();
  const [signing, setSigning] = React.useState(false);

  // Step is derived from real wallet + Umbra state. PRD §11.2 wireframe:
  //   step 0 (Connect) when wallet not connected
  //   step 1 (Register) when wallet connected but Umbra unregistered
  //   step 2 (Done) when fully registered
  let activeStep: 0 | 1 | 2 = 0;
  if (!connected) activeStep = 0;
  else if (state.phase === "ready" && state.isRegistered) activeStep = 2;
  else activeStep = 1;

  const handleSign = async () => {
    if (state.phase !== "ready") return;
    setSigning(true);
    try {
      await register();
      toast.success("Umbra identity created");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/User rejected|cancelled/i.test(msg)) {
        toast.error("Signature cancelled. Try again to register.");
      } else {
        toast.error("Couldn't reach Umbra network. Retry.");
      }
    } finally {
      setSigning(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-bg-overlay backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.24, ease: [0, 0, 0.2, 1] }}
            className="relative w-full max-w-lg bg-bg-surface border border-border-strong rounded-xl shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors z-10"
              aria-label="Close onboarding"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="p-8 flex flex-col gap-8">
              <Stepper steps={STEPS} currentStep={activeStep} />

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                >
                  {activeStep === 0 && (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-2">
                        <h2 className="text-h2 font-display">Welcome to TESSERA</h2>
                        <p className="text-body-sm text-text-secondary leading-relaxed">
                          Set up your private identity. This takes about 30 seconds.
                          Your wallet stays in your control — TESSERA never holds keys.
                        </p>
                      </div>
                      <Button
                        onClick={() => setWalletModalVisible(true)}
                        className="w-full h-12 text-base"
                      >
                        Connect wallet
                      </Button>
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-2">
                        <h2 className="text-h2 font-display">Create your Umbra identity</h2>
                        <p className="text-body-sm text-text-secondary leading-relaxed">
                          Your wallet will sign a one-time message. This generates your
                          private master seed — used to derive your Umbra address. The
                          signature is deterministic: same wallet, same identity, every
                          time.
                        </p>
                      </div>

                      {state.phase === "init-failed" ? (
                        <div className="p-3 bg-error/5 border border-error/30 rounded-md flex gap-3 items-start">
                          <AlertTriangle className="w-4 h-4 text-error mt-0.5 shrink-0" aria-hidden="true" />
                          <p className="text-xs text-error leading-relaxed">
                            Couldn&apos;t initialize Umbra: {state.error.message}
                          </p>
                        </div>
                      ) : null}

                      <Button
                        onClick={handleSign}
                        loading={signing}
                        disabled={state.phase !== "ready"}
                        className="w-full h-12 text-base"
                      >
                        {signing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
                            Waiting for signature...
                          </>
                        ) : (
                          "Sign and register"
                        )}
                      </Button>
                    </div>
                  )}

                  {activeStep === 2 && state.phase === "ready" && (
                    <div className="flex flex-col gap-6 text-center py-4">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle2 className="w-10 h-10 text-success" aria-hidden="true" />
                        </div>
                        <h2 className="text-h2 font-display">You&apos;re set up</h2>
                        <p className="text-body-sm text-text-secondary">
                          Your private Umbra identity has been created. Use this address to receive shielded payments.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 items-center">
                        <span className="text-overline text-text-muted">Your Umbra Address</span>
                        <AddressDisplay address={state.umbraAddress} type="umbra" className="text-lg" />
                      </div>

                      <Button onClick={onComplete} className="w-full h-12 text-base mt-4">
                        Continue
                      </Button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
