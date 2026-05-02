"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProgressWithStatusProps {
  progress: number;
  status: string;
  subStatus?: string;
  className?: string;
}

import { motion, AnimatePresence } from "framer-motion";

export function ProgressWithStatus({
  progress,
  status,
  subStatus,
  className,
}: ProgressWithStatusProps) {
  return (
    <div className={cn("w-full flex flex-col gap-3", className)}>
      <Progress value={progress} className="h-1.5" />
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-end">
          <AnimatePresence mode="wait">
            <motion.span
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
              className="text-sm font-medium text-text-primary"
            >
              {status}
            </motion.span>
          </AnimatePresence>
          <span className="text-xs font-mono text-cipher">{Math.round(progress)}%</span>
        </div>
        <AnimatePresence mode="wait">
          {subStatus && (
            <motion.span
              key={subStatus}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1], delay: 0.1 }}
              className="text-xs text-text-secondary"
            >
              {subStatus}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
