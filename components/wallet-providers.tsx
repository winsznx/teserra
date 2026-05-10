"use client";

import * as React from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import { NEXT_PUBLIC_SOLANA_RPC } from "@/lib/constants";

// Wallet discovery: rely entirely on the Wallet Standard auto-registration
// path. Solflare and Phantom both ship Wallet Standard adapters that register
// themselves on `window`, and the `WalletProvider` enumerates those at
// runtime — passing the legacy adapters as well caused duplicate entries +
// a console warning "registered twice with conflicting features" on devnet.
//
// G73 stays in effect: when the connected wallet's name matches /phantom/i,
// `<PhantomWarningBanner>` renders the SolanaError #7050012 advisory because
// Phantom rewrites transactions post-sign in a way Umbra's strict tx-shape
// check rejects.
const wallets: never[] = [];

interface WalletProvidersProps {
  children: React.ReactNode;
}

export function WalletProviders({ children }: WalletProvidersProps) {
  return (
    <ConnectionProvider endpoint={NEXT_PUBLIC_SOLANA_RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
