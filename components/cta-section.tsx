"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const paths = [
    {
      href: "/employer",
      title: "Shield Salaries",
      description: "Onboard your team to private payroll and secure their financial privacy.",
      label: "Employer Path",
      color: "border-border-strong",
      hoverColor: "hover:border-border-emphasis hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
      textColor: "text-cipher",
      accentColor: "text-cipher"
    },
    {
      href: "/employee",
      title: "Generate Proof",
      description: "Scan your income and mint a ZK credential without exposing your history.",
      label: "Employee Path",
      color: "border-cipher/30",
      hoverColor: "hover:border-cipher hover:shadow-[0_8px_32px_rgba(78,205,196,0.1)]",
      textColor: "text-cipher",
      accentColor: "text-cipher",
      bg: "bg-cipher-muted/10"
    },
    {
      href: "/agent",
      title: "Build Integration",
      description: "Integrate autonomous agents into the private x402 payment mesh.",
      label: "Developer Path",
      color: "border-border-strong",
      hoverColor: "hover:border-border-emphasis hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
      textColor: "group-hover:text-cipher",
      accentColor: "text-cipher"
    },
    {
      href: "/verify",
      title: "Verify Credential",
      description: "Validate income proofs for loans, rentals, or DAO gating trustlessly.",
      label: "Verifier Path",
      color: "border-seal/30",
      hoverColor: "hover:border-seal hover:shadow-[0_8px_32px_rgba(162,59,44,0.15)]",
      textColor: "text-seal",
      accentColor: "text-seal"
    }
  ];

  return (
    <section ref={ref} className="w-full bg-bg-elevated py-16">
      <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-screen-xl flex flex-col items-center">
        <div className="flex items-center justify-center gap-3 mb-4">
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
            Get Started
          </motion.span>
          <motion.div 
            className="w-6 h-px bg-cipher/50"
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.4 }}
            style={{ originX: 0 }}
          />
        </div>
        <motion.h2 
          className="font-display text-[2.5rem] text-center mb-2 uppercase tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Access the Protocol
        </motion.h2>
        <motion.div 
          className="w-24 h-0.5 bg-seal/60 mx-auto mb-4"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
        <motion.p 
          className="text-text-secondary text-center mb-12 max-w-md"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          Pick your path into the private financial economy on Solana.
        </motion.p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-5xl">
          {paths.map((path, index) => (
            <motion.div
              key={path.href}
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <Link
                href={path.href}
                className={`group p-8 h-full flex flex-col gap-4 border ${path.color} rounded-xl bg-bg-surface ${path.hoverColor} transition-all ${path.bg || ""}`}
              >
                <h3 className={`text-h3 font-display uppercase tracking-wider ${path.textColor} transition-colors`}>{path.title}</h3>
                <p className="text-sm text-text-secondary">{path.description}</p>
                <div className={`mt-auto pt-4 flex items-center gap-2 ${path.accentColor} text-xs font-bold uppercase tracking-widest`}>
                  {path.label} <ExternalLink className="w-3 h-3" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
