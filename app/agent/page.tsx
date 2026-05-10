"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { OnboardingModal } from "@/components/onboarding-modal";
import { useUmbra } from "@/hooks/use-umbra";

import { AgentSpawnCard } from "@/components/agent/agent-spawn-card";
import { AgentStateCard } from "@/components/agent/agent-state-card";
import { AgentControlPanel } from "@/components/agent/agent-control-panel";
import { AgentLiveFeed } from "@/components/agent/agent-live-feed";
import { WhatThisDemonstrates } from "@/components/agent/what-this-demonstrates";
import {
  AgentConnectGate,
  AgentInitFailedGate,
  AgentLoadingState,
} from "@/components/agent/agent-gates";

interface ActiveAgent {
  pubkey: string;
  umbraAddress: string;
  spawnedAt: number;
  running: boolean;
}

export default function AgentPage() {
  const { state: umbraState } = useUmbra();
  const [agent, setAgent] = React.useState<ActiveAgent | null>(null);
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  React.useEffect(() => {
    if (umbraState.phase === "ready" && !umbraState.isRegistered) setShowOnboarding(true);
  }, [umbraState]);

  const handleSpawn = (agentPubkey: string) => {
    setAgent({
      pubkey: agentPubkey,
      umbraAddress: agentPubkey,
      spawnedAt: Date.now(),
      running: true,
    });
  };

  const handleStop = () => {
    setAgent(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 max-w-screen-xl flex flex-col gap-12 lg:gap-16 pb-24"
    >
      <header className="flex flex-col gap-4">
        <h1 className="text-display-2 font-display uppercase tracking-tight">Agent Mode</h1>
        <p className="text-body-lg text-text-secondary max-w-2xl">
          Same protocol. No browser. No human. Autonomous.
        </p>
      </header>

      {umbraState.phase === "loading" || umbraState.phase === "initializing" ? <AgentLoadingState /> : null}
      {umbraState.phase === "no-wallet" ? <AgentConnectGate /> : null}
      {umbraState.phase === "init-failed" ? <AgentInitFailedGate error={umbraState.error} /> : null}

      {umbraState.phase === "ready" && !agent ? (
        <AgentSpawnCard onSpawned={handleSpawn} />
      ) : null}

      {umbraState.phase === "ready" && agent ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <AgentStateCard
              agentPubkey={agent.pubkey}
              umbraAddress={agent.umbraAddress}
              spawnedAt={agent.spawnedAt}
              running={agent.running}
            />
            <AgentControlPanel
              agentPubkey={agent.pubkey}
              agentUmbraAddress={agent.umbraAddress}
              running={agent.running}
              onStop={handleStop}
            />
          </div>
          <div className="lg:col-span-7">
            <AgentLiveFeed agentPubkey={agent.pubkey} />
          </div>
        </div>
      ) : null}

      <WhatThisDemonstrates />

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => setShowOnboarding(false)}
      />
    </motion.div>
  );
}
