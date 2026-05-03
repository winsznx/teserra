"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Bot } from "lucide-react";
import Image from "next/image";

export function HumansAndAgents() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="w-full flex flex-col gap-8 py-8">
      <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-screen-xl mt-7">
        <div className="flex items-center justify-center gap-3 mb-16">
          <motion.div 
            className="w-6 h-px bg-cipher/50"
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.4 }}
            style={{ originX: 1 }}
          />
          <motion.span 
            className="text-sm font-semibold tracking-[0.2em] uppercase text-text-secondary"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4 }}
          >
            For Humans and Agents
          </motion.span>
          <motion.div 
            className="w-6 h-px bg-cipher/50"
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.4 }}
            style={{ originX: 0 }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div 
            className="flex flex-col gap-6 p-10 rounded-lg bg-bg-surface border border-border-subtle border-l-4 border-l-border-emphasis relative overflow-hidden"
            initial={{ opacity: 0, x: -24 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-h2 font-display uppercase tracking-tight relative z-10">For Humans</h3>
            <p className="text-body text-text-secondary leading-relaxed relative z-10">
              A developer in Lagos, paid in USDC by a global DAO, can finally prove
              their income to a bank without exposing their wallet history.
              Portable, zero-knowledge financial reputation.
            </p>
            <div className="absolute -bottom-8 -right-8 w-64 h-64 opacity-[0.08] pointer-events-none dark:invert dark:mix-blend-screen mix-blend-multiply">
              <Image 
                src="/human-meditation-v2.png" 
                alt="Human Meditation" 
                fill 
                sizes="256px"
                className="object-contain"
              />
            </div>
          </motion.div>
          <motion.div 
            className="flex flex-col gap-6 p-10 rounded-lg bg-bg-surface border border-cipher/20 border-l-4 border-l-cipher/40 relative overflow-hidden"
            initial={{ opacity: 0, x: 24 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="text-h2 font-display uppercase tracking-tight relative z-10">For Agents</h3>
            <p className="text-body text-text-secondary leading-relaxed relative z-10">
              Autonomous agents can receive payments, mint credentials, and pay
              downstream services — all through a private x402 rail. The entire
              payment graph remains invisible on-chain.
            </p>
            <Bot className="absolute -bottom-2 -right-2 w-40 h-40 text-cipher opacity-[0.04] pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
