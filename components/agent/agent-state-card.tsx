"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AddressDisplay } from "@/components/address-display";

interface AgentStateCardProps {
  agentPubkey: string;
  /** Same as agentPubkey today (Umbra address = wallet pubkey) but kept as
   *  a separate prop so /agent stays correct if Umbra ever derives a
   *  distinct stealth address per session. PRD §21.4 requires the two be
   *  visually distinguishable. */
  umbraAddress: string;
  spawnedAt: number;
  running: boolean;
}

function relativeTime(unixMs: number, now = Date.now()): string {
  const delta = Math.max(0, Math.floor((now - unixMs) / 1000));
  if (delta < 60) return delta < 5 ? "just now" : `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  return `${Math.floor(delta / 3600)}h ago`;
}

export function AgentStateCard({
  agentPubkey,
  umbraAddress,
  spawnedAt,
  running,
}: AgentStateCardProps) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-bg-elevated/30 border-border-strong">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-h3 font-display">Agent Control</CardTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            running
              ? "bg-success/10 border border-success/30"
              : "bg-error/10 border border-error/30"
          }`}
        >
          <motion.div
            className={`w-2 h-2 rounded-full ${running ? "bg-success" : "bg-error"}`}
            animate={running ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
            transition={running ? { duration: 1.5, repeat: Infinity } : undefined}
          />
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              running ? "text-success" : "text-error"
            }`}
          >
            {running ? "Running" : "Stopped"}
          </span>
        </motion.div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-overline text-text-muted">Pubkey</span>
          <AddressDisplay address={agentPubkey} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-overline text-text-muted">Umbra address</span>
          <AddressDisplay address={umbraAddress} type="umbra" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-overline text-text-muted">Spawned</span>
          <span className="text-body-sm font-medium">{relativeTime(spawnedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
