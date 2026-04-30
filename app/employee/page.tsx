"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/stepper";
import { AddressDisplay } from "@/components/address-display";
import { Button } from "@/components/ui/button";
import { ProgressWithStatus } from "@/components/progress-with-status";
import { SealCard } from "@/components/seal-card";
import { DateRangeInput, ThresholdInput } from "@/components/employee-inputs";
import { ShieldAlert, Award, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";

function Counter({ value, duration = 0.5 }: { value: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  React.useEffect(() => {
    const controls = animate(count, value, { duration });
    return controls.stop;
  }, [count, value, duration]);

  return <motion.span>{rounded}</motion.span>;
}

export default function EmployeePage() {
  const [step, setStep] = React.useState(0); // 0: Scan, 1: Configure, 2: Prove, 3: Success
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState("");
  const [subStatus, setSubStatus] = React.useState("");
  const [threshold, setThreshold] = React.useState("5000");
  const [activeStageIndex, setActiveStageIndex] = React.useState(-1);

  const steps = [
    { title: "Scan", description: "Find deposits" },
    { title: "Configure", description: "Set parameters" },
    { title: "Prove", description: "Generate ZK" },
  ];

  const proofStages = [
    { id: "init", title: "Initializing...", sub: "Loading snarkjs Web Worker", time: 1.2 },
    { id: "witness", title: "Building witness...", sub: "Mapping UTXOs to circuit inputs", time: 2.4 },
    { id: "generate", title: "Generating proof...", sub: "Groth16 computation in browser", time: 5.8 },
    { id: "verify", title: "Verifying proof locally...", sub: "Ensuring signal integrity", time: 0.8 },
    { id: "mint", title: "Minting Credential...", sub: "Submitting to TESSERA Anchor program", time: 1.5 },
  ];

  const handleScan = async () => {
    setLoading(true);
    let found = 0;
    const interval = setInterval(() => {
      found += Math.floor(Math.random() * 5);
      setStatus(`Scanning Umbra UTXOs... Found ${found} deposits`);
    }, 500);

    await new Promise(r => setTimeout(r, 2500));
    clearInterval(interval);
    setLoading(false);
    setStep(1);
  };

  const handleProve = async () => {
    setLoading(true);
    setStep(2);
    
    for (let i = 0; i < proofStages.length; i++) {
      setActiveStageIndex(i);
      setProgress(((i + 1) / proofStages.length) * 100);
      setStatus(proofStages[i].title);
      setSubStatus(proofStages[i].sub);
      await new Promise(r => setTimeout(r, proofStages[i].time * 1000));
    }

    setLoading(false);
    setStep(3);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 max-w-screen-xl flex flex-col gap-12 lg:gap-16 pb-24"
    >
      <div className="flex flex-col gap-4">
        <h1 className="text-display-2 font-display uppercase tracking-tight">Employee Dashboard</h1>
        <p className="text-body-lg text-text-secondary max-w-2xl">
          Generate a credential proving your income — without revealing it.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 flex flex-col gap-12">
          {/* Address Card */}
          <Card className="bg-bg-elevated/30 border-border-strong p-8">
            <div className="flex flex-col gap-4">
              <span className="text-overline text-text-muted">Your Umbra Address</span>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <AddressDisplay 
                  address="9xQeRy7vH96Yx4Hp2PkB9zT5w..." 
                  type="umbra" 
                  className="text-lg" 
                />
                <p className="text-caption text-text-muted max-w-[200px] md:text-right">
                  Share this with your employer to receive shielded payments.
                </p>
              </div>
            </div>
          </Card>

          {/* Generator Section */}
          <section className="flex flex-col gap-8">
            <h2 className="text-h2 font-display uppercase tracking-tight">Generate Credential</h2>
            
            <Card className="p-0 border-border-strong overflow-hidden">
              <div className="p-8 border-b border-border-subtle bg-bg-elevated/20">
                <Stepper steps={steps} currentStep={step > 2 ? 2 : step} />
              </div>

              <div className="p-8 min-h-[400px]">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div
                      key="scan"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      className="flex flex-col gap-6 max-w-xl"
                    >
                      <div className="flex flex-col gap-2">
                        <h3 className="text-h3 font-display">Step 1: Scan your income</h3>
                        <p className="text-body-sm text-text-secondary">
                          Scan your Umbra UTXOs to find shielded salary payments. 
                          Your viewing key never leaves your device.
                        </p>
                      </div>
                      <Button 
                        onClick={handleScan} 
                        loading={loading}
                        className="h-12 text-base"
                      >
                        Scan UTXOs →
                      </Button>
                    </motion.div>
                  )}

                  {step === 1 && (
                    <motion.div
                      key="config"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      className="flex flex-col gap-8 max-w-xl"
                    >
                      <div className="flex flex-col gap-2">
                        <h3 className="text-h3 font-display">Step 2: Configure Proof</h3>
                        <p className="text-body-sm text-text-secondary">
                          Select the date range and threshold you wish to prove.
                        </p>
                      </div>

                      <div className="flex flex-col gap-6">
                        <DateRangeInput label="Period Range" />
                        <ThresholdInput 
                          label="Income Threshold" 
                          value={threshold} 
                          onChange={setThreshold} 
                        />
                        
                        <div className="p-4 bg-cipher/5 border border-cipher/20 rounded-md flex gap-4 items-start">
                          <Award className="w-5 h-5 text-cipher shrink-0 mt-0.5" />
                          <p className="text-xs text-cipher leading-relaxed">
                            Your selection includes <span className="font-bold">14 deposits</span> in this range.
                            Total aggregated income exceeds {threshold} USDC.
                          </p>
                        </div>
                      </div>

                      <Button onClick={handleProve} className="h-12 text-base">
                        Generate Proof →
                      </Button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="prove"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      className="flex flex-col gap-8 w-full"
                    >
                      <div className="flex flex-col gap-2 text-center items-center">
                        <h3 className="text-h3 font-display">Step 3: Generating Proof</h3>
                        <p className="text-body-sm text-text-secondary">
                          Your data never leaves your device. Computation is performed locally.
                        </p>
                      </div>

                      <ProgressWithStatus 
                        progress={progress} 
                        status={status} 
                        subStatus={subStatus} 
                        className="max-w-xl mx-auto"
                      />

                      <div className="flex flex-col gap-4 mt-8 w-full max-w-xl mx-auto">
                        {proofStages.map((stage, index) => {
                          const isStarted = index <= activeStageIndex;
                          const isCompleted = index < activeStageIndex || (index === activeStageIndex && progress === 100);
                          
                          return (
                            <AnimatePresence key={stage.id}>
                              {isStarted && (
                                <motion.div
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
                                  className="flex items-center justify-between p-4 bg-bg-surface/40 border border-border-subtle rounded-lg"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                      {isCompleted ? (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: [0, 1.2, 1] }}
                                          transition={{ duration: 0.3 }}
                                        >
                                          <CheckCircle2 className="w-5 h-5 text-success" />
                                        </motion.div>
                                      ) : (
                                        <Loader2 className="w-4 h-4 text-cipher animate-spin" />
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{stage.title}</span>
                                      <span className="text-[10px] text-text-secondary">{stage.sub}</span>
                                    </div>
                                  </div>
                                  <div className="text-xs font-mono text-text-muted">
                                    {isCompleted ? (
                                      <span>{stage.time.toFixed(1)}s</span>
                                    ) : (
                                      <span><Counter value={stage.time} duration={stage.time} />s</span>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      className="flex flex-col gap-8 items-center text-center w-full"
                    >
                      <div className="relative w-full max-w-md mx-auto">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.7, ease: [0, 0, 0.2, 1] }}
                          className="relative z-10"
                        >
                          <motion.div
                            className="absolute inset-0 rounded-xl pointer-events-none"
                            initial={{ boxShadow: "0 0 0px 0px rgba(162,59,44,0)" }}
                            animate={{ boxShadow: "0 0 60px 8px rgba(162,59,44,0.15)" }}
                            transition={{ duration: 0.7, ease: [0, 0, 0.2, 1] }}
                          />
                          <SealCard 
                            threshold={parseInt(threshold)}
                            dateRange="Jan 12 — Apr 28 2026"
                            issuedAt="Apr 30, 2026"
                            expiresAt="Jul 30, 2026"
                            employerCommitment="4Vt89zXp...nP2k"
                            proofHash="9xQeRy7v...H96Y"
                            className="w-full"
                          />
                        </motion.div>
                      </div>
                      
                      <motion.div 
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                        className="flex flex-col gap-4 max-w-sm"
                      >
                        <h3 className="text-h3 font-display text-success">Credential Minted Successfully</h3>
                        <p className="text-body-sm text-text-secondary">
                          Your zero-knowledge income credential is now on-chain as a compressed NFT.
                        </p>
                        <Button variant="secondary" onClick={() => setStep(0)} className="h-12">
                          Create Another
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </section>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="text-overline text-text-muted">Your Credentials</div>
          
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {step !== 3 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card variant="outlined" className="flex flex-col items-center justify-center py-20 text-center gap-4 border-dashed">
                    <ShieldAlert className="w-8 h-8 text-text-muted" />
                    <div className="flex flex-col gap-1 px-8">
                      <h3 className="text-body font-semibold">No credentials found</h3>
                      <p className="text-caption text-text-muted">
                        Follow the generator steps to mint your first income proof.
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="credential"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
                >
                  <Card className="bg-bg-elevated/30 border-seal/30 p-4 relative group cursor-pointer hover:bg-bg-elevated/50 transition-colors overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-seal font-bold">Verified</span>
                        <span className="text-sm font-display">{threshold} USDC +</span>
                        <span className="text-[10px] text-text-muted">Expires Jul 2026</span>
                      </div>
                      <Award className="w-5 h-5 text-seal" />
                    </div>
                    <motion.div 
                      className="absolute inset-0 bg-seal/5 opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={false}
                    />
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
