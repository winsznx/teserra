// Integration test for the agent's pay-x402 round-trip. Hits real devnet:
//   1. Spawns an agent against the Day 0 keypair (must already be registered).
//   2. Boots the demo /api/x402/charge endpoint via Next's request handler.
//   3. Issues a pay-x402 command — the agent fetches the 402 challenge,
//      submits a real Umbra deposit, and replays with proof header.
//
// Gated behind RUN_INTEGRATION=1 because:
//   - It costs devnet SOL + dUSDC each run.
//   - It needs a funded keypair already on chain.
// The unit-test sweep (`pnpm test`) skips this file by default.

import { afterAll, describe, expect, it } from "vitest";

const ENABLED = process.env.RUN_INTEGRATION === "1";

const itIntegration = ENABLED ? it : it.skip;

describe.runIf(ENABLED)("agent pay-x402 (live devnet)", () => {
  itIntegration("emits x402.outbound → x402.inbound → x402.confirmed end-to-end", async () => {
    // Lazily import so this file's mere presence doesn't load lib/agent-runtime
    // (which pulls server-only) into the default unit-test run.
    const { Keypair } = await import("@solana/web3.js");
    const { spawnAgent, __resetRegistryForTests } = await import("../../lib/agent-runtime");
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const kpPath = join(__dirname, "..", "..", "scripts", "day0", ".keypair.json");
    const secret = Uint8Array.from(JSON.parse(readFileSync(kpPath, "utf8")));
    const kp = Keypair.fromSecretKey(secret);

    __resetRegistryForTests();
    const agent = await spawnAgent(kp);

    const events: string[] = [];
    agent.subscribe((e) => events.push(e.type));

    await agent.command({
      type: "pay-x402",
      serviceUrl: "http://localhost:3000/api/x402/charge",
      amount: BigInt(10_000),
      nonce: "integration-test",
    });

    expect(events).toContain("x402.outbound");
    expect(events).toContain("x402.confirmed");

    afterAll(() => __resetRegistryForTests());
  }, 120_000);
});
