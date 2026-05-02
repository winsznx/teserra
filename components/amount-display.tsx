"use client";

import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AmountDisplayProps {
  amount: bigint | number;
  token?: string;
  decimals?: number;
  hidden?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AmountDisplay({
  amount,
  token = "USDC",
  decimals = 6,
  hidden = false,
  className,
  size = "md",
}: AmountDisplayProps) {
  const formatted = React.useMemo(() => {
    if (hidden) return `•••• ${token}`;
    
    const value = typeof amount === "bigint" 
      ? Number(amount) / Math.pow(10, decimals)
      : amount;
    
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    }).format(value);
  }, [amount, token, decimals, hidden]);

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-lg",
  };

  return (
    <div className={cn("font-mono inline-flex items-baseline gap-1.5", sizeClasses[size], className)}>
      <span className="text-text-primary font-medium">
        {hidden ? "••••" : formatted}
      </span>
      <span className="text-text-secondary text-[0.8em]">
        {token}
      </span>
    </div>
  );
}
