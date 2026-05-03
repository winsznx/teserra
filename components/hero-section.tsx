"use client";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { fadeIn } from "@/lib/motion";

export function HeroSection() {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    },
  };

  return (
    <motion.section 
      variants={container}
      initial="hidden"
      animate="show"
      className="relative w-full flex flex-col items-center text-center gap-8 pt-16 pb-12 lg:pt-20 lg:pb-16 overflow-hidden"
    >
      {/* Background Ornament (Hero-only) - Balanced visibility */}
      <motion.div 
        className="absolute inset-0 pointer-events-none opacity-[0.25] aria-hidden:true"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 0.25, transition: { duration: 1 } }
        }}
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mosaic-hero" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M40 0L80 40L40 80L0 40Z" fill="currentColor" className="text-text-primary/10" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mosaic-hero)" />
        </svg>
      </motion.div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 mx-auto container md:px-8 lg:px-12 max-w-screen-xl">
        <motion.div 
          className="w-16 h-px bg-seal mx-auto mb-2 opacity-60"
          variants={{
            hidden: { scaleX: 0, opacity: 0 },
            show: { scaleX: 1, opacity: 0.6, transition: { duration: 0.8 } }
          }}
          style={{ originX: 0.5 }}
        />
        
        <motion.h1 
          variants={item}
          className="font-display uppercase tracking-[0.04em] drop-shadow-[0_2px_40px_rgba(162,59,44,0.15)]"
        >
          <span className="text-display-1 block mb-2">
            <span className="tracking-[0.4em]">PROVE</span> YOUR INCOME
          </span>
          <span className="text-[3.5rem] md:text-[4.5rem] text-text-secondary leading-none block">
            REVEAL NOTHING
          </span>
        </motion.h1>
        
        <motion.div 
          className="w-16 h-px bg-seal mx-auto mt-2 opacity-60"
          variants={{
            hidden: { scaleX: 0, opacity: 0 },
            show: { scaleX: 1, opacity: 0.6, transition: { duration: 0.8 } }
          }}
          style={{ originX: 0.5 }}
        />
        
        <motion.p 
          variants={item}
          className="text-body-lg text-text-secondary max-w-xl mx-auto"
        >
          Cryptographic creditworthiness on Solana. Prove your financial worth
          without revealing your financial life. Built on Umbra.
        </motion.p>
        
        <motion.div 
          variants={item}
          className="relative flex flex-wrap justify-center gap-6 mt-6"
        >
          <Link
            href="/employer"
            className="h-12 px-10 flex items-center justify-center bg-text-primary text-bg-base font-bold rounded-md hover:bg-text-secondary transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-bg-base/10"
          >
            I&apos;m an Employer
          </Link>
          
          <Link
            href="/employee"
            className="h-12 px-10 flex items-center justify-center border border-border-strong text-text-primary font-bold rounded-md hover:bg-bg-elevated transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            I&apos;m an Employee
          </Link>
          
          <motion.div 
            className="absolute inset-x-1/4 -bottom-6 h-px bg-gradient-to-r from-transparent via-cipher/30 to-transparent"
            variants={{
              hidden: { scaleX: 0, opacity: 0 },
              show: { scaleX: 1, opacity: 1, transition: { delay: 0.5, duration: 1 } }
            }}
          />
        </motion.div>
      </div>
    </motion.section>
  );
}
