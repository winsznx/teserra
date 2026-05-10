"use client";

import { motion } from "framer-motion";
import type { PublicKey } from "@solana/web3.js";

import { Card } from "@/components/ui/card";
import type { VerifyOutcome } from "./verify-flow";
import { outcomeJson, shortAddrBase58 } from "./what-just-happened-format";

interface WhatJustHappenedProps {
  owner: PublicKey;
  outcome: VerifyOutcome;
}

export function WhatJustHappened({ owner, outcome }: WhatJustHappenedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card className="bg-bg-elevated/30 border-border-strong overflow-hidden">
        <div className="p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-h3 font-display">What just happened</h3>
            <p className="text-body-sm text-text-secondary">
              We made one CPI call to TESSERA&apos;s program:
            </p>
          </div>

          <pre
            className="bg-bg-base border border-border-subtle rounded-lg p-5 font-mono text-[11px] leading-relaxed text-cipher overflow-x-auto"
            aria-label="verify_credential CPI call"
          >
{`verify_credential(
  employee_pubkey: "${shortAddrBase58(owner.toBase58())}",
  required_threshold: ${outcome.required.toString()}n
) → ${outcomeJson(outcome)}`}
          </pre>

          <ul className="flex flex-col gap-2 text-body-sm text-text-secondary">
            <li>We never saw the applicant&apos;s income.</li>
            <li>Their wallet history is private.</li>
            <li>We just got a cryptographic guarantee.</li>
          </ul>
        </div>
      </Card>
    </motion.div>
  );
}
