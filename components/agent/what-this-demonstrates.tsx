"use client";

import { motion } from "framer-motion";

const ITEMS = [
  {
    title: "Headless Umbra identity",
    body: "Headless Umbra identity (no browser needed)",
  },
  {
    title: "Same ZK proof pipeline",
    body: "Same ZK proof generation, in Node.js (<1s)",
  },
  {
    title: "Private x402 payment rail",
    body: "Private x402 payment rail (machine-to-machine, payment graph hidden)",
  },
];

export function WhatThisDemonstrates() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
      className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-border-subtle"
    >
      <div className="md:col-span-3 text-overline text-text-muted">What this demonstrates</div>
      {ITEMS.map((item) => (
        <motion.div
          key={item.title}
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0 },
          }}
          className="flex flex-col gap-3"
        >
          <h3 className="text-h3 font-display">{item.title}</h3>
          <p className="text-body-sm text-text-secondary leading-relaxed">{item.body}</p>
        </motion.div>
      ))}
    </motion.section>
  );
}
