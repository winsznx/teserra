"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { fadeIn, fadeUp } from "@/lib/motion";

export function HeroSection() {
  return (
    <section className="relative w-full flex flex-col items-center text-center gap-8 pt-16 pb-12 lg:pt-20 lg:pb-16 overflow-hidden">
      {/* Background Ornament (Hero-only) */}
      <motion.div 
        className="absolute inset-0 pointer-events-none opacity-[0.15] aria-hidden:true"
        {...fadeIn(0)}
        transition={{ duration: 0.6 }}
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mosaic-hero" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M40 0L80 40L40 80L0 40Z" fill="rgba(245,239,224,0.06)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mosaic-hero)" />
        </svg>
      </motion.div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 mx-auto container md:px-8 lg:px-12 max-w-screen-xl">
        <motion.div 
          className="w-16 h-px bg-seal mx-auto mb-2 opacity-60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ originX: 0.5 }}
        />
        
        <h1 className="font-display uppercase tracking-[0.04em] drop-shadow-[0_2px_40px_rgba(162,59,44,0.15)]">
          <motion.span 
            className="text-display-1 block mb-2"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0, 0, 0.2, 1] }}
          >
            <span className="tracking-[0.4em]">PROVE</span> YOUR INCOME
          </motion.span>
          <motion.span 
            className="text-[3.5rem] md:text-[4.5rem] text-text-secondary leading-none block"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease: [0, 0, 0.2, 1] }}
          >
            REVEAL NOTHING
          </motion.span>
        </h1>
        
        <motion.div 
          className="w-16 h-px bg-seal mx-auto mt-2 opacity-60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.45, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ originX: 0.5 }}
        />
        
        <motion.p 
          className="text-body-lg text-text-secondary max-w-xl mx-auto"
          {...fadeIn(0.55)}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          Cryptographic creditworthiness on Solana. Prove your financial worth
          without revealing your financial life. Built on Umbra.
        </motion.p>
        
        <div className="relative flex flex-wrap justify-center gap-6 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4, ease: [0, 0, 0.2, 1] }}
          >
            <Link
              href="/employer"
              className="h-12 px-10 flex items-center justify-center bg-text-primary text-bg-base font-bold rounded-md hover:bg-text-secondary transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/20"
            >
              I&apos;m an Employer
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.4, ease: [0, 0, 0.2, 1] }}
          >
            <Link
              href="/employee"
              className="h-12 px-10 flex items-center justify-center border border-border-strong text-text-primary font-bold rounded-md hover:bg-bg-elevated transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              I&apos;m an Employee
            </Link>
          </motion.div>
          
          <motion.div 
            className="absolute inset-x-1/4 -bottom-6 h-px bg-gradient-to-r from-transparent via-cipher/30 to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
          />
        </div>
      </div>
    </section>
  );
}
