"use client";

import { X, TriangleAlert, Info, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatusBannerProps {
  type: "indexer-offline" | "relayer-offline" | "demo-mode";
  message?: string;
}

export function StatusBanner({ type, message }: StatusBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const config = {
    "indexer-offline": {
      icon: <TriangleAlert className="w-4 h-4" />,
      bg: "bg-warning/15",
      text: "text-warning",
      border: "border-warning/30",
      defaultMessage: "Umbra indexer temporarily slow. Operations may take longer.",
    },
    "relayer-offline": {
      icon: <Info className="w-4 h-4" />,
      bg: "bg-bg-elevated",
      text: "text-text-secondary",
      border: "border-border-subtle",
      defaultMessage: "Gasless mode unavailable. A small SOL fee applies to withdrawals.",
    },
    "demo-mode": {
      icon: <Activity className="w-4 h-4" />,
      bg: "bg-cipher/10",
      text: "text-cipher",
      border: "border-cipher/20",
      defaultMessage: "You're on Devnet. Protocol status: Operational.",
    },
  };

  const { icon, bg, text, border, defaultMessage } = config[type];

  return (
    <div
      className={cn(
        "w-full py-2 px-4 border-b flex items-center justify-between text-xs font-medium",
        bg,
        text,
        border
      )}
    >
      <div className="flex items-center gap-2 mx-auto">
        {icon}
        <span>{message || defaultMessage}</span>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
