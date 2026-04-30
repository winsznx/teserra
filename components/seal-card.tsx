"use client";

import * as React from "react";
import { Stamp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { AmountDisplay } from "@/components/amount-display";
import { TxHashDisplay } from "@/components/tx-hash-display";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SealCardProps {
  threshold: bigint | number;
  dateRange: string;
  issuedAt: string;
  expiresAt: string;
  employerCommitment: string;
  proofHash: string;
  className?: string;
}

export function SealCard({
  threshold,
  dateRange,
  issuedAt,
  expiresAt,
  employerCommitment,
  proofHash,
  className,
}: SealCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20,
        duration: 0.6
      }}
      className={cn(
        "relative overflow-hidden p-8 bg-bg-surface border border-seal/30 rounded-xl shadow-[0_0_40px_-10px_rgba(162,59,44,0.3)]",
        className
      )}
    >
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-display-2 font-display text-text-primary uppercase tracking-tight">
          Verified <br /> Credential
        </h2>
        <motion.div 
          initial={{ scale: 3, opacity: 0, rotate: 15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ 
            duration: 0.4, 
            delay: 0.3,
            ease: "easeOut"
          }}
          className="p-3 bg-seal-muted rounded-full border border-seal/30"
        >
          <Stamp className="w-8 h-8 text-seal" />
        </motion.div>
      </div>

      <Separator className="bg-seal/20 mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="flex flex-col gap-1.5">
          <span className="text-overline text-text-muted">Threshold Proved</span>
          <AmountDisplay amount={threshold} size="lg" className="text-seal" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-overline text-text-muted">Period Validated</span>
          <span className="text-body font-medium">{dateRange}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-overline text-text-muted">Employer Commitment</span>
          <TxHashDisplay hash={employerCommitment} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-overline text-text-muted">Proof Integrity</span>
          <TxHashDisplay hash={proofHash} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 pt-6 border-t border-border-subtle/50 text-caption text-text-muted">
        <div className="flex flex-col">
          <span>Issuer: TESSERA Protocol</span>
          <span>Status: Verified On-Chain</span>
        </div>
        <div className="flex flex-col md:text-right">
          <span>Issued: {issuedAt}</span>
          <span>Expires: {expiresAt}</span>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
    </motion.div>
  );
}
