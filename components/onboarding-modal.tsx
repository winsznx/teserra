"use client";

import * as React from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/stepper";
import { AddressDisplay } from "@/components/address-display";
import { Card } from "@/components/ui/card";

import { motion, AnimatePresence } from "framer-motion";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingModal({
  isOpen,
  onClose,
  onComplete,
}: OnboardingModalProps) {
  const [step, setStep] = React.useState(1); // 0: Connect, 1: Register, 2: Done
  const [loading, setLoading] = React.useState(false);

  const steps = [
    { title: "Connect", description: "Wallet linked" },
    { title: "Register", description: "Umbra identity" },
    { title: "Done", description: "Ready to use" },
  ];

  const handleRegister = async () => {
    setLoading(true);
    // Simulate Umbra registration signature
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-bg-overlay backdrop-blur-sm" 
            onClick={onClose}
          />
          
          {/* Modal Content */}
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
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 flex flex-col gap-8">
              <Stepper steps={steps} currentStep={step} />

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                >
                  {step === 1 && (
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

                      <Button 
                        onClick={handleRegister} 
                        loading={loading}
                        className="w-full h-12 text-base"
                      >
                        {loading ? "Waiting for signature..." : "Sign and Register"}
                      </Button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="flex flex-col gap-6 text-center py-4">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle2 className="w-10 h-10 text-success" />
                        </div>
                        <h2 className="text-h2 font-display">You&apos;re set up</h2>
                        <p className="text-body-sm text-text-secondary">
                          Your private Umbra identity has been created. Use this address to receive shielded payments.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 items-center">
                        <span className="text-overline text-text-muted">Your Umbra Address</span>
                        <AddressDisplay address="9xQeRy7vH96Yx4Hp2PkB9z..." type="umbra" className="text-lg" />
                      </div>

                      <Button 
                        onClick={onComplete}
                        className="w-full h-12 text-base mt-4"
                      >
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
