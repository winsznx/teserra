"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SealCard, type SealCardStatus } from "@/components/seal-card";

/** Wire-shape passed by the server. `PublicKey` instances + `Uint8Array`
 *  fields lose their prototypes when crossing the React Server → Client
 *  boundary, so we serialise everything to JSON-safe primitives in
 *  `app/credential/[address]/page.tsx` before handing off. */
export interface CredentialWire {
  threshold: bigint;
  startTs: bigint;
  endTs: bigint;
  issuedAt: bigint;
  expiresAt: bigint;
  incomeAboveThreshold: boolean;
  employerCommitment: number[];
  proofHash: number[];
  issuer: string;
  ownerBase58: string;
}

interface CredentialViewerContentProps {
  /** Original URL param the user landed on — used for the "not found"
   *  empty-state link to Explorer and for the page subtitle context. */
  paramAddress: string;
  credential: CredentialWire | null;
  credentialPdaBase58: string | null;
}

function deriveStatus(c: CredentialWire, now = Math.floor(Date.now() / 1000)): SealCardStatus {
  if (Number(c.expiresAt) <= now) return "expired";
  if (!c.incomeAboveThreshold) return "revoked";
  return "valid";
}

function formatThresholdAtomic(atomic: bigint): string {
  const divisor = BigInt(10) ** BigInt(6);
  const whole = atomic / divisor;
  return whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatRange(startTs: bigint, endTs: bigint): string {
  const fmt = (n: bigint) =>
    new Date(Number(n) * 1000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(startTs)} — ${fmt(endTs)}`;
}

export function CredentialViewerContent({
  paramAddress,
  credential,
  credentialPdaBase58,
}: CredentialViewerContentProps) {
  if (!credential || !credentialPdaBase58) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 md:px-8 lg:px-12 py-16 lg:py-24 max-w-2xl flex flex-col items-center text-center gap-6"
      >
        <div
          className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted"
          aria-hidden="true"
        >
          <Search className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 font-display">No credential at this address</h1>
          <p className="text-body-sm text-text-secondary max-w-md">
            The address doesn&apos;t have a TESSERA credential, or it&apos;s been revoked.
          </p>
        </div>
        <Button asChild variant="secondary" className="gap-2">
          <a
            href={`https://explorer.solana.com/address/${paramAddress}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            Verify on Explorer
          </a>
        </Button>
        <Link href="/verify" className="text-caption text-text-muted underline-offset-4 hover:underline">
          ← Back to verifier demo
        </Link>
      </motion.div>
    );
  }

  const status = deriveStatus(credential);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 md:px-8 lg:px-12 py-12 lg:py-16 max-w-3xl flex flex-col gap-12 pb-24"
    >
      <div className="flex flex-col gap-4 text-center items-center">
        <span className="text-overline text-text-muted">Credential</span>
      </div>

      <SealCard
        threshold={credential.threshold}
        startTs={Number(credential.startTs)}
        endTs={Number(credential.endTs)}
        issuedAt={Number(credential.issuedAt)}
        expiresAt={Number(credential.expiresAt)}
        employerCommitment={Uint8Array.from(credential.employerCommitment)}
        proofHash={Uint8Array.from(credential.proofHash)}
        issuer={credential.issuer}
        status={status}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-bg-elevated/30 border-border-strong p-6 flex flex-col gap-3">
          <h3 className="text-overline text-text-muted">What this credential proves</h3>
          <p className="text-body-sm text-text-secondary leading-relaxed">
            The holder&apos;s verified income exceeds {formatThresholdAtomic(credential.threshold)} USDC
            over {formatRange(credential.startTs, credential.endTs)}. The exact amount, employer
            identity, and transaction history are not disclosed.
          </p>
        </Card>
        <Card className="bg-bg-elevated/30 border-border-strong p-6 flex flex-col gap-3">
          <h3 className="text-overline text-text-muted">How verifiers use it</h3>
          <p className="text-body-sm text-text-secondary leading-relaxed">
            Any Solana protocol can call <code className="font-mono text-cipher">verify_credential(holder)</code>{" "}
            on the TESSERA program. They never see income data.
          </p>
        </Card>
      </div>
    </motion.div>
  );
}
