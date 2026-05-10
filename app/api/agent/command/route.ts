import { NextResponse } from "next/server";

import { getAgent, validateCommand } from "@/lib/agent-runtime";

interface CommandBody {
  agentPubkey: string;
  command: unknown;
}

export async function POST(req: Request) {
  let body: CommandBody;
  try {
    body = (await req.json()) as CommandBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof body?.agentPubkey !== "string") {
    return NextResponse.json({ error: "agentPubkey required" }, { status: 400 });
  }
  const agent = getAgent(body.agentPubkey);
  if (!agent) {
    return NextResponse.json({ error: "agent not found" }, { status: 404 });
  }
  const parsed = validateCommand(body.command);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Fire-and-forget: a malformed on-chain operation must not bring down the
  // request handler. The agent emits an error event on its feed if the
  // command fails downstream.
  void agent.command(parsed).catch(() => undefined);

  return NextResponse.json({ queued: true, type: parsed.type });
}

export const dynamic = "force-dynamic";
