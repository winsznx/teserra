import { appendFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const HERE = dirname(__filename);
export const RESULTS_PATH = join(HERE, "results.jsonl");
export const CIRCUITS_DIR = join(HERE, "..", "..", "circuits");

export type CheckStatus = "PASS" | "FAIL" | "BLOCKED" | "WORKAROUND_DOCUMENTED";

export interface CheckResult {
  id: string;
  status: CheckStatus;
  detail: string;
  data?: Record<string, unknown>;
  error?: string;
  needsTim?: string;
  ts: string;
}

function jsonReplacer(_k: string, v: unknown): unknown {
  if (typeof v === "bigint") return String(v);
  if (v instanceof Uint8Array) return `<bytes:${v.length}>`;
  return v;
}

export function logResult(r: Omit<CheckResult, "ts">): CheckResult {
  const row: CheckResult = { ...r, ts: new Date().toISOString() };
  if (!existsSync(dirname(RESULTS_PATH))) mkdirSync(dirname(RESULTS_PATH), { recursive: true });
  appendFileSync(RESULTS_PATH, JSON.stringify(row, jsonReplacer) + "\n");
  const tag = row.status === "PASS"
    ? "PASS"
    : row.status === "BLOCKED"
      ? "BLOCKED"
      : row.status === "WORKAROUND_DOCUMENTED"
        ? "WORKAROUND_DOCUMENTED"
        : "FAIL";
  console.log(`[${row.id}] ${tag}: ${row.detail}${row.needsTim ? ` — needs Tim: ${row.needsTim}` : ""}`);
  if (row.error) console.log(`        error: ${row.error}`);
  // Force exit — the SDK keeps RPC/WebSocket handles open which prevents Node
  // from draining naturally. We've written results + console output; safe to bail.
  setTimeout(() => process.exit(row.status === "FAIL" ? 1 : 0), 100).unref();
  return row;
}

export function shortError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

export const DEVNET_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";
// Per Discord intel 2026-05-03: devnet indexer is utxo-indexer.api-devnet (not the mainnet
// host). lib/constants.ts still defaults to the mainnet host — see G73.
export const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL ?? "https://utxo-indexer.api-devnet.umbraprivacy.com";
export const UMBRA_FAUCET_URL = process.env.UMBRA_FAUCET_URL ?? "https://faucet.umbraprivacy.com";
export const UMBRA_DEVNET_USDC_MINT = "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7";

export function envKeypair(): string | null {
  if (process.env.TESSERA_DAY0_KEYPAIR) return process.env.TESSERA_DAY0_KEYPAIR;
  const local = join(HERE, ".keypair.json");
  if (existsSync(local)) return local;
  return null;
}

export function loadKeypairBytes(path: string): Uint8Array {
  const arr = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(arr) || arr.length !== 64) {
    throw new Error(`Expected 64-byte JSON array keypair at ${path}`);
  }
  return Uint8Array.from(arr);
}

export const SOLANA_WSS = process.env.NEXT_PUBLIC_SOLANA_WSS ?? DEVNET_RPC.replace(/^http/, "ws");

export interface MakeClientResult { sdk: any; client: any; signer: any; }

export async function makeClient(secret: Uint8Array): Promise<MakeClientResult> {
  const sdk: any = await import("@umbra-privacy/sdk");
  const signer = await sdk.createSignerFromPrivateKeyBytes(secret);
  const client = await sdk.getUmbraClient({
    signer,
    network: "devnet",
    rpcUrl: DEVNET_RPC,
    rpcSubscriptionsUrl: SOLANA_WSS,
    indexerApiEndpoint: INDEXER_URL,
  });
  return { sdk, client, signer };
}
