"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface EcosystemSectionProps {
  items: string[];
}

export function EcosystemSection({ items }: EcosystemSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="w-full overflow-hidden pb-2 bg-bg-elevated/20">
      <div className="flex items-center justify-center gap-3 mb-24 translate-y-14">
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
          Ecosystem Integration
        </motion.span>
        <motion.div 
          className="w-6 h-px bg-cipher/50"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.4 }}
          style={{ originX: 0 }}
        />
      </div>
      
      <div className="relative flex overflow-x-hidden">
        <div className="flex animate-marquee whitespace-nowrap gap-24 items-center py-4">
          {[...items, ...items].map((item, idx) => (
            <div key={`${item}-${idx}`} className="flex flex-col items-center group cursor-default">
              <div className="text-[10px] font-mono text-cipher/50 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                0x{item.substring(0, 2)}
              </div>
              <div className="text-xl font-display font-bold tracking-[0.4em] text-text-primary">
                {item}
              </div>
              <div className="h-[1px] w-12 bg-cipher/40 mt-4 shadow-[0_0_8px_rgba(78,205,196,0.2)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
