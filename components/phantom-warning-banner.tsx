"use client";

import * as React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AlertTriangle, X } from "lucide-react";

const STORAGE_KEY = "tessera-phantom-warning-dismissed";

function isPhantom(name: string | undefined | null): boolean {
  return Boolean(name && /phantom/i.test(name));
}

export function PhantomWarningBanner() {
  const { wallet, connected } = useWallet();
  const [dismissed, setDismissed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
    if (typeof window === "undefined") return;
    try {
      setDismissed(window.sessionStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // sessionStorage may be blocked (Safari private mode, etc.) — show the
      // banner each time rather than swallowing the warning.
    }
  }, []);

  if (!hydrated) return null;
  if (!connected) return null;
  if (!isPhantom(wallet?.adapter.name)) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // ignore — dismissal still applies for the rest of this render tree
      }
    }
  };

  return (
    <div
      role="alert"
      className="border-b border-warning/30 bg-warning/5 text-warning"
    >
      <div className="container mx-auto px-4 md:px-8 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-xs leading-relaxed flex-1">
          Phantom can modify transactions in ways that break Umbra verification
          (SolanaError #7050012). Solflare is recommended until the Umbra team
          ships a fix.
        </p>
        <button
          onClick={handleDismiss}
          className="text-warning/80 hover:text-warning transition-colors p-0.5 -m-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-warning"
          aria-label="Dismiss Phantom warning"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
