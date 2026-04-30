"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AddressInput } from "@/components/address-input";
import { AmountInput } from "@/components/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Banknote, ExternalLink } from "lucide-react";
import { AddressDisplay } from "@/components/address-display";
import { AmountDisplay } from "@/components/amount-display";
import { TxHashDisplay } from "@/components/tx-hash-display";
import { Badge } from "@/components/ui/badge";
import { ProgressWithStatus } from "@/components/progress-with-status";

import { motion, AnimatePresence } from "framer-motion";

export default function EmployerPage() {
  const [submitting, setSubmitting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState("");
  const [subStatus, setSubStatus] = React.useState("");
  const [payments, setPayments] = React.useState<any[]>([]);

  const handleShield = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Stage 1
    setProgress(33);
    setStatus("Submitted to Solana...");
    setSubStatus("Transaction: 4Vt8...nP2k");
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Stage 2
    setProgress(66);
    setStatus("Encrypting via Arcium MPC...");
    setSubStatus("Securely blinding payment amounts...");
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Stage 3
    setProgress(100);
    setStatus("UTXO Committed");
    setSubStatus("Payment successfully shielded on devnet");
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Add to recent payments
    const newPayment = {
      id: Math.random().toString(36).substr(2, 9),
      recipient: "9xQeRy7vH96Yx4Hp2PkB9z...",
      amount: 1250,
      when: "Just now",
      status: "Shielded",
      tx: "4Vt8...nP2k"
    };
    setPayments([newPayment, ...payments]);
    
    setSubmitting(false);
    setProgress(0);
  };

  return (
    <div className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 max-w-screen-xl flex flex-col gap-12 lg:gap-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-display-2 font-display uppercase tracking-tight">Employer Dashboard</h1>
        <p className="text-body-lg text-text-secondary max-w-2xl">
          Pay salaries privately. Recipients see amounts; the world doesn&apos;t.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: New Payment Form */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          <Card className="bg-bg-elevated/30 border-border-strong">
            <CardHeader>
              <CardTitle className="text-h3 font-display">New Shielded Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleShield} className="flex flex-col gap-6">
                <AddressInput 
                  label="Recipient Umbra Address" 
                  placeholder="9xQeRy7vH96Yx4Hp2PkB9z..."
                  helper="where to send the payment"
                  required
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AmountInput label="Amount" required />
                  <div className="flex flex-col gap-2">
                    <label className="text-caption font-medium text-text-primary uppercase tracking-wider">
                      Token
                    </label>
                    <div className="h-12 flex items-center px-4 bg-bg-surface border border-border-subtle rounded-md text-sm font-mono">
                      USDC (Devnet)
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-caption font-medium text-text-primary uppercase tracking-wider">
                    Reference (optional, off-chain note)
                  </label>
                  <Input placeholder="March salary" />
                  <p className="text-caption text-text-muted">
                    Visible only to the recipient when they decrypt
                  </p>
                </div>

                <div className="pt-4 flex flex-col gap-6">
                  <Button 
                    type="submit" 
                    className="h-14 text-base" 
                    loading={submitting}
                  >
                    Shield Payment →
                  </Button>

                  <AnimatePresence>
                    {submitting && (
                      <motion.div 
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
                      >
                        <ProgressWithStatus 
                          progress={progress} 
                          status={status} 
                          subStatus={subStatus} 
                        />
                        <p className="mt-4 text-xs text-text-muted text-center italic">
                          MPC computation can take up to 30 seconds — your payment is being encrypted off-chain before commitment.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Recent Payments */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="text-overline text-text-muted">Recent Payments</div>
          
          <AnimatePresence mode="popLayout" initial={false}>
            {payments.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card variant="outlined" className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted">
                    <Banknote className="w-8 h-8" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-h3 font-display">No payments yet</h3>
                    <p className="text-body-sm text-text-secondary">
                      When you shield a payment, it&apos;ll show up here.
                    </p>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div 
                key="table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-4"
              >
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-border-subtle">
                      <tr className="text-caption text-text-muted uppercase">
                        <th className="py-4 font-semibold">Recipient</th>
                        <th className="py-4 font-semibold">Amount</th>
                        <th className="py-4 font-semibold">Status</th>
                        <th className="py-4 font-semibold">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout" initial={false}>
                        {payments.map((p) => (
                          <motion.tr
                            key={p.id}
                            initial={{ opacity: 0, backgroundColor: "rgba(162,59,44,0.12)" }}
                            animate={{ opacity: 1, backgroundColor: "rgba(162,59,44,0)" }}
                            transition={{ duration: 0.7, ease: [0, 0, 0.2, 1] }}
                            className="border-b border-border-subtle/50"
                          >
                            <td className="py-4">
                              <AddressDisplay address={p.recipient} type="umbra" className="text-xs" />
                            </td>
                            <td className="py-4">
                              <AmountDisplay amount={p.amount} className="text-sm font-medium" />
                            </td>
                            <td className="py-4">
                              <Badge variant="success" className="bg-success/5 text-success border-success/20">
                                {p.status}
                              </Badge>
                            </td>
                            <td className="py-4">
                              <TxHashDisplay hash={p.tx} className="text-xs" />
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
                
                <div className="md:hidden flex flex-col gap-4">
                  {payments.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-bg-surface border border-border-subtle rounded-lg flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center">
                        <AddressDisplay address={p.recipient} type="umbra" className="text-xs" />
                        <Badge variant="success" className="bg-success/5 text-success border-success/20 text-[10px]">
                          {p.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-end">
                        <AmountDisplay amount={p.amount} className="font-bold" />
                        <TxHashDisplay hash={p.tx} className="text-[10px]" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
