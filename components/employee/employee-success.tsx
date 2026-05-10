"use client";

import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { SealCard } from "@/components/seal-card";
import { getProgramId } from "@/lib/constants";

interface EmployeeSuccessProps {
  threshold: bigint;
  startTs: number;
  endTs: number;
  proofHashHex: string;
  onAnother: () => void;
}

const NINETY_DAYS = 90 * 86_400;

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  if (clean.length === 0) return new Uint8Array(32);
  const out = new Uint8Array(Math.ceil(clean.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function EmployeeSuccess({
  threshold,
  startTs,
  endTs,
  proofHashHex,
  onAnother,
}: EmployeeSuccessProps) {
  // The on-chain credential isn't fetched until `refreshCredential` resolves
  // post-mint; this preview synthesizes the SealCard fields from what's
  // already in scope. Issuer falls back to the program ID (the Explorer link
  // points to the TESSERA program, confirming origin) and employerCommitment
  // is rendered as zeros (the per-mint commitment was generated client-side
  // in EmployeeProve and isn't surfaced through ProveResult — the canonical
  // /credential/[address] view shows the real bytes).
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + NINETY_DAYS;
  const issuer = getProgramId();
  const proofHashBytes = hexToBytes(proofHashHex);
  const employerCommitment = new Uint8Array(32);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-8 items-center text-center w-full"
    >
      <div className="relative w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0, 0, 0.2, 1] }}
          className="relative z-10"
        >
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ boxShadow: "0 0 0px 0px transparent" }}
            animate={{ boxShadow: "0 0 60px 8px var(--seal-muted)" }}
            transition={{ duration: 0.7, ease: [0, 0, 0.2, 1] }}
          />
          <SealCard
            threshold={threshold}
            startTs={startTs}
            endTs={endTs}
            issuedAt={issuedAt}
            expiresAt={expiresAt}
            employerCommitment={employerCommitment}
            proofHash={proofHashBytes}
            issuer={issuer}
            className="w-full"
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="flex flex-col gap-4 max-w-sm items-center"
      >
        <h3 className="text-h3 font-display text-success">Credential minted</h3>
        <Button variant="secondary" onClick={onAnother} className="h-12">
          Create another
        </Button>
      </motion.div>
    </motion.div>
  );
}
