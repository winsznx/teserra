import type { NextRequest } from "next/server";

import { eventToWire, getAgent } from "@/lib/agent-runtime";

// EventSource is hit cross-origin from the Vercel-served frontend (the SSE
// stream lives on Railway because Vercel's serverless edge times out long
// connections). Allow the Vercel origin via env var; default `*` for dev.
function corsHeaders(req: NextRequest): Record<string, string> {
  const allowed = process.env.ALLOWED_ORIGIN ?? "*";
  const origin = req.headers.get("origin");
  const value =
    allowed === "*" || !origin
      ? allowed
      : allowed.split(",").map((s) => s.trim()).includes(origin)
        ? origin
        : "";
  return value
    ? {
        "Access-Control-Allow-Origin": value,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
        Vary: "Origin",
      }
    : {};
}

export async function OPTIONS(req: NextRequest): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> },
): Promise<Response> {
  const cors = corsHeaders(req);
  const { pubkey } = await params;
  const agent = getAgent(pubkey);
  if (!agent) {
    return new Response("Agent not found", { status: 404, headers: cors });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream already closed (client disconnected mid-write).
          closed = true;
        }
      };

      // Initial retry hint + comment so SSE clients don't reconnect aggressively.
      send(":connected\n\nretry: 5000\n\n");

      // Replay the ring buffer for catch-up on reconnect.
      for (const event of agent.getRecentEvents()) {
        send(`event: ${event.type}\ndata: ${JSON.stringify(eventToWire(event))}\n\n`);
      }

      const unsubscribe = agent.subscribe((event) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(eventToWire(event))}\n\n`);
      });

      // Keep-alive heartbeat every 15s so intermediate proxies don't close
      // an idle stream. SSE comment lines are ignored by the EventSource.
      const heartbeat = setInterval(() => send(": heartbeat\n\n"), 15_000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...cors,
    },
  });
}

export const dynamic = "force-dynamic";
