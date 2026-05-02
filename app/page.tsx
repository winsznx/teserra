"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ShieldCheck, KeyRound, Award } from "lucide-react";
import { HeroSection } from "@/components/hero-section";
import { HumansAndAgents } from "@/components/humans-and-agents";
import { EcosystemSection } from "@/components/ecosystem-section";
import { CTASection } from "@/components/cta-section";

export default function LandingPage() {
  const ecosystemItems = ["LENDING", "RENTALS", "DAOS", "VISA", "AGENTS", "PAYROLL", "CREDIT", "IDENTITY"];
  
  return (
    <div className="flex flex-col items-center gap-16 lg:gap-24 pb-24 relative overflow-hidden">
      <HeroSection />
      
      {/* Protocol Flow Section */}
      <section className="py-16 w-full">
        <div className="flex items-center justify-center gap-3 mb-16">
          <div className="w-6 h-px bg-cipher/50" />
          <span className="text-sm font-semibold tracking-[0.2em] uppercase text-text-secondary">The Protocol Flow</span>
          <div className="w-6 h-px bg-cipher/50" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4">
          {/* Vertical line for mobile */}
          <div className="absolute left-8 top-0 bottom-0 w-px border-l border-dashed border-border-emphasis lg:hidden" />

          {/* Step 1 - SHIELD */}
          <ProtocolStep 
            id="01"
            title="SHIELD"
            icon={ShieldCheck}
            body="Employers pay salaries through Umbra's confidential transfers. Amounts and recipients are encrypted on-chain."
            isLeft={true}
            accentColor="bg-cipher"
          />

          {/* Connector 1 -> 2 */}
          <div className="hidden lg:block h-40 relative -mt-36 mb-2">
            <motion.svg 
              className="absolute inset-0 w-full h-full" 
              viewBox="0 0 864 160" 
              fill="none"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <path
                d="M 384 48 H 632 Q 672 48, 672 96 V 160"
                stroke="var(--border-emphasis)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                fill="none"
                markerEnd="url(#arrow-right)"
              />
              <defs>
                <marker id="arrow-right" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                  <path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--border-emphasis)" />
                </marker>
              </defs>
            </motion.svg>
          </div>

          {/* Step 2 - PROVE */}
          <ProtocolStep 
            id="02"
            title="PROVE"
            icon={KeyRound}
            body="Employees scan their own income with a viewing key. A Groth16 ZK proof attests their income exceeds a threshold — without revealing it."
            isLeft={false}
            accentColor="bg-cipher"
          />

          {/* Connector 2 -> 3 */}
          <div className="hidden lg:block h-40 relative -mt-36 mb-2">
            <motion.svg 
              className="absolute inset-0 w-full h-full" 
              viewBox="0 0 864 160" 
              fill="none"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <path
                d="M 480 48 H 232 Q 192 48, 192 96 V 160"
                stroke="var(--border-emphasis)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                fill="none"
                markerEnd="url(#arrow-left)"
              />
              <defs>
                <marker id="arrow-left" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                  <path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--border-emphasis)" />
                </marker>
              </defs>
            </motion.svg>
          </div>

          {/* Step 3 - MINT */}
          <ProtocolStep 
            id="03"
            title="MINT"
            icon={Award}
            body="The proof verifies on-chain in milliseconds. A compressed NFT credential is minted to your identity. Composable. Reusable. Private."
            isLeft={true}
            accentColor="bg-seal"
          />
        </div>
      </section>

      <HumansAndAgents />
      <EcosystemSection items={ecosystemItems} />
      <CTASection />
    </div>
  );
}

function ProtocolStep({ id, title, icon: Icon, body, isLeft, accentColor }: any) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div className={`flex w-full ${isLeft ? 'justify-start' : 'lg:justify-end'} relative z-10`}>
      <motion.div
        ref={ref}
        className="relative max-w-sm w-full flex"
        initial={{ opacity: 0, x: isLeft ? -24 : 24 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Integrated Vertical Pill */}
        <div className={`w-12 shrink-0 ${accentColor} rounded-l-2xl flex items-center justify-center relative`}>
           <span className="rotate-[-90deg] text-[10px] font-mono font-bold tracking-[0.2em] text-bg-base whitespace-nowrap uppercase">
              PHASE {id}
            </span>
        </div>

        {/* Main Card */}
        <div className="bg-bg-surface/40 backdrop-blur-sm border border-border-subtle border-l-0 rounded-r-2xl p-8 shadow-sm flex-1 group hover:bg-bg-surface transition-colors duration-500">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-bg-base/80 flex items-center justify-center border border-border-subtle">
              <Icon size={20} className="text-cipher stroke-[2px]" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-text-primary">
              {title}
            </h3>
          </div>
          <p className="text-body-sm text-text-secondary leading-relaxed">
            {body}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
