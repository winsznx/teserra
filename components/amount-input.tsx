"use client";

import * as React from "react";
import { Input as BaseInput } from "@/components/ui/input";

interface AmountInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  token?: string;
}

export function AmountInput({ label, token = "USDC", ...props }: AmountInputProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-caption font-medium text-text-primary uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <BaseInput
          {...props}
          type="number"
          className="font-mono pr-20 h-12 text-right"
          placeholder="0.00"
        />
        <div className="absolute right-4 top-0 h-12 flex items-center pointer-events-none">
          <span className="text-sm font-mono text-text-secondary">{token}</span>
        </div>
      </div>
    </div>
  );
}
