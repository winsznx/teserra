"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { AddressInput } from "@/components/address-input";
import { ThresholdInput } from "@/components/employee-inputs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stamp, ShieldCheck, XCircle, Code, ChevronRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { motion, AnimatePresence } from "framer-motion";

export default function VerifyPage() {
  const [address, setAddress] = React.useState("");
  const [threshold, setThreshold] = React.useState("5000");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<"idle" | "approved" | "denied">("idle");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult("idle");
    
    await new Promise(r => setTimeout(r, 1500));
    
    setLoading(false);
    // Mock logic: approved if address ends with even number or ends with "..." as mock
    setResult(address.length > 32 ? "approved" : "denied");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 max-w-screen-xl flex flex-col gap-12 lg:gap-16 pb-24"
    >
      <div className="flex flex-col gap-4">
        <h1 className="text-display-2 font-display uppercase tracking-tight">Verifier Demo</h1>
        <p className="text-body-lg text-text-secondary max-w-2xl">
          Experience how third-party protocols use TESSERA to verify creditworthiness trustlessly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 flex flex-col gap-8">
          <Card className="bg-bg-elevated/30 border-border-strong overflow-hidden">
            <CardHeader className="bg-bg-elevated/50 p-8 border-b border-border-subtle flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-h3 font-display">Tessera Lending (Demo)</CardTitle>
                <CardDescription>Simulated Undercollateralized Lending Protocol</CardDescription>
              </div>
              <Badge variant="cipher" className="uppercase tracking-widest text-[10px]">Demo</Badge>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleVerify} className="flex flex-col gap-8">
                <div className="flex flex-col gap-6">
                  <ThresholdInput 
                    label="Minimum Income Required" 
                    value={threshold} 
                    onChange={setThreshold} 
                  />
                  <AddressInput 
                    label="Applicant Wallet Address" 
                    placeholder="Enter Solana public key" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="h-14 text-base gap-2" 
                  loading={loading}
                  disabled={!address}
                >
                  Check Eligibility →
                </Button>
              </form>

              <AnimatePresence mode="wait">
                {result !== "idle" && (
                  <motion.div 
                    key={result}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    className="mt-8"
                  >
                    {result === "approved" ? (
                      <div className="p-8 bg-seal-muted border-2 border-seal/30 rounded-xl flex flex-col items-center text-center gap-4">
                        <motion.div 
                          initial={{ scale: 0.5, rotate: -15 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="w-16 h-16 rounded-full bg-seal flex items-center justify-center shadow-lg shadow-seal/40"
                        >
                          <Stamp className="w-10 h-10 text-text-inverse" />
                        </motion.div>
                        <div className="flex flex-col gap-1">
                          <h3 className="text-h3 font-display text-seal uppercase">Eligibility Approved</h3>
                          <p className="text-body-sm text-text-secondary">
                            TESSERA Protocol has verified this applicant exceeds the {threshold} USDC threshold.
                          </p>
                        </div>
                        <Button className="mt-2 bg-seal hover:bg-seal-hover text-text-inverse">
                          Proceed to Loan
                        </Button>
                      </div>
                    ) : (
                      <div className="p-8 bg-error/5 border-2 border-error/30 rounded-xl flex flex-col items-center text-center gap-4">
                        <motion.div 
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          className="w-16 h-16 rounded-full bg-error flex items-center justify-center"
                        >
                          <XCircle className="w-10 h-10 text-text-inverse" />
                        </motion.div>
                        <div className="flex flex-col gap-1">
                          <h3 className="text-h3 font-display text-error uppercase">Eligibility Denied</h3>
                          <p className="text-body-sm text-text-secondary">
                            No active credential found for this applicant matching the required criteria.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h3 className="text-h3 font-display">What just happened?</h3>
            <p className="text-body-sm text-text-secondary leading-relaxed">
              The lending protocol made a single on-chain CPI call to the TESSERA program.
              It checked for a valid, unexpired credential belonging to the applicant&apos;s
              public key.
            </p>
            
            <div className="bg-bg-elevated p-6 rounded-lg border border-border-subtle font-mono text-[11px] leading-relaxed relative overflow-hidden group">
              <div className="absolute top-3 right-3 text-text-muted group-hover:text-cipher transition-colors">
                <Code className="w-4 h-4" />
              </div>
              <pre className="text-cipher">
{`// Anchor CPI call example
tessera::cpi::verify_credential(
  ctx.accounts.tessera_program,
  applicant_pubkey,
  required_threshold, // ${threshold}
  current_timestamp
)?;

if result.is_valid {
  // Grant loan access
}`}
              </pre>
            </div>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 0.3
                }
              }
            }}
            className="flex flex-col gap-4 p-6 bg-bg-surface border border-border-subtle rounded-lg"
          >
            <h4 className="text-caption font-bold uppercase tracking-widest text-text-primary">Key Advantage</h4>
            <ul className="flex flex-col gap-4">
              {[
                "Applicant never shares bank statements or raw wallet history.",
                "Verifier gets instant, cryptographic certainty on-chain.",
                "Zero storage of sensitive PII or financial data by the verifier."
              ].map((text, i) => (
                <motion.li 
                  key={i}
                  variants={{
                    hidden: { opacity: 0, x: -8 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  className="flex gap-3 items-start"
                >
                  <ShieldCheck className="w-4 h-4 text-cipher shrink-0 mt-0.5" />
                  <span className="text-xs text-text-secondary">{text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
