"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Banknote } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "@/components/address-display";
import { TxHashDisplay } from "@/components/tx-hash-display";

import { type Payment, atomicToUsdc } from "./types";

interface RecentPaymentsTableProps {
  payments: Payment[];
  highlightId?: string;
}

function relativeTime(unixSeconds: number, now = Math.floor(Date.now() / 1000)): string {
  const delta = now - unixSeconds;
  if (delta < 60) return "Just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

export function RecentPaymentsTable({ payments, highlightId }: RecentPaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <Card variant="outlined" className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted">
          <Banknote className="w-8 h-8" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-h3 font-display">No payments yet</h3>
          <p className="text-body-sm text-text-secondary">
            When you shield a payment, it&apos;ll show up here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-border-subtle">
            <tr className="text-caption text-text-muted uppercase">
              <th className="py-4 font-semibold">Recipient</th>
              <th className="py-4 font-semibold">Amount</th>
              <th className="py-4 font-semibold">When</th>
              <th className="py-4 font-semibold">Status</th>
              <th className="py-4 font-semibold sr-only">Tx</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout" initial={false}>
              {payments.map((p) => (
                <motion.tr
                  key={p.id}
                  initial={
                    p.id === highlightId
                      ? { opacity: 0, backgroundColor: "var(--seal-muted)" }
                      : { opacity: 0 }
                  }
                  animate={{ opacity: 1, backgroundColor: "transparent" }}
                  transition={{ duration: 0.7, ease: [0, 0, 0.2, 1] }}
                  className="border-b border-border-subtle/50"
                >
                  <td className="py-4">
                    <AddressDisplay address={p.recipient} type="umbra" className="text-xs" />
                  </td>
                  <td className="py-4 font-mono text-sm">
                    {atomicToUsdc(p.amountAtomic)} dUSDC
                  </td>
                  <td className="py-4 text-caption text-text-muted">
                    {relativeTime(p.shieldedAt)}
                  </td>
                  <td className="py-4">
                    <Badge variant="success" className="bg-success/5 text-success border-success/20">
                      ✓ Shielded
                    </Badge>
                  </td>
                  <td className="py-4">
                    <TxHashDisplay hash={p.queueSignature} className="text-xs" />
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
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
                  ✓ Shielded
                </Badge>
              </div>
              <div className="flex justify-between items-end">
                <span className="font-mono font-bold">{atomicToUsdc(p.amountAtomic)} dUSDC</span>
                <span className="text-[10px] text-text-muted">{relativeTime(p.shieldedAt)}</span>
              </div>
              <TxHashDisplay hash={p.queueSignature} className="text-[10px]" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
