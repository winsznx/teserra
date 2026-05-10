"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Award, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RawUmbraUtxo } from "@/lib/umbra-witness";
import type { ProofConfig } from "./types";

interface EmployeeConfigureProps {
  utxos: RawUmbraUtxo[];
  onComplete: (config: ProofConfig) => void;
  onBack?: () => void;
}

const SIX_MONTHS_SECONDS = 180 * 86_400;

function defaultRange(now = Math.floor(Date.now() / 1000)): { start: string; end: string } {
  const end = new Date(now * 1000);
  const start = new Date((now - SIX_MONTHS_SECONDS) * 1000);
  return { start: toDateInput(start), end: toDateInput(end) };
}

function toDateInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateInputToUnix(value: string): number | null {
  if (!value) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

function endOfDayUnix(value: string): number | null {
  const ms = Date.parse(`${value}T23:59:59Z`);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

export function EmployeeConfigure({ utxos, onComplete, onBack }: EmployeeConfigureProps) {
  const initial = defaultRange();
  const [startDate, setStartDate] = React.useState(initial.start);
  const [endDate, setEndDate] = React.useState(initial.end);
  const [thresholdRaw, setThresholdRaw] = React.useState("3000");

  const startTs = dateInputToUnix(startDate);
  const endTs = endOfDayUnix(endDate);
  const thresholdNum = Number(thresholdRaw);
  const thresholdValid =
    thresholdRaw !== "" && Number.isFinite(thresholdNum) && thresholdNum > 0;

  const filteredUtxos = React.useMemo(() => {
    if (startTs == null || endTs == null) return [];
    return utxos.filter((u) => u.timestamp >= startTs && u.timestamp <= endTs);
  }, [utxos, startTs, endTs]);

  const sumFiltered = React.useMemo(
    () => filteredUtxos.reduce((s, u) => s + u.amount, BigInt(0)),
    [filteredUtxos],
  );

  const thresholdBig = thresholdValid ? BigInt(Math.floor(thresholdNum)) : BigInt(0);
  const meetsThreshold = thresholdValid && sumFiltered >= thresholdBig;
  const dateRangeValid = startTs != null && endTs != null && startTs < endTs;
  const canSubmit =
    dateRangeValid && thresholdValid && filteredUtxos.length >= 1 && meetsThreshold;

  const handleSubmit = () => {
    if (!canSubmit || startTs == null || endTs == null) return;
    onComplete({
      threshold: thresholdBig,
      startTs,
      endTs,
      filteredUtxos,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-8 max-w-xl"
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-h3 font-display">Configure your proof</h3>
        <p className="text-body-sm text-text-secondary">What income are you proving?</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 w-full">
          <label className="text-caption font-medium text-text-primary uppercase tracking-wider">
            Date range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="font-mono text-xs"
              aria-label="Start date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="font-mono text-xs"
              aria-label="End date"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full group">
          <label className="text-caption font-medium text-text-primary uppercase tracking-wider">
            Threshold (minimum income for this period)
          </label>
          <div className="relative">
            <Input
              type="number"
              value={thresholdRaw}
              onChange={(e) => setThresholdRaw(e.target.value)}
              className="font-mono h-12 pr-16"
              placeholder="0.00"
              min={0}
              aria-invalid={!thresholdValid}
            />
            <div className="absolute right-4 top-0 h-12 flex items-center pointer-events-none">
              <span className="text-sm font-mono text-text-muted group-hover:text-cipher transition-colors">
                USDC
              </span>
            </div>
          </div>
        </div>

        {dateRangeValid && filteredUtxos.length > 0 ? (
          <div className="p-4 bg-cipher/5 border border-cipher/20 rounded-md flex gap-4 items-start">
            <Award className="w-5 h-5 text-cipher shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-cipher leading-relaxed">
              Your selection includes{" "}
              <span className="font-bold">{filteredUtxos.length}</span> deposits in
              this range.
            </p>
          </div>
        ) : null}

        {dateRangeValid && filteredUtxos.length === 0 ? (
          <div className="p-4 bg-warning/5 border border-warning/30 rounded-md flex gap-4 items-start">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-warning leading-relaxed">
              No deposits fall inside this period. Widen the range to include
              more shielded payments.
            </p>
          </div>
        ) : null}

        {dateRangeValid && filteredUtxos.length >= 1 && thresholdValid && !meetsThreshold ? (
          <div className="p-4 bg-error/5 border border-error/30 rounded-md flex gap-4 items-start">
            <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-error leading-relaxed">
              Income in this period is below the threshold. Try a wider range or
              lower threshold.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={!canSubmit} className="h-12 text-base">
          Generate Proof →
        </Button>
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="h-12">
            Back to scan
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
}
