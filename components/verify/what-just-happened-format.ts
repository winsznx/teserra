import type { VerifyOutcome } from "./verify-flow";

export function shortAddrBase58(base58: string): string {
  return `${base58.slice(0, 6)}...${base58.slice(-4)}`;
}

/** Renders the right-hand-side of the CPI "→" arrow for the verify_credential
 *  call. The shape is illustrative — close enough to the real on-chain output
 *  that a developer reading the demo can understand what came back, but the
 *  bigint suffix `n` is purely visual (the on-chain return is borsh-encoded). */
export function outcomeJson(outcome: VerifyOutcome): string {
  if (outcome.kind === "rpc-error") return "{ rpc-error }";
  if (outcome.kind === "no-credential") return "null";
  const valid = outcome.kind === "approved";
  return [
    "{",
    `  valid: ${valid},`,
    `  threshold: ${(outcome.existing ?? BigInt(0)).toString()}n,`,
    `  expires_at: ${outcome.expiresAt ?? 0}`,
    "}",
  ].join("\n");
}
