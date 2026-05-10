"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Award } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { CredentialListEntry } from "./types";

interface EmployeeCredentialsListProps {
  credentials: CredentialListEntry[];
}

function formatThreshold(amount: bigint): string {
  return amount.toLocaleString();
}

function formatDate(unix: bigint): string {
  return new Date(Number(unix) * 1000).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export function EmployeeCredentialsList({ credentials }: EmployeeCredentialsListProps) {
  if (credentials.length === 0) return null;

  return (
    <section className="flex flex-col gap-6">
      <div className="text-overline text-text-muted">Your Credentials</div>
      <div className="flex flex-col gap-4">
        {credentials.map((entry) => {
          const { account } = entry;
          return (
            <motion.div
              key={entry.pda.toBase58()}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
            >
              <Link
                href={`/credential/${entry.pda.toBase58()}`}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-cipher rounded-md"
              >
                <Card className="bg-bg-elevated/30 border-seal/30 p-4 relative group cursor-pointer hover:bg-bg-elevated/50 transition-colors overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-seal font-bold">
                        {account.incomeAboveThreshold ? "Verified" : "Inactive"}
                      </span>
                      <span className="text-sm font-display">
                        {formatThreshold(account.threshold)} USDC +
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Expires {formatDate(account.expiresAt)}
                      </span>
                    </div>
                    <Award className="w-5 h-5 text-seal" aria-hidden="true" />
                  </div>
                  <motion.div
                    className="absolute inset-0 bg-seal/5 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                  />
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
