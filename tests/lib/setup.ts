// vitest global setup. Pin NEXT_PUBLIC_PROGRAM_ID and NEXT_PUBLIC_SOLANA_RPC
// here so lib/constants.ts's lazy getters resolve in test env.

import { vi } from "vitest";

process.env.NEXT_PUBLIC_PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "9jCxFKjcwt7uYZtPwfEh2gPt7BdKxW6qEwuwbFStWCKd";
process.env.NEXT_PUBLIC_SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

// `server-only` throws at module load to prevent client bundles from
// importing server-marked code. Under vitest's node environment it's
// always safe to load — replace with a no-op so test files can transitively
// import server-only modules (e.g. lib/agent-runtime.ts).
vi.mock("server-only", () => ({}));
