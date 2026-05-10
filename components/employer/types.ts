import type { DepositStage } from "@/lib/umbra-deposit";

export interface PaymentDraft {
  recipient: string;
  amountAtomic: bigint;
  reference: string;
  mint: string;
}

export interface Payment {
  id: string;
  recipient: string;
  amountAtomic: bigint;
  reference: string;
  mint: string;
  queueSignature: string;
  callbackSignature?: string;
  status: "shielded";
  shieldedAt: number; // unix seconds
}

export type VisibleDepositStage = DepositStage; // 1:1 mapping at the moment

export const DEPOSIT_STAGES: ReadonlyArray<{ id: DepositStage; label: string }> = [
  { id: "submitted", label: "Submitted to Solana" },
  { id: "mpc-computing", label: "Encrypting via Arcium MPC" },
  { id: "committed", label: "UTXO committed" },
];

/** USDC + dUSDC both have 6 decimals. */
export const USDC_DECIMALS = 6;

export function usdcAmountToAtomic(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) return BigInt(0);
  // Round to 6 dp; truncate any further precision.
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

export function atomicToUsdc(atomic: bigint): string {
  const divisor = BigInt(10) ** BigInt(USDC_DECIMALS);
  const whole = atomic / divisor;
  const frac = atomic % divisor;
  const fracStr = frac.toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return fracStr.length > 0 ? `${whole.toString()}.${fracStr}` : whole.toString();
}
