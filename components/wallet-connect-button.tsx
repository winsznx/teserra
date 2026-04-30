"use client";

import * as React from "react";
import { Wallet, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function WalletConnectButton() {
  const [connected, setConnected] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [address, setAddress] = React.useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    // Simulate wallet connection
    setTimeout(() => {
      setAddress("9xQeRy7vH96Yx4Hp2..."); // Mock address
      setConnected(true);
      setConnecting(false);
    }, 1000);
  };

  const disconnect = () => {
    setConnected(false);
    setAddress(null);
  };

  if (connecting) {
    return (
      <Button variant="secondary" className="gap-2 min-w-[140px]" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
        Connecting
      </Button>
    );
  }

  if (connected && address) {
    return (
      <Button
        variant="secondary"
        className="gap-2 font-mono text-xs group relative min-w-[140px]"
        onClick={disconnect}
      >
        <Wallet className="w-4 h-4 text-cipher group-hover:hidden" />
        <span className="group-hover:hidden">{address.slice(0, 6)}...{address.slice(-4)}</span>
        
        <LogOut className="w-4 h-4 text-error hidden group-hover:block" />
        <span className="hidden group-hover:block text-error font-sans">Disconnect</span>
      </Button>
    );
  }

  return (
    <Button onClick={connect} className="gap-2 min-w-[140px]">
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </Button>
  );
}
