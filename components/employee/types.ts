import type { PublicKey } from "@solana/web3.js";
import type { RawUmbraUtxo } from "@/lib/umbra-witness";
import type { CredentialAccount, MintStage } from "@/lib/anchor";

export interface ProofConfig {
  threshold: bigint;
  startTs: number;
  endTs: number;
  filteredUtxos: RawUmbraUtxo[];
}

export interface ProveResult {
  credentialPda: PublicKey;
  cnftAssetId: PublicKey;
  proofHashHex: string;
  generationMs: number;
  verifyTxSig: string;
}

export type VisibleStage =
  | "decrypting"
  | "building-witness"
  | "generating-proof"
  | "verifying-onchain"
  | "minting-credential";

export const VISIBLE_STAGES: ReadonlyArray<{ id: VisibleStage; label: string }> = [
  { id: "decrypting", label: "Decrypting your UTXOs" },
  { id: "building-witness", label: "Building witness" },
  { id: "generating-proof", label: "Generating ZK proof" },
  { id: "verifying-onchain", label: "Verifying on-chain" },
  { id: "minting-credential", label: "Minting credential" },
];

export function mintStageToVisible(stage: MintStage): VisibleStage {
  switch (stage) {
    case "staging-init":
    case "staging-append-1":
    case "staging-append-2":
    case "verifying":
      return "verifying-onchain";
    case "complete":
      return "minting-credential";
  }
}

export interface CredentialListEntry {
  pda: PublicKey;
  account: CredentialAccount;
}
