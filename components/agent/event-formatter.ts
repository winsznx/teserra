// Pure mapping AgentEvent → terminal-feed display row.
//
// Lives outside `lib/agent-runtime.ts` (which is `import "server-only"`)
// so the client-side feed can render without dragging the runtime onto the
// browser bundle. The shape of `AgentEvent` is duplicated as a structural
// type — we don't import the union from the server-only module.

export type FeedStatus = "success" | "in-progress" | "error";

export interface FeedRow {
  ts: number;
  type: string;
  status: FeedStatus;
  description: string;
  payload: Record<string, string>;
}

/** Wire-event shape — matches `eventToWire` output from agent-runtime: each
 *  bigint field is serialized as a decimal string, everything else is a
 *  primitive or string. */
export interface WireAgentEvent {
  type: string;
  ts: number;
  [key: string]: unknown;
}

const USDC_DECIMALS = 6;

function shortAddr(addr: string | undefined): string {
  if (!addr || addr.length < 12) return addr ?? "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortSig(sig: string | undefined): string {
  if (!sig || sig.length < 12) return sig ?? "";
  return `${sig.slice(0, 8)}...${sig.slice(-4)}`;
}

function formatAmount(atomic: string | bigint | undefined): string {
  if (atomic == null) return "0";
  const big = typeof atomic === "bigint" ? atomic : BigInt(atomic);
  const divisor = BigInt(10) ** BigInt(USDC_DECIMALS);
  const whole = big / divisor;
  const frac = big % divisor;
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (frac === BigInt(0)) return wholeStr;
  const fracStr = frac.toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return fracStr.length > 0 ? `${wholeStr}.${fracStr}` : wholeStr;
}

function shortUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url.length > 32 ? `${url.slice(0, 32)}...` : url;
  }
}

export function formatTime(unixMs: number): string {
  const d = new Date(unixMs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function formatAgentEvent(event: WireAgentEvent): FeedRow {
  const ts = event.ts;
  switch (event.type) {
    case "agent.spawned": {
      const umbra = String(event.umbraAddress ?? "");
      return {
        ts,
        type: "agent.spawned",
        status: "success",
        description: `Agent spawned · ${shortAddr(umbra)}`,
        payload: { umbra: shortAddr(umbra) },
      };
    }
    case "payment.received": {
      const amount = formatAmount(event.amount as string | bigint);
      const txSig = String(event.txSig ?? "");
      const isError = txSig.startsWith("error:");
      return {
        ts,
        type: "payment.received",
        status: isError ? "error" : "success",
        description: isError
          ? `Payment failed · ${txSig.split(":").slice(1).join(":").slice(0, 60)}`
          : `Received ${amount} dUSDC private payment`,
        payload: isError
          ? { reason: txSig }
          : { amount: `${amount} dUSDC`, tx: shortSig(txSig) },
      };
    }
    case "proof.generating": {
      const threshold = formatAmount(event.threshold as string | bigint);
      return {
        ts,
        type: "proof.generating",
        status: "in-progress",
        description: "Generating ZK proof for income range...",
        payload: { threshold: `${threshold} dUSDC` },
      };
    }
    case "proof.complete": {
      const verifies = Boolean(event.verifies);
      const durationMs = Number(event.durationMs ?? 0);
      return {
        ts,
        type: "proof.complete",
        status: verifies ? "success" : "error",
        description: verifies
          ? `Proof verified ✓ (${durationMs.toLocaleString()}ms)`
          : "Proof failed (G125 — Umbra scanner pending)",
        payload: verifies
          ? { duration: `${durationMs}ms` }
          : { reason: "scanner-blocked" },
      };
    }
    case "credential.minted": {
      const credentialPda = String(event.credentialPda ?? "");
      const txSig = String(event.txSig ?? "");
      return {
        ts,
        type: "credential.minted",
        status: "success",
        description: `Credential minted at ${shortAddr(credentialPda)}`,
        payload: {
          credential: shortAddr(credentialPda),
          tx: shortSig(txSig),
        },
      };
    }
    case "x402.outbound": {
      const serviceUrl = String(event.serviceUrl ?? "");
      const amount = formatAmount(event.amount as string | bigint);
      const txSig = String(event.txSig ?? "");
      const submitted = txSig.length > 0 && !txSig.startsWith("pending:");
      return {
        ts,
        type: "x402.outbound",
        status: submitted ? "success" : "in-progress",
        description: submitted
          ? `Paid ${shortUrl(serviceUrl)} (${amount} dUSDC)`
          : `Calling ${shortUrl(serviceUrl)} (${amount} dUSDC)...`,
        payload: submitted
          ? { service: shortUrl(serviceUrl), amount: `${amount} dUSDC`, tx: shortSig(txSig) }
          : { service: shortUrl(serviceUrl), amount: `${amount} dUSDC` },
      };
    }
    case "x402.inbound": {
      const from = String(event.from ?? "");
      const amount = formatAmount(event.amount as string | bigint);
      const verified = Boolean(event.verified);
      return {
        ts,
        type: "x402.inbound",
        status: verified ? "success" : "error",
        description: verified
          ? `Inbound x402 payment verified · ${from}`
          : `Inbound x402 payment failed verification`,
        payload: { amount: `${amount} dUSDC`, from },
      };
    }
    case "x402.confirmed": {
      const serviceUrl = String(event.serviceUrl ?? "");
      const durationMs = Number(event.durationMs ?? 0);
      return {
        ts,
        type: "x402.confirmed",
        status: "success",
        description: `Service responded ✓ (${durationMs.toLocaleString()}ms)`,
        payload: { service: shortUrl(serviceUrl), duration: `${durationMs}ms` },
      };
    }
    default:
      return {
        ts,
        type: String(event.type),
        status: "in-progress",
        description: String(event.type),
        payload: {},
      };
  }
}
