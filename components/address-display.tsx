"use client";

import * as React from "react";
import { Copy, Check, ExternalLink, Lock, Link2 } from "lucide-react";
import { toast } from "sonner";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AddressDisplayProps {
  address: string;
  type?: "solana" | "umbra";
  withExplorer?: boolean;
  className?: string;
}

export function AddressDisplay({
  address,
  type = "solana",
  withExplorer = false,
  className,
}: AddressDisplayProps) {
  const [copied, setCopied] = React.useState(false);

  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 1400);
    } catch (err) {
      toast.error("Failed to copy address");
    }
  };

  const isUmbra = type === "umbra";

  return (
    <div className={cn("inline-flex items-center gap-2 font-mono text-sm", className)}>
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded bg-bg-elevated/50 border border-border-subtle group",
          isUmbra ? "text-cipher border-cipher/20" : "text-text-secondary"
        )}
      >
        {isUmbra ? (
          <Lock className="w-3.5 h-3.5" aria-label="Stealth address (Umbra)" />
        ) : (
          <Link2 className="w-3.5 h-3.5" aria-label="Solana address" />
        )}
        
        <span className="cursor-default" title={address}>
          {truncated}
        </span>

        <button
          onClick={copyToClipboard}
          className="ml-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Copy address"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>

        {withExplorer && !isUmbra && (
          <a
            href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="View on Explorer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
