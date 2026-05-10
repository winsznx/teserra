import { Connection } from "@solana/web3.js";

import {
  NEXT_PUBLIC_SOLANA_RPC,
  SERVICE_AGENT_PUBKEY,
  SERVICE_UMBRA_ADDRESS,
  USDC_MINT,
} from "@/lib/constants";
import {
  build402Challenge,
  isValidNonce,
  verifyX402Payment,
  type X402PaymentProof,
} from "@/lib/x402-adapter";
import { getAgent } from "@/lib/agent-runtime";

import {
  consumeNonce,
  getStoredChallenge,
  storeChallenge,
} from "../_lib/challenge-store";

const SERVICE_PRICE_ATOMIC = BigInt(10_000); // 0.01 dUSDC (6 decimals)
const SERVICE_DESCRIPTION = "TESSERA inference demo";

function decodePaymentHeader(value: string): X402PaymentProof | null {
  try {
    // Header is opaque b64-JSON per the x402 convention. Some clients pass raw
    // JSON for debugging; accept both.
    const decoded = value.startsWith("{")
      ? value
      : Buffer.from(value, "base64").toString("utf8");
    const obj = JSON.parse(decoded) as Partial<X402PaymentProof>;
    if (
      typeof obj?.txSignature !== "string" ||
      typeof obj?.nonce !== "string" ||
      obj.scheme !== "umbra-private"
    ) {
      return null;
    }
    return obj as X402PaymentProof;
  } catch {
    return null;
  }
}

export async function POST(req: Request): Promise<Response> {
  const paymentHeader = req.headers.get("x-payment");

  // ── First call: issue 402 challenge ─────────────────────────────────
  if (!paymentHeader) {
    const { challenge, requirement } = build402Challenge({
      recipientUmbraAddress: SERVICE_UMBRA_ADDRESS,
      amount: SERVICE_PRICE_ATOMIC,
      token: USDC_MINT,
      description: SERVICE_DESCRIPTION,
      ttlSeconds: 300,
      network: "solana-devnet",
    });
    storeChallenge(challenge, requirement);
    return new Response(JSON.stringify(challenge), {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'x402 scheme="umbra-private"',
      },
    });
  }

  // ── Second call: verify payment, deliver service ────────────────────
  const proof = decodePaymentHeader(paymentHeader);
  if (!proof || !isValidNonce(proof.nonce)) {
    return new Response(
      JSON.stringify({ error: "payment-invalid", reason: "malformed-proof" }),
      { status: 402 },
    );
  }

  const requirement = getStoredChallenge(proof.nonce);
  if (!requirement) {
    return new Response(
      JSON.stringify({ error: "payment-invalid", reason: "expired" }),
      { status: 402 },
    );
  }

  const connection = new Connection(NEXT_PUBLIC_SOLANA_RPC, "confirmed");
  const result = await verifyX402Payment(connection, proof, requirement);

  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: "payment-invalid", reason: result.reason ?? "unknown" }),
      { status: 402 },
    );
  }

  // Single-use the nonce so the same proof can't unlock the service twice.
  consumeNonce(proof.nonce);

  // If the recipient is a registered agent in this process, fan out the
  // x402.inbound event so its SSE feed lights up. The "from" field stays
  // anonymous because Umbra hides the depositor — that's the whole point.
  const recipientAgent = getAgent(SERVICE_AGENT_PUBKEY);
  if (recipientAgent) {
    recipientAgent.emit({
      type: "x402.inbound",
      ts: Date.now(),
      from: "<umbra-hidden-sender>",
      amount: requirement.amount,
      verified: true,
    });
  }

  return new Response(
    JSON.stringify({
      result: "Cryptographic creditworthiness, served fresh.",
      servedAt: Date.now(),
      computationAccount: result.computationAccount,
      callbackTxSignatures: result.callbackTxSignatures,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export const dynamic = "force-dynamic";
