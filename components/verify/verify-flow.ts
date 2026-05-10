import type { PublicKey } from "@solana/web3.js";

export interface VerifyOutcome {
  kind: "approved" | "no-credential" | "below-threshold" | "expired" | "rpc-error";
  /** Atomic-units required threshold echoed back so the result block can show it. */
  required: bigint;
  /** Atomic-units credential threshold from chain (if any). */
  existing?: bigint;
  /** Unix seconds (if any). */
  expiresAt?: number;
  /** Selected credential PDA — used by the "what just happened" block. */
  credentialPda?: PublicKey;
  /** Underlying error if `kind === "rpc-error"`. */
  error?: Error;
}

export interface VerifyDeps {
  /** Returns the most-recent credential PDA for the owner (or null). */
  findMostRecentByOwner: (owner: PublicKey) => Promise<{
    pda: PublicKey;
    issuedAt: bigint;
    expiresAt: bigint;
  } | null>;
  /** Wraps `lib/anchor::verifyCredential`. */
  verify: (
    pda: PublicKey,
    requiredThreshold: bigint,
  ) => Promise<{ valid: boolean; threshold: bigint; expiresAt: number; reason: 0 | 1 | 2 }>;
}

/** Pure outcome resolver — no SDK / RPC types touch this layer. Tests inject
 *  mocks for `findMostRecentByOwner` and `verify`. */
export async function runVerification(
  deps: VerifyDeps,
  owner: PublicKey,
  requiredThreshold: bigint,
): Promise<VerifyOutcome> {
  let lookup;
  try {
    lookup = await deps.findMostRecentByOwner(owner);
  } catch (e) {
    return {
      kind: "rpc-error",
      required: requiredThreshold,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
  if (!lookup) {
    return { kind: "no-credential", required: requiredThreshold };
  }

  let result;
  try {
    result = await deps.verify(lookup.pda, requiredThreshold);
  } catch (e) {
    return {
      kind: "rpc-error",
      required: requiredThreshold,
      credentialPda: lookup.pda,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }

  if (result.valid && result.reason === 0) {
    return {
      kind: "approved",
      required: requiredThreshold,
      existing: result.threshold,
      expiresAt: result.expiresAt,
      credentialPda: lookup.pda,
    };
  }

  // The on-chain `verify_credential` returns reason=1 when expired and
  // reason=2 when the credential threshold is below the requested one.
  if (result.reason === 1) {
    return {
      kind: "expired",
      required: requiredThreshold,
      existing: result.threshold,
      expiresAt: result.expiresAt,
      credentialPda: lookup.pda,
    };
  }
  return {
    kind: "below-threshold",
    required: requiredThreshold,
    existing: result.threshold,
    expiresAt: result.expiresAt,
    credentialPda: lookup.pda,
  };
}

export const USDC_DECIMALS = 6;

export function usdcToAtomic(usdc: number): bigint {
  if (!Number.isFinite(usdc) || usdc <= 0) return BigInt(0);
  return BigInt(Math.round(usdc * 10 ** USDC_DECIMALS));
}

export function atomicToUsdc(atomic: bigint): string {
  const divisor = BigInt(10) ** BigInt(USDC_DECIMALS);
  const whole = atomic / divisor;
  return whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
