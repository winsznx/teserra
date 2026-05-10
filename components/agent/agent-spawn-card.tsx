"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bot, Cpu, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface AgentSpawnCardProps {
  onSpawned: (agentPubkey: string) => void;
}

interface SpawnResponse {
  agentPubkey: string;
  umbraAddress: string;
  isFresh: boolean;
  isRegistered: boolean;
  warning?: string;
}

export function AgentSpawnCard({ onSpawned }: AgentSpawnCardProps) {
  const [submitting, setSubmitting] = React.useState(false);

  const handleSpawn = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/agent/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useDay0Keypair: true }),
      });
      if (!res.ok) {
        const text = await res.text();
        toast.error(`Couldn't spawn agent (${res.status})`);
        throw new Error(`spawn failed: ${text.slice(0, 120)}`);
      }
      const body = (await res.json()) as SpawnResponse;
      if (body.warning) toast.warning(body.warning);
      onSpawned(body.agentPubkey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-24 gap-8 text-center"
    >
      <div className="w-24 h-24 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Bot className="w-12 h-12" aria-hidden="true" />
        </motion.div>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 font-display uppercase tracking-tight">No agent running</h2>
        <p className="text-body-lg text-text-secondary max-w-md">
          Spawn a demo agent to see TESSERA in agent mode.
        </p>
      </div>

      <div className="md:hidden p-4 bg-warning/10 border border-warning/30 rounded-md text-warning text-xs flex gap-2 items-start max-w-sm">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span>Open on desktop to interact with the demo agent.</span>
      </div>

      <Button onClick={handleSpawn} disabled={submitting} className="hidden md:flex h-14 px-8 text-base gap-3">
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        ) : (
          <Cpu className="w-5 h-5" aria-hidden="true" />
        )}
        {submitting ? "Spawning agent..." : "Spawn Demo Agent"}
      </Button>

      <p className="text-caption text-text-muted max-w-md leading-relaxed">
        Demo agent: same Solana identity as your wallet, different protocol role.
      </p>
    </motion.div>
  );
}
