import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export interface UmbraUTXO {
  id: string;
  amount: bigint;
  token: string;
  timestamp: number;
  nonce: bigint;
  nullifier: string;
  merkleProof: string[];
  isSpent: boolean;
}

export interface IncomeWitness {
  amounts: bigint[];
  isValid: bigint[];
  nonces: bigint[];
  employerSecret: bigint;
  threshold: bigint;
  dateRangeHash: bigint;
  employerCommitment: bigint;
}

export interface TesseraCredential {
  owner: PublicKey;
  incomeAboveThreshold: boolean;
  threshold: BN;
  dateRangeHash: number[];
  employerCommitment: number[];
  proofHash: number[];
  issuedAt: BN;
  expiresAt: BN;
  issuer: PublicKey;
  bump: number;
}

export interface UmbraPaymentRequirement {
  recipientUmbraAddress: string;
  amount: bigint;
  token: string;
  nonce: string;
  expiresAt: number;
}

export interface AgentEvent {
  timestamp: number;
  type: string;
  name: string;
  data: Record<string, any>;
  status: "success" | "in-progress" | "error";
}
