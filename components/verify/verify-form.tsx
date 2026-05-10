"use client";

import * as React from "react";
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";
import { Stamp, XCircle, ClipboardPaste, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isValidSolanaAddress } from "@/lib/umbra-deposit";
import {
  TESSERA_IDL,
  verifyCredential,
} from "@/lib/anchor";
import { NEXT_PUBLIC_SOLANA_RPC } from "@/lib/constants";

import {
  atomicToUsdc,
  runVerification,
  usdcToAtomic,
  type VerifyOutcome,
} from "./verify-flow";

interface VerifyFormProps {
  defaultThreshold: number;
  defaultAddress: string;
  onResult: (outcome: VerifyOutcome, owner: PublicKey) => void;
}

const READ_ONLY_PUBKEY = new PublicKey("11111111111111111111111111111111");

function readOnlyProgram(connection: Connection): Program<Idl> {
  const wallet = {
    publicKey: READ_ONLY_PUBKEY,
    signTransaction: (async () => {
      throw new Error("verify form: read-only provider cannot sign");
    }) as <T extends Transaction | VersionedTransaction>(t: T) => Promise<T>,
    signAllTransactions: (async () => {
      throw new Error("verify form: read-only provider cannot sign");
    }) as <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>,
  };
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  return new Program(TESSERA_IDL, provider) as unknown as Program<Idl>;
}

function formatExpires(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function expiredRelative(expiresAt: number, now = Math.floor(Date.now() / 1000)): string {
  const delta = now - expiresAt;
  if (delta <= 0) return "soon";
  if (delta < 86_400) return `${Math.floor(delta / 3600)} hours ago`;
  if (delta < 86_400 * 30) return `${Math.floor(delta / 86_400)} days ago`;
  return `${Math.floor(delta / (86_400 * 30))} months ago`;
}

export function VerifyForm({ defaultThreshold, defaultAddress, onResult }: VerifyFormProps) {
  const [thresholdRaw, setThresholdRaw] = React.useState(String(defaultThreshold));
  const [address, setAddress] = React.useState(defaultAddress);
  const [outcome, setOutcome] = React.useState<VerifyOutcome | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const thresholdNum = Number(thresholdRaw);
  const thresholdValid = Number.isFinite(thresholdNum) && thresholdNum > 0;
  const addressValid = isValidSolanaAddress(address);
  const canSubmit = thresholdValid && addressValid && !submitting;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddress(text.trim());
    } catch {
      // ignore — typing still works
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setOutcome(null);

    let ownerPubkey: PublicKey;
    try {
      ownerPubkey = new PublicKey(address);
    } catch {
      setSubmitting(false);
      return;
    }

    const required = usdcToAtomic(thresholdNum);
    const connection = new Connection(NEXT_PUBLIC_SOLANA_RPC, "confirmed");
    const program = readOnlyProgram(connection);

    const result = await runVerification(
      {
        findMostRecentByOwner: async (owner) => {
          const all = await (program.account as unknown as {
            credential: {
              all: (filters: { memcmp: { offset: number; bytes: string } }[]) => Promise<
                { publicKey: PublicKey; account: { issuedAt: BN | bigint; expiresAt: BN | bigint } }[]
              >;
            };
          }).credential.all([{ memcmp: { offset: 8, bytes: owner.toBase58() } }]);
          if (all.length === 0) return null;
          const sorted = [...all].sort((a, b) => {
            const aIssued = typeof a.account.issuedAt === "bigint"
              ? a.account.issuedAt
              : BigInt(a.account.issuedAt.toString());
            const bIssued = typeof b.account.issuedAt === "bigint"
              ? b.account.issuedAt
              : BigInt(b.account.issuedAt.toString());
            return Number(bIssued - aIssued);
          });
          const top = sorted[0];
          const issuedAt = typeof top.account.issuedAt === "bigint"
            ? top.account.issuedAt
            : BigInt(top.account.issuedAt.toString());
          const expiresAt = typeof top.account.expiresAt === "bigint"
            ? top.account.expiresAt
            : BigInt(top.account.expiresAt.toString());
          return { pda: top.publicKey, issuedAt, expiresAt };
        },
        verify: async (pda, requiredThreshold) => verifyCredential(program, pda, requiredThreshold),
      },
      ownerPubkey,
      required,
    );

    setOutcome(result);
    setSubmitting(false);
    onResult(result, ownerPubkey);

    if (result.kind === "rpc-error") {
      toast.error("Couldn't reach Solana. Try again in a moment.");
    }
  };

  return (
    <Card className="bg-bg-elevated/30 border-border-strong overflow-hidden">
      <CardHeader className="bg-bg-elevated/50 p-8 border-b border-border-subtle flex flex-row items-center justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-h3 font-display">Simulated Lending Protocol</CardTitle>
          <CardDescription>Loan eligibility check</CardDescription>
        </div>
        <Badge variant="cipher" className="uppercase tracking-widest text-[10px]">
          Demo
        </Badge>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 w-full group">
            <label
              htmlFor="threshold-input"
              className="text-caption font-medium text-text-primary uppercase tracking-wider"
            >
              Required income threshold
            </label>
            <div className="relative">
              <Input
                id="threshold-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={thresholdRaw}
                onChange={(e) => setThresholdRaw(e.target.value)}
                className="font-mono h-12 pr-20"
                aria-invalid={thresholdRaw.length > 0 && !thresholdValid}
                disabled={submitting}
                required
              />
              <div className="absolute right-4 top-0 h-12 flex items-center pointer-events-none">
                <span className="text-sm font-mono text-text-muted group-hover:text-cipher transition-colors">
                  USDC
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <label
              htmlFor="applicant-input"
              className="text-caption font-medium text-text-primary uppercase tracking-wider"
            >
              Applicant wallet address
            </label>
            <div className="relative">
              <Input
                id="applicant-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter Solana public key"
                className={`font-mono h-12 pr-20 ${
                  address.length > 0 && !addressValid
                    ? "border-error focus-visible:border-error"
                    : ""
                }`}
                aria-invalid={address.length > 0 && !addressValid}
                disabled={submitting}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePaste}
                className="absolute right-1 top-1 h-10 px-3 text-cipher hover:text-cipher-hover hover:bg-cipher/5 gap-2"
                disabled={submitting}
              >
                <ClipboardPaste className="w-4 h-4" aria-hidden="true" />
                Paste
              </Button>
            </div>
            {address.length > 0 && !addressValid ? (
              <p className="text-caption text-error">Not a valid Solana public key.</p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="h-12 text-base"
            loading={submitting}
            disabled={!canSubmit}
          >
            {submitting ? "Checking..." : "Check Eligibility →"}
          </Button>
        </form>

        <AnimatePresence mode="wait">
          {outcome ? (
            <motion.div
              key={outcome.kind + (outcome.credentialPda?.toBase58() ?? "")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
              className="mt-6"
            >
              <ResultBlock outcome={outcome} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function ResultBlock({ outcome }: { outcome: VerifyOutcome }) {
  if (outcome.kind === "approved") {
    return (
      <div className="p-5 bg-seal-muted border-2 border-seal/30 rounded-xl flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-full bg-seal flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <Stamp className="w-6 h-6 text-text-inverse" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-overline text-text-muted">Result</span>
          <p className="text-sm font-medium text-seal">
            Approved · Income above {atomicToUsdc(outcome.required)} USDC threshold.
            {outcome.expiresAt
              ? ` Credential expires ${formatExpires(outcome.expiresAt)}.`
              : ""}
          </p>
        </div>
      </div>
    );
  }

  const Icon = outcome.kind === "rpc-error" ? AlertTriangle : XCircle;
  let body: React.ReactNode;
  if (outcome.kind === "no-credential") {
    body = "Denied · No credential found at this address.";
  } else if (outcome.kind === "below-threshold") {
    body = `Denied · Credential threshold (${
      outcome.existing != null ? atomicToUsdc(outcome.existing) : "?"
    } USDC) below required (${atomicToUsdc(outcome.required)} USDC).`;
  } else if (outcome.kind === "expired") {
    body = `Denied · Credential expired ${
      outcome.expiresAt != null ? expiredRelative(outcome.expiresAt) : "recently"
    }.`;
  } else {
    body = "Couldn't reach Solana. Try again in a moment.";
  }
  return (
    <div className="p-5 bg-error/5 border-2 border-error/30 rounded-xl flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-full bg-error/15 flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <Icon className="w-6 h-6 text-error" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-overline text-text-muted">Result</span>
        <p className="text-sm font-medium text-error">{body}</p>
      </div>
    </div>
  );
}
