"use client";

import * as React from "react";
import { Check, Loader2, XCircle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface LiveFeedEvent {
  timestamp: string;
  name: string;
  payload: Record<string, string | number>;
  status: "success" | "in-progress" | "error";
}

interface LiveFeedItemProps {
  event: LiveFeedEvent;
}

import { motion } from "framer-motion";

export function LiveFeedItem({ event }: LiveFeedItemProps) {
  const statusColors = {
    success: "text-success",
    "in-progress": "text-cipher",
    error: "text-error",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="font-mono text-[11px] md:text-xs flex items-start gap-3 py-1.5 border-b border-border-subtle/30"
    >
      <span className="text-text-muted shrink-0">[{event.timestamp}]</span>
      <span className={cn("font-bold shrink-0", statusColors[event.status])}>
        {event.name.padEnd(16)}
      </span>
      <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 text-text-secondary">
        {Object.entries(event.payload).map(([key, value]) => (
          <span key={key}>
            <span className="text-text-muted">{key}=</span>
            {value}
          </span>
        ))}
      </div>
      <div className="shrink-0 w-4 flex justify-center">
        {event.status === "success" && <Check className="w-3.5 h-3.5 text-success" />}
        {event.status === "in-progress" && <Loader2 className="w-3.5 h-3.5 text-cipher animate-spin" />}
        {event.status === "error" && <XCircle className="w-3.5 h-3.5 text-error" />}
      </div>
    </motion.div>
  );
}
