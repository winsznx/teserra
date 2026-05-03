"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ShieldCheck, KeyRound, Award } from "lucide-react";

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const cards = [
    {
      id: "01",
      title: "SHIELD",
      description: "Employers pay salaries through Umbra's confidential transfers. Amounts and recipients are encrypted on-chain.",
      icon: ShieldCheck,
      borderColor: "border-t-cipher/40",
      accentColor: "bg-cipher",
      iconColor: "text-cipher",
    },
    {
      id: "02",
      title: "PROVE",
      description: "Employees scan their own income with a viewing key. A Groth16 ZK proof attests their income exceeds a threshold.",
      icon: KeyRound,
      borderColor: "border-t-cipher/60",
      accentColor: "bg-cipher",
      iconColor: "text-cipher",
    },
    {
      id: "03",
      title: "MINT",
      description: "The proof verifies on-chain in milliseconds. A compressed NFT credential is minted to your identity.",
      icon: Award,
      borderColor: "border-t-seal/40",
      accentColor: "bg-seal",
      iconColor: "text-seal",
    },
  ];

  return (
    <section ref={ref} className="w-full container mx-auto px-4 md:px-8 lg:px-12 max-w-screen-xl py-8">
      <div className="flex items-center justify-center gap-3 mb-12">
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
          The Protocol Flow
        </motion.span>
        <motion.div 
          className="w-6 h-px bg-cipher/50"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.4 }}
          style={{ originX: 0 }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            className="group relative flex flex-col gap-6 p-10 bg-bg-surface/50 border border-border-subtle rounded-sm transition-all duration-160 hover:border-t-cipher hover:shadow-xl hover:shadow-cipher/10 overflow-hidden"
            initial="initial"
            animate={isInView ? "animate" : "initial"}
            variants={{
              initial: { opacity: 0, y: 16 },
              animate: { 
                opacity: 1, 
                y: 0,
                transition: { duration: 0.4, ease: [0, 0, 0.2, 1], delay: index * 0.12 }
              }
            }}
          >
            {/* Top accent border animation */}
            <motion.div 
              className={`absolute top-0 left-0 right-0 h-[2px] ${card.accentColor}`}
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ delay: index * 0.12 + 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] }}
              style={{ transformOrigin: "left" }}
            />

            <span className="absolute top-4 left-6 text-[4rem] font-mono font-bold text-cipher/5 pointer-events-none select-none">{card.id}</span>
            <div className="flex flex-col gap-4 relative z-10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary">{card.title}</h3>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                {card.description}
              </p>
            </div>
            <card.icon className={`absolute bottom-6 right-6 w-8 h-8 ${card.iconColor} opacity-70`} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
