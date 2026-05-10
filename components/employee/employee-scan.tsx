"use client";

import * as React from "react";
import { Loader2, Search, AlertTriangle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AddressDisplay } from "@/components/address-display";
import { useUmbra } from "@/hooks/use-umbra";
import { isG81ScannerBug, type RawUmbraUtxo } from "@/lib/umbra-witness";
import { USDC_MINT } from "@/lib/constants";

interface EmployeeScanProps {
  onComplete: (utxos: RawUmbraUtxo[]) => void;
  onError: (err: Error) => void;
}

type ScanState =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "scanned"; utxos: RawUmbraUtxo[] }
  | { kind: "scan-error"; err: Error };

function periodFor(utxos: RawUmbraUtxo[]): string {
  if (utxos.length === 0) return "";
  const sorted = [...utxos].sort((a, b) => a.timestamp - b.timestamp);
  return `${formatDate(sorted[0].timestamp)} — ${formatDate(sorted[sorted.length - 1].timestamp)}`;
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EmployeeScan({ onComplete, onError }: EmployeeScanProps) {
  const { scan, state: umbraState } = useUmbra();
  const [scanState, setScanState] = React.useState<ScanState>({ kind: "idle" });

  const startScan = React.useCallback(async () => {
    setScanState({ kind: "scanning" });
    try {
      const utxos = await scan({
        startTs: 0,
        endTs: Math.floor(Date.now() / 1000),
        mint: USDC_MINT,
      });
      setScanState({ kind: "scanned", utxos });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setScanState({ kind: "scan-error", err });
      if (isG81ScannerBug(err)) {
        // User-facing copy stays calm; the technical detail (G81 SDK bug)
        // goes to the console for the developer reading dev tools.
        if (typeof console !== "undefined") {
          console.warn("Umbra SDK scanner threw G81 — see gaps.md.", err);
        }
        toast.error("Couldn't read your shielded inbox right now. Refresh and try again.");
      } else {
        toast.error("Couldn't reach Solana. Try again in a moment.");
      }
      onError(err);
    }
  }, [scan, onError]);

  const handleContinue = () => {
    if (scanState.kind === "scanned") onComplete(scanState.utxos);
  };

  const umbraAddress = umbraState.phase === "ready" ? umbraState.umbraAddress : null;

  if (scanState.kind === "scanned" && scanState.utxos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-6 max-w-xl"
      >
        <div className="flex flex-col gap-2 items-start">
          <ShieldAlert className="w-8 h-8 text-text-muted" aria-hidden="true" />
          <h3 className="text-h3 font-display">No shielded deposits found</h3>
          <p className="text-body-sm text-text-secondary leading-relaxed">
            You haven&apos;t received any payments through Umbra yet. Share your
            Umbra address with your employer, then come back here.
          </p>
        </div>
        {umbraAddress ? (
          <div className="flex flex-col gap-2">
            <span className="text-overline text-text-muted">Your Umbra Address</span>
            <AddressDisplay address={umbraAddress} type="umbra" className="text-base" />
          </div>
        ) : null}
        <Button variant="secondary" onClick={() => setScanState({ kind: "idle" })}>
          Scan again
        </Button>
      </motion.div>
    );
  }

  if (scanState.kind === "scanned") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-6 max-w-xl"
      >
        <div className="flex flex-col gap-2">
          <h3 className="text-h3 font-display">
            Found {scanState.utxos.length} shielded deposits
          </h3>
          <p className="text-body-sm text-text-secondary">Total period: {periodFor(scanState.utxos)}</p>
        </div>
        <Button onClick={handleContinue} className="h-12 text-base self-start">
          Continue →
        </Button>
      </motion.div>
    );
  }

  if (scanState.kind === "scan-error") {
    const isG81 = isG81ScannerBug(scanState.err);
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 max-w-xl"
      >
        <div className="flex flex-col gap-2 items-start">
          <AlertTriangle className="w-8 h-8 text-warning" aria-hidden="true" />
          <h3 className="text-h3 font-display">Scan unavailable</h3>
          <p className="text-body-sm text-text-secondary leading-relaxed">
            {isG81
              ? "Couldn't read your shielded inbox right now. The SDK that decrypts UTXOs is rate-limiting; refresh and try again in a moment."
              : "Couldn't reach Solana. Try again in a moment."}
          </p>
        </div>
        <Button variant="secondary" onClick={startScan}>
          Retry scan
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-6 max-w-xl"
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-h3 font-display">Scan your income</h3>
        <p className="text-body-sm text-text-secondary leading-relaxed">
          Scan your Umbra UTXOs to find shielded salary payments. Your viewing
          key never leaves your device.
        </p>
      </div>
      <Button
        onClick={startScan}
        loading={scanState.kind === "scanning"}
        className="h-12 text-base self-start gap-2"
      >
        {scanState.kind === "scanning" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Scanning...
          </>
        ) : (
          <>
            <Search className="w-4 h-4" aria-hidden="true" />
            Scan UTXOs →
          </>
        )}
      </Button>
    </motion.div>
  );
}
