import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Keypair } from "@solana/web3.js";
import { NextResponse } from "next/server";

import { spawnAgent } from "@/lib/agent-runtime";

interface SpawnBody {
  useDay0Keypair?: boolean;
}

const DEFAULT_DAY0_PATH = "scripts/day0/.keypair.json";

function loadDay0Keypair(): Keypair {
  // Railway holds the keypair as a base64 env var so the secret never lands
  // in the Docker image. Local dev (and the unit-test path) still reads
  // scripts/day0/.keypair.json from disk.
  const base64 = process.env.AGENT_DAY0_KEYPAIR_BASE64;
  if (base64 && base64.length > 0) {
    const buf = Buffer.from(base64, "base64");
    if (buf.length !== 64) {
      throw new Error(
        `AGENT_DAY0_KEYPAIR_BASE64 must decode to 64 bytes, got ${buf.length}`,
      );
    }
    return Keypair.fromSecretKey(Uint8Array.from(buf));
  }

  const envPath = process.env.AGENT_DAY0_KEYPAIR_PATH ?? DEFAULT_DAY0_PATH;
  const abs = resolve(process.cwd(), envPath);
  if (!existsSync(abs)) {
    throw new Error(
      `Day 0 keypair not found. Set AGENT_DAY0_KEYPAIR_BASE64 (base64 of the 64-byte secret) or AGENT_DAY0_KEYPAIR_PATH, or generate scripts/day0/.keypair.json.`,
    );
  }
  const raw = JSON.parse(readFileSync(abs, "utf8"));
  if (!Array.isArray(raw) || raw.length !== 64) {
    throw new Error("Day 0 keypair must be a 64-byte JSON array");
  }
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

export async function POST(req: Request) {
  let body: SpawnBody = {};
  try {
    const text = await req.text();
    if (text.length > 0) body = JSON.parse(text) as SpawnBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  let keypair: Keypair;
  let isFresh: boolean;
  if (body.useDay0Keypair) {
    try {
      keypair = loadDay0Keypair();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 500 });
    }
    isFresh = false;
  } else {
    keypair = Keypair.generate();
    isFresh = true;
  }

  let agent;
  try {
    agent = await spawnAgent(keypair);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `spawn failed: ${message}` }, { status: 500 });
  }

  let isRegistered = agent.getState().isRegistered;
  if (!isRegistered && isFresh) {
    // Fresh agents register automatically — they're useless until they have
    // an Umbra identity on chain. The Day 0 keypair is already registered
    // so we never re-register it.
    try {
      const sdk: unknown = await import("@umbra-privacy/sdk");
      const sdkApi = sdk as {
        getUserRegistrationFunction: (
          args: { client: unknown },
          deps?: Record<string, unknown>,
        ) => (opts?: Record<string, unknown>) => Promise<unknown>;
      };
      const registerFn = sdkApi.getUserRegistrationFunction({ client: agent.client });
      await registerFn({ confidential: true, anonymous: true });
      agent.markRegistered();
      isRegistered = true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          agentPubkey: agent.pubkey.toBase58(),
          umbraAddress: agent.umbraAddress,
          isFresh,
          isRegistered: false,
          warning: `register failed: ${message}`,
        },
        { status: 200 },
      );
    }
  }

  return NextResponse.json({
    agentPubkey: agent.pubkey.toBase58(),
    umbraAddress: agent.umbraAddress,
    isFresh,
    isRegistered,
  });
}

export const dynamic = "force-dynamic";
