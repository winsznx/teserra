"use client";

import * as React from "react";
import { Input as BaseInput } from "@/components/ui/input";
import { CalendarRange } from "lucide-react";

export function DateRangeInput({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-caption font-medium text-text-primary uppercase tracking-wider">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <BaseInput type="date" className="font-mono text-xs" />
        <BaseInput type="date" className="font-mono text-xs" />
      </div>
    </div>
  );
}

export function ThresholdInput({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 w-full group">
      <label className="text-caption font-medium text-text-primary uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <BaseInput
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono h-12 pr-16"
          placeholder="0.00"
        />
        <div className="absolute right-4 top-0 h-12 flex items-center pointer-events-none">
          <span className="text-sm font-mono text-text-muted group-hover:text-cipher transition-colors">USDC</span>
        </div>
      </div>
    </div>
  );
}
