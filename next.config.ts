import type { NextConfig } from "next";

// `NEXT_PUBLIC_AGENT_API_BASE` set on Vercel routes the long-lived agent +
// x402 surface to the Railway service. Vercel's serverless functions can't
// hold the agent registry across requests and choke on long SSE streams, so
// /api/agent/* and /api/x402/* go through Vercel's edge rewrite to Railway,
// while the SSE EventSource on the client connects to Railway directly via
// the same env var.
const agentApiBase = process.env.NEXT_PUBLIC_AGENT_API_BASE?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Standalone output is required for the Railway Docker image; harmless on
  // Vercel (their builder ignores it for normal serverless deployments).
  output: "standalone",

  // Heavy server-side deps that are only used by /api/agent/* + /api/x402/*
  // (which on Vercel get rewritten away to Railway). Marking them external
  // keeps Vercel's serverless function bundle under the 300 MB limit by
  // loading them from node_modules at runtime. On Railway the runtime
  // resolves them normally so the agent runtime + program client + proof
  // generator all work.
  serverExternalPackages: [
    "@coral-xyz/anchor",
    "@umbra-privacy/sdk",
    "@umbra-privacy/web-zk-prover",
    "snarkjs",
    "@metaplex-foundation/mpl-bubblegum",
    "@metaplex-foundation/umi",
    "@metaplex-foundation/umi-bundle-defaults",
    "@metaplex-foundation/digital-asset-standard-api",
  ],

  async rewrites() {
    if (!agentApiBase) return [];
    return [
      {
        source: "/api/agent/:path*",
        destination: `${agentApiBase}/api/agent/:path*`,
      },
      {
        source: "/api/x402/:path*",
        destination: `${agentApiBase}/api/x402/:path*`,
      },
    ];
  },
};

export default nextConfig;
