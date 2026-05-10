"use client";

import * as React from "react";
import { Stamp, ExternalLink, Copy, Check, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  bytesToHex,
  expiredRelative,
  formatBytes,
  formatDate,
  formatRange,
  formatThresholdAtomic,
} from "./seal-card-format";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SealCardStatus = "valid" | "expired" | "revoked";

export interface SealCardProps {
  threshold: bigint;
  startTs: number;
  endTs: number;
  issuedAt: number;
  expiresAt: number;
  /** 32-byte commitment recorded by the program. */
  employerCommitment: Uint8Array;
  /** 32-byte keccak hash recorded by the program. */
  proofHash: Uint8Array;
  /** The on-chain `issuer` field (program admin) as a base58 string. Used
   *  to derive the Explorer link target so the user can confirm the
   *  issuing program. Plain string instead of `PublicKey` because the
   *  prop crosses the server→client RSC boundary, which strips class
   *  prototypes (calling `.toBase58()` on the client crashes). */
  issuer: string;
  status?: SealCardStatus;
  className?: string;
}

export function SealCard({
  threshold,
  startTs,
  endTs,
  issuedAt,
  expiresAt,
  employerCommitment,
  proofHash,
  issuer,
  status = "valid",
  className,
}: SealCardProps) {
  const [copied, setCopied] = React.useState(false);
  const explorerUrl = `https://explorer.solana.com/address/${issuer}?cluster=devnet`;

  const handleCopy = async () => {
    const hex = bytesToHex(proofHash);
    if (typeof navigator?.clipboard?.writeText !== "function") {
      toast.error("Clipboard not available");
      return;
    }
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      toast.success("Hash copied");
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const borderClass =
    status === "expired"
      ? "border-warning/40"
      : status === "revoked"
        ? "border-error/40"
        : "border-seal/30";
  const shadowClass =
    status === "expired"
      ? "shadow-warning/10"
      : status === "revoked"
        ? "shadow-error/10"
        : "shadow-seal/10";

  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, duration: 0.6 }}
      className={cn(
        "relative overflow-hidden p-8 bg-bg-surface border rounded-xl shadow-xl",
        borderClass,
        shadowClass,
        className,
      )}
    >
      {status === "expired" ? (
        <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/30 text-[10px] uppercase tracking-wider font-bold text-warning">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          Expired {expiredRelative(expiresAt)}
        </div>
      ) : null}
      {status === "revoked" ? (
        <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error/10 border border-error/30 text-[10px] uppercase tracking-wider font-bold text-error">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          Invalid
        </div>
      ) : null}

      <div className="flex flex-col items-center text-center gap-5 mb-6">
        <motion.div
          initial={{ scale: 3, opacity: 0, rotate: 15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          className="p-3 bg-seal-muted rounded-full border border-seal/30"
        >
          <Stamp className="w-8 h-8 text-seal" aria-hidden="true" />
        </motion.div>
        <h2 className="text-display-2 font-display text-text-primary uppercase tracking-tight">
          Verified Credential
        </h2>
        <p className="text-body-lg text-text-secondary max-w-md">
          Income confirmed above threshold for the stated period.
        </p>
      </div>

      <Separator className="bg-seal/20 my-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-8">
        <FieldRow label="Threshold" value={`${formatThresholdAtomic(threshold)} USDC`} />
        <FieldRow label="Date range" value={formatRange(startTs, endTs)} />
        <FieldRow label="Issued" value={formatDate(issuedAt)} />
        <FieldRow label="Expires" value={formatDate(expiresAt)} />
        <FieldRow label="Issuer" value="TESSERA Protocol" />
        <FieldRow label="Employer commitment" value={formatBytes(employerCommitment)} mono />
        <FieldRow label="Proof hash" value={formatBytes(proofHash)} mono />
      </div>

      {status === "expired" ? (
        <div className="mb-6 p-3 bg-warning/5 border border-warning/30 rounded-md">
          <p className="text-xs text-warning leading-relaxed">
            This credential expired on {formatDate(expiresAt)}. The holder must
            regenerate to renew.
          </p>
        </div>
      ) : null}
      {status === "revoked" ? (
        <div className="mb-6 p-3 bg-error/5 border border-error/30 rounded-md">
          <p className="text-xs text-error leading-relaxed">
            On-chain state shows this credential is no longer valid.
          </p>
        </div>
      ) : null}

      <Separator className="bg-border-subtle/50 my-6" />

      <div className="flex flex-col md:flex-row gap-3">
        <Button asChild variant="secondary" className="h-11 gap-2 flex-1">
          <a href={explorerUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            Verify on Solana Explorer
          </a>
        </Button>
        <Button
          variant="outline"
          onClick={handleCopy}
          className="h-11 gap-2 flex-1"
          aria-label="Copy proof hash"
        >
          {copied ? (
            <Check className="w-4 h-4 text-success" aria-hidden="true" />
          ) : (
            <Copy className="w-4 h-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy proof hash"}
        </Button>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
    </motion.div>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-overline text-text-muted">{label}</span>
      <span className={cn("text-body font-medium", mono && "font-mono text-sm")}>{value}</span>
    </div>
  );
}
