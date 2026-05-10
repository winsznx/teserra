"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { PublicKey } from "@solana/web3.js";

import { VerifyForm } from "@/components/verify/verify-form";
import { WhatJustHappened } from "@/components/verify/what-just-happened";
import type { VerifyOutcome } from "@/components/verify/verify-flow";

const DEFAULT_THRESHOLD = 1500;
const DEFAULT_APPLICANT = "HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV";

export default function VerifyPage() {
  const [snapshot, setSnapshot] = React.useState<{
    owner: PublicKey;
    outcome: VerifyOutcome;
  } | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 md:px-8 lg:px-12 py-8 lg:py-12 max-w-screen-xl flex flex-col gap-12 lg:gap-16 pb-24"
    >
      <header className="flex flex-col gap-4">
        <h1 className="text-display-2 font-display uppercase tracking-tight">Verifier Demo</h1>
        <p className="text-body-lg text-text-secondary max-w-2xl">
          This is what an integrating protocol sees. One CPI call. No income data exposed.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 flex flex-col gap-8">
          <VerifyForm
            defaultThreshold={DEFAULT_THRESHOLD}
            defaultAddress={DEFAULT_APPLICANT}
            onResult={(outcome, owner) => setSnapshot({ owner, outcome })}
          />
        </div>
        <div className="lg:col-span-5 flex flex-col gap-8">
          {snapshot ? (
            <WhatJustHappened owner={snapshot.owner} outcome={snapshot.outcome} />
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
