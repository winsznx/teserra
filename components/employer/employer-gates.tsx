"use client";

import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmployerLoadingState() {
  return (
    <Card variant="outlined" className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <Loader2 className="w-8 h-8 text-cipher animate-spin" aria-hidden="true" />
      <p className="text-caption text-text-muted">Initializing Umbra client...</p>
    </Card>
  );
}

export function EmployerConnectGate() {
  return (
    <Card variant="outlined" className="flex flex-col items-center justify-center py-20 text-center gap-4 border-dashed">
      <h3 className="text-h3 font-display">Connect a wallet to continue</h3>
      <p className="text-caption text-text-muted max-w-md">
        Use the Connect button in the header to link your Solana wallet. Your
        Umbra identity is derived from a one-time wallet signature.
      </p>
    </Card>
  );
}

export function EmployerInitFailedGate({ error }: { error: Error }) {
  return (
    <Card variant="outlined" className="flex flex-col items-center justify-center py-20 text-center gap-4 border-error/30">
      <h3 className="text-h3 font-display">Couldn&apos;t initialize Umbra</h3>
      <p className="text-caption text-text-muted max-w-md">{error.message}</p>
    </Card>
  );
}
