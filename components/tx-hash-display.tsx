"use client";

import * as React from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TxHashDisplayProps {
  hash: string;
  className?: string;
}

export function TxHashDisplay({ hash, className }: TxHashDisplayProps) {
  const [copied, setCopied] = React.useState(false);

  const truncated = `${hash.slice(0, 8)}...${hash.slice(-8)}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      toast.success("Hash copied");
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-2 font-mono text-xs", className)}>
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-bg-elevated/50 border border-border-subtle text-text-secondary">
        <span className="cursor-default" title={hash}>
          {truncated}
        </span>

        <button
          onClick={copyToClipboard}
          className="text-text-muted hover:text-text-primary transition-colors"
          aria-label="Copy hash"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>

        <a
          href={`https://explorer.solana.com/tx/${hash}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-text-primary transition-colors"
          aria-label="View on Explorer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
