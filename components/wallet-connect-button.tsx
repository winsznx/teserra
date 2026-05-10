"use client";

import * as React from "react";
import { Wallet, LogOut, Loader2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

import { Button } from "@/components/ui/button";

function shortAddress(base58: string): string {
  return `${base58.slice(0, 6)}...${base58.slice(-4)}`;
}

export function WalletConnectButton() {
  const { publicKey, connecting, connected, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();

  if (connecting) {
    return (
      <Button variant="secondary" className="gap-2 min-w-[140px]" disabled>
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Connecting...
      </Button>
    );
  }

  if (connected && publicKey) {
    const label = shortAddress(publicKey.toBase58());
    return (
      <Button
        variant="secondary"
        className="gap-2 font-mono text-xs group relative min-w-[140px]"
        onClick={() => {
          void disconnect();
        }}
        aria-label={`Disconnect ${wallet?.adapter.name ?? "wallet"} (${label})`}
      >
        <Wallet className="w-4 h-4 text-cipher group-hover:hidden" aria-hidden="true" />
        <span className="group-hover:hidden">{label}</span>
        <LogOut className="w-4 h-4 text-error hidden group-hover:block" aria-hidden="true" />
        <span className="hidden group-hover:block text-error font-sans">Disconnect</span>
      </Button>
    );
  }

  return (
    <Button onClick={() => setVisible(true)} className="gap-2 min-w-[140px]">
      <Wallet className="w-4 h-4" aria-hidden="true" />
      Connect
    </Button>
  );
}
