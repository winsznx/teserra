"use client";

import * as React from "react";
import { ClipboardPaste, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { USDC_MINT } from "@/lib/constants";
import {
  isValidSolanaAddress,
  checkRecipientUmbraStatus,
} from "@/lib/umbra-deposit";

import { type PaymentDraft, usdcAmountToAtomic } from "./types";

type RecipientCheck =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok" }
  | { status: "invalid-address" }
  | { status: "not-registered" }
  | { status: "rpc-error" };

interface NewShieldedPaymentFormProps {
  client: unknown;
  onSubmit: (draft: PaymentDraft) => void;
  submitting: boolean;
}

export function NewShieldedPaymentForm({
  client,
  onSubmit,
  submitting,
}: NewShieldedPaymentFormProps) {
  const [recipient, setRecipient] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [recipientCheck, setRecipientCheck] = React.useState<RecipientCheck>({ status: "idle" });

  const recipientShape = recipient.length === 0 || isValidSolanaAddress(recipient);
  const amountNum = Number(amount);
  const amountValid = amount.length > 0 && Number.isFinite(amountNum) && amountNum > 0;

  // Debounce the on-chain registration check by 400ms after the user stops
  // typing. This avoids hammering the RPC on every keystroke.
  React.useEffect(() => {
    if (recipient.length === 0) {
      setRecipientCheck({ status: "idle" });
      return;
    }
    if (!isValidSolanaAddress(recipient)) {
      setRecipientCheck({ status: "invalid-address" });
      return;
    }
    let cancelled = false;
    setRecipientCheck({ status: "checking" });
    const handle = setTimeout(async () => {
      const result = await checkRecipientUmbraStatus(client, recipient);
      if (cancelled) return;
      if (result.ok) setRecipientCheck({ status: "ok" });
      else setRecipientCheck({ status: result.reason });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [recipient, client]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipient(text.trim());
    } catch {
      // clipboard may be unavailable (no permission, http context, etc.) —
      // silently fall back; the user can still type.
    }
  };

  const canSubmit =
    recipientCheck.status === "ok" &&
    amountValid &&
    !submitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      recipient,
      amountAtomic: usdcAmountToAtomic(amountNum),
      reference,
      mint: USDC_MINT,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 w-full">
        <label
          htmlFor="recipient-input"
          className="text-caption font-medium text-text-primary uppercase tracking-wider"
        >
          Recipient Umbra Address
        </label>
        <div className="relative">
          <Input
            id="recipient-input"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="9xQeRy7vH96Yx4Hp2PkB9z..."
            className={`font-mono pr-20 h-12 ${
              !recipientShape || recipientCheck.status === "not-registered"
                ? "border-error focus-visible:border-error"
                : ""
            }`}
            aria-invalid={!recipientShape || recipientCheck.status === "not-registered"}
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
        <RecipientHelper check={recipientCheck} shapeValid={recipientShape} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2 w-full group">
          <label
            htmlFor="amount-input"
            className="text-caption font-medium text-text-primary uppercase tracking-wider"
          >
            Amount
          </label>
          <div className="relative">
            <Input
              id="amount-input"
              type="number"
              inputMode="decimal"
              step="0.000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono h-12 pr-20"
              placeholder="0.00"
              aria-invalid={amount.length > 0 && !amountValid}
              disabled={submitting}
              required
            />
            <div className="absolute right-4 top-0 h-12 flex items-center pointer-events-none">
              <span className="text-sm font-mono text-text-muted group-hover:text-cipher transition-colors">
                dUSDC
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-caption font-medium text-text-primary uppercase tracking-wider">
            Token
          </label>
          <div className="h-12 flex items-center px-4 bg-bg-surface border border-border-subtle rounded-md text-sm font-mono">
            dUSDC (Devnet)
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="reference-input"
          className="text-caption font-medium text-text-primary uppercase tracking-wider"
        >
          Reference (optional, off-chain note)
        </label>
        <Input
          id="reference-input"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="March salary"
          disabled={submitting}
          maxLength={64}
        />
        <p className="text-caption text-text-muted">
          Visible only to the recipient when they decrypt
        </p>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          loading={submitting}
          disabled={!canSubmit}
          className="h-14 text-base w-full md:w-auto"
        >
          {submitting ? "Shielding..." : "Shield Payment →"}
        </Button>
      </div>
    </form>
  );
}

function RecipientHelper({
  check,
  shapeValid,
}: {
  check: RecipientCheck;
  shapeValid: boolean;
}) {
  if (!shapeValid || check.status === "invalid-address") {
    return (
      <p className="text-caption text-error flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Not a valid Umbra address
      </p>
    );
  }
  if (check.status === "checking") {
    return (
      <p className="text-caption text-text-muted flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Checking recipient...
      </p>
    );
  }
  if (check.status === "not-registered") {
    return (
      <p className="text-caption text-error leading-relaxed">
        Recipient hasn&apos;t registered with Umbra. Network-Balance escrow would
        auto-claim for them, but isn&apos;t enabled in this build yet.
      </p>
    );
  }
  if (check.status === "rpc-error") {
    return (
      <p className="text-caption text-warning flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Couldn&apos;t reach Solana to verify recipient. Retrying...
      </p>
    );
  }
  if (check.status === "ok") {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-caption text-success"
      >
        ✓ Recipient ready to receive shielded payments
      </motion.p>
    );
  }
  return <p className="text-caption text-text-muted">where to send the payment</p>;
}
