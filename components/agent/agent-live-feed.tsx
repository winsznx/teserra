"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Activity, Terminal, AlertTriangle, ArrowDownToLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiveFeedItem, type LiveFeedEvent } from "@/components/live-feed-item";
import {
  formatAgentEvent,
  formatTime,
  type WireAgentEvent,
} from "./event-formatter";

interface AgentLiveFeedProps {
  agentPubkey: string;
}

type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

const SCROLL_FOLLOW_THRESHOLD_PX = 32;

export function AgentLiveFeed({ agentPubkey }: AgentLiveFeedProps) {
  const [events, setEvents] = React.useState<WireAgentEvent[]>([]);
  const [status, setStatus] = React.useState<ConnectionStatus>("connecting");
  const [followBottom, setFollowBottom] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!agentPubkey) return;
    setEvents([]);
    setStatus("connecting");

    // Vercel's edge can't proxy long-lived SSE reliably (Next.js rewrites are
    // backed by serverless functions that time out at ~60 s). Hit Railway
    // directly when NEXT_PUBLIC_AGENT_API_BASE is set; otherwise stay
    // same-origin for local dev.
    const base = (process.env.NEXT_PUBLIC_AGENT_API_BASE ?? "").replace(/\/$/, "");
    const url = `${base}/api/agent/feed/${agentPubkey}`;
    const source = new EventSource(url);

    const handleEvent = (data: string) => {
      try {
        const parsed = JSON.parse(data) as WireAgentEvent;
        setEvents((prev) => [...prev.slice(-255), parsed]);
      } catch {
        // ignore malformed payloads — the runtime always sends JSON
      }
    };

    // Each event is sent with `event: <type>` so individual listeners would
    // also work; but `message` (the default) catches every event in one
    // place when the server omits the event field. We attach typed
    // listeners for every known AgentEvent variant for forward-compat.
    const KNOWN: string[] = [
      "agent.spawned",
      "payment.received",
      "proof.generating",
      "proof.complete",
      "credential.minted",
      "x402.outbound",
      "x402.inbound",
      "x402.confirmed",
    ];
    const listener = (e: MessageEvent) => handleEvent(e.data);
    for (const t of KNOWN) source.addEventListener(t, listener);
    source.addEventListener("message", listener);

    source.onopen = () => setStatus("open");
    source.onerror = () => {
      // EventSource auto-reconnects with the `retry: 5000` hint the route
      // sends. We surface "reconnecting" so the user knows the stream
      // isn't silent.
      setStatus("reconnecting");
    };

    return () => {
      source.close();
      setStatus("closed");
    };
  }, [agentPubkey]);

  // Auto-scroll-to-bottom on new event, but pause if the user has scrolled up
  // beyond the threshold (terminal-style UX expectation).
  React.useEffect(() => {
    if (!followBottom) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [events, followBottom]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setFollowBottom(distance < SCROLL_FOLLOW_THRESHOLD_PX);
  };

  const items = React.useMemo<{ key: string; row: LiveFeedEvent }[]>(() => {
    return events.map((event, idx) => {
      const formatted = formatAgentEvent(event);
      const row: LiveFeedEvent = {
        timestamp: formatTime(formatted.ts),
        name: formatted.type,
        payload: formatted.payload,
        status: formatted.status,
      };
      return { key: `${formatted.ts}-${idx}-${formatted.type}`, row };
    });
  }, [events]);

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-text-muted" aria-hidden="true" />
          <span className="text-overline text-text-muted">Live Feed</span>
        </div>
        <div className="flex items-center gap-2">
          {status === "reconnecting" ? (
            <div className="flex items-center gap-1.5 text-warning text-[10px] uppercase tracking-wider font-bold">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              reconnecting
            </div>
          ) : status === "open" ? (
            <Activity className="w-4 h-4 text-cipher animate-pulse" aria-hidden="true" />
          ) : null}
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 bg-bg-base/60 backdrop-blur-sm border border-border-strong rounded-lg p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border-emphasis"
        role="log"
        aria-live="polite"
        aria-label="Agent live event feed"
      >
        {items.length === 0 ? (
          <div className="text-text-muted font-mono text-xs italic p-4 text-center">
            Waiting for events...
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {items.map(({ key, row }) => (
              <LiveFeedItem key={key} event={row} />
            ))}
          </div>
        )}
      </div>

      {!followBottom ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex justify-center"
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFollowBottom(true);
            }}
            className="gap-2"
          >
            <ArrowDownToLine className="w-3 h-3" aria-hidden="true" />
            Resume auto-scroll
          </Button>
        </motion.div>
      ) : null}
    </div>
  );
}
