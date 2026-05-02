"use client";

import * as React from "react";
import { SealCard } from "@/components/seal-card";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, Copy } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface CredentialViewerContentProps {
  address: string;
  found: boolean;
}

export function CredentialViewerContent({ address, found }: CredentialViewerContentProps) {
  if (!found) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 max-w-screen-xl flex flex-col items-center justify-center py-24 gap-6 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted">
          <Search className="w-10 h-10" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-display-2 font-display">Credential Not Found</h1>
          <p className="text-body-lg text-text-secondary max-w-md">
            No active TESSERA credential found for the address <span className="font-mono text-text-primary">{address}</span>.
          </p>
        </div>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/verify">Verify another address</Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 flex flex-col gap-12 lg:gap-16 max-w-4xl mx-auto pb-24"
    >
      <div className="flex flex-col gap-4 text-center items-center">
        <h1 className="text-display-2 font-display uppercase tracking-tight">Credential Viewer</h1>
        <p className="text-body-lg text-text-secondary">
          Official zero-knowledge proof of income for <span className="font-mono text-text-primary underline decoration-cipher/30">{address}</span>
        </p>
      </div>

      <div className="flex justify-center">
        <SealCard
          threshold={5000}
          dateRange="Jan 12 — Apr 28 2026"
          issuedAt="Apr 30, 2026"
          expiresAt="Jul 30, 2026"
          employerCommitment="4Vt89zXp...nP2k"
          proofHash="9xQeRy7v...H96Y"
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button variant="secondary" className="h-12 gap-2">
          <ExternalLink className="w-4 h-4" />
          Verify on Solana Explorer
        </Button>
        <Button variant="outline" className="h-12 gap-2">
          <Copy className="w-4 h-4" />
          Copy Proof Hash
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-border-subtle">
        <div className="flex flex-col gap-4">
          <h3 className="text-h3 font-display">What this credential proves</h3>
          <p className="text-body-sm text-text-secondary leading-relaxed">
            This TESSERA credential cryptographically proves that the owner has received
            aggregated income exceeding the specified threshold during the given date range.
            The proof is generated via a Groth16 ZK circuit and verified on-chain by the
            TESSERA Protocol.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="text-h3 font-display">How verifiers use it</h3>
          <p className="text-body-sm text-text-secondary leading-relaxed">
            Protocols and agents can verify this credential with a single on-chain CPI call
            to the TESSERA program. This allows for trustless, undercollateralized lending,
            rental agreements, and gated access without ever seeing the user&apos;s raw income
            or transaction history.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
