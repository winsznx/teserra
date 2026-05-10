export const NEXT_PUBLIC_SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";

export const NEXT_PUBLIC_SOLANA_WSS =
  process.env.NEXT_PUBLIC_SOLANA_WSS || "wss://api.devnet.solana.com";

export const NEXT_PUBLIC_INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL || "https://utxo-indexer.api-devnet.umbraprivacy.com";

// Umbra devnet uses its own dUSDC mint; depositing real devnet/mainnet USDC fails
// with `fee_schedule` errors. Faucet: https://faucet.umbraprivacy.com.
export const USDC_MINT =
  process.env.NEXT_PUBLIC_USDC_MINT || "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7";

// Umbra devnet program ID. The SDK ships this in its network config
// (`@umbra-privacy/sdk` → `chunk-43JEHY7D.cjs::programId`); duplicated here
// because the verification path needs it before constructing a client.
// Mainnet uses a different program ID — log a gap if multi-network support
// surfaces in scope.
export const UMBRA_PROGRAM_ID =
  process.env.NEXT_PUBLIC_UMBRA_PROGRAM_ID ||
  "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ";

// Demo paid-service identity for `app/api/x402/charge`. Reuses the Day 0
// keypair so the agent runtime + service share an Umbra address (the rail
// is what the demo shows; who actually receives the payment doesn't
// matter for hackathon scope). Umbra addresses are base58 wallet pubkeys —
// the SDK derives them from the signer's address.
export const SERVICE_AGENT_PUBKEY =
  process.env.SERVICE_AGENT_PUBKEY ||
  "HqDXW3t6u5qovv9LgvhmyRv3EBHiM16pqAkUTxs2EVhV";
export const SERVICE_UMBRA_ADDRESS = SERVICE_AGENT_PUBKEY;

let cachedProgramId: string | null = null;

export function getProgramId(): string {
  if (cachedProgramId) return cachedProgramId;
  const fromEnv = process.env.NEXT_PUBLIC_PROGRAM_ID;
  if (!fromEnv) throw new Error("NEXT_PUBLIC_PROGRAM_ID not set");
  cachedProgramId = fromEnv;
  return cachedProgramId;
}

export const THEME_STORAGE_KEY = "tessera-theme";
