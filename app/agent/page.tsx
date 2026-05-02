"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Cpu, Power, PowerOff, Terminal, Activity, Zap, ShieldCheck } from "lucide-react";
import { AddressDisplay } from "@/components/address-display";
import { AmountDisplay } from "@/components/amount-display";
import { LiveFeedItem, type LiveFeedEvent } from "@/components/live-feed-item";

import { motion } from "framer-motion";

export default function AgentPage() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [spawned, setSpawned] = React.useState(false);
  const [events, setEvents] = React.useState<LiveFeedEvent[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleSpawn = () => {
    setSpawned(true);
    setIsRunning(true);
    addEvent("agent.spawned", { pubkey: "9xQeRy7v...", status: "active" }, "success");
    
    // Start simulation
    setTimeout(() => simulateEvents(), 1000);
  };

  const addEvent = (name: string, payload: Record<string, string | number>, status: "success" | "in-progress" | "error") => {
    const newEvent: LiveFeedEvent = {
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      name,
      payload,
      status
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const simulateEvents = () => {
    if (!isRunning) return;

    const scenarios = [
      () => addEvent("payment.received", { from: "DAO_Treasury", amount: "1.25", token: "USDC" }, "success"),
      () => addEvent("proof.generating", { period: "2026-Q1", threshold: "1000" }, "in-progress"),
      () => addEvent("proof.complete", { duration: "842ms", hash: "9xQe...4Hp2" }, "success"),
      () => addEvent("credential.minted", { tx: "4Vt8...nP2k" }, "success"),
      () => addEvent("x402.outbound", { to: "Inference_API", amount: "0.05", service: "llama-3" }, "success"),
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < scenarios.length) {
        scenarios[i]();
        i++;
      } else {
        clearInterval(interval);
      }
    }, 3000);
  };

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  if (!spawned) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 max-w-screen-xl flex flex-col items-center justify-center py-24 gap-8 text-center"
      >
        <div className="w-24 h-24 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted">
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Bot className="w-12 h-12" />
          </motion.div>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-display-2 font-display uppercase tracking-tight">No agent running</h1>
          <p className="text-body-lg text-text-secondary max-w-md">
            Deploy an autonomous TESSERA agent to manage private income and payments headlessly.
          </p>
        </div>
        <div className="md:hidden p-4 bg-error/10 border border-error/20 rounded-md text-error text-xs">
          Open on desktop to interact with the demo agent.
        </div>
        <Button onClick={handleSpawn} className="hidden md:flex h-14 px-8 text-base gap-3">
          <Cpu className="w-5 h-5" />
          Spawn Demo Agent
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 max-w-screen-xl flex flex-col gap-12 lg:gap-16 pb-24"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-display-2 font-display uppercase tracking-tight">Agent Control</h1>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1 bg-success/10 border border-success/30 rounded-full"
          >
            <motion.div 
              className="w-2 h-2 rounded-full bg-success" 
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-success">Running</span>
          </motion.div>
        </div>
        <p className="text-body-lg text-text-secondary max-w-2xl">
          Autonomous economic infrastructure for machine-to-machine private payments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Control Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="bg-bg-elevated/30 border-border-strong">
            <CardHeader>
              <CardTitle className="text-h3 font-display">Identity & Balance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <span className="text-overline text-text-muted">Agent Pubkey</span>
                <AddressDisplay address="9xQeRy7vH96Yx4Hp2PkB9zT5w..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-overline text-text-muted">Umbra Identity</span>
                <AddressDisplay address="UmbrA7vH96Yx4Hp2PkB9zT5w..." type="umbra" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-overline text-text-muted">Total Private Balance</span>
                <AmountDisplay amount={12500000} size="lg" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button variant="secondary" className="gap-2 h-12" onClick={() => addEvent("action.triggered", { name: "mint" }, "success")}>
                  <Zap className="w-4 h-4 text-cipher" />
                  Mint
                </Button>
                <Button variant="secondary" className="gap-2 h-12" onClick={() => setIsRunning(!isRunning)}>
                  {isRunning ? <PowerOff className="w-4 h-4 text-error" /> : <Power className="w-4 h-4 text-success" />}
                  {isRunning ? "Stop" : "Start"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card variant="outlined" className="p-6 flex flex-col gap-4">
            <h4 className="text-caption font-bold uppercase tracking-widest">Capabilities Unlocked</h4>
            <ul className="flex flex-col gap-3">
              <li className="flex gap-3 items-center text-xs text-text-secondary">
                <ShieldCheck className="w-4 h-4 text-cipher" />
                Headless Umbra Registration
              </li>
              <li className="flex gap-3 items-center text-xs text-text-secondary">
                <ShieldCheck className="w-4 h-4 text-cipher" />
                Autonomous ZK Proving
              </li>
              <li className="flex gap-3 items-center text-xs text-text-secondary">
                <ShieldCheck className="w-4 h-4 text-cipher" />
                x402 Private Payment Mesh
              </li>
            </ul>
          </Card>
        </div>

        {/* Right: Live Feed */}
        <div className="lg:col-span-7 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-text-muted" />
              <span className="text-overline text-text-muted">Live Feed</span>
            </div>
            <Activity className="w-4 h-4 text-cipher animate-pulse" />
          </div>
          
          <div 
            ref={scrollRef}
            className="flex-1 bg-bg-base/60 backdrop-blur-sm border border-border-strong rounded-lg p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border-emphasis"
            role="log"
            aria-live="polite"
          >
            <div className="flex flex-col gap-0.5">
              {events.length === 0 ? (
                <div className="text-text-muted font-mono text-xs italic p-4 text-center">
                  Waiting for events...
                </div>
              ) : (
                events.map((event, idx) => (
                  <LiveFeedItem key={idx} event={event} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Block */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-border-subtle"
      >
        {[
          { title: "Invisible Mesh", desc: "Agents interact via x402 private payments. The entire payment graph is shielded, making competitive strategy analysis impossible." },
          { title: "Self-Sovereign Credits", desc: "Agents mint their own income credentials to prove revenue to liquidity providers or upstream services trustlessly." },
          { title: "Headless Logic", desc: "No browser required. The AgentSigner handles deterministic master seed derivation directly from the agent's keypair." }
        ].map((item, i) => (
          <motion.div 
            key={i}
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0 }
            }}
            className="flex flex-col gap-4"
          >
            <h3 className="text-h3 font-display">{item.title}</h3>
            <p className="text-body-sm text-text-secondary leading-relaxed">
              {item.desc}
            </p>
          </motion.div>
        ))}
      </motion.section>
    </motion.div>
  );
}
