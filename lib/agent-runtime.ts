// lib/agent-runtime.ts — server-only headless Tessera agent runtime.
//
// Each `Agent` is a long-running in-memory process keyed by its Solana
// pubkey. It owns a deterministic Umbra identity (derived from the keypair
// via the SDK's `createSignerFromPrivateKeyBytes`), an SSE-friendly event
// ring buffer + subscriber set, and a serialized command queue.
//
// Notable design choices vs PRD §14:
//   - The PRD sketches a hand-rolled `AgentSigner implements IUmbraSigner`
//     using `@noble/ed25519::sign`. The SDK's official factory
//     `createSignerFromPrivateKeyBytes(bytes)` already returns a correct
//     `IUmbraSigner` (proven against the live program in Day 0 02-register.ts).
//     We use the factory instead — no custom message-signing code touches
//     the secret bytes, no risk of drifting from the SDK's domain-separated
//     master-seed message format.
//   - The registry is a module-level Map. In production (multi-instance Vercel)
//     this would need a shared store; for the hackathon devnet demo we run
//     on a single instance and the lifetime of an Agent is the lifetime of
//     the Node process. Logged as G124.
//   - `mint-credential` is gated on G81 (SDK scanner bug): without scan, we
//     can't enumerate the agent's own UTXOs to build a witness. The handler
//     emits `proof.generating` then `proof.complete` with `verifies: false`
//     so the UI surfaces the blocker honestly. Real impl unblocks when
//     Cal/Umbra ships the SDK fix — see G125.

import "server-only";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";

import idlJson from "@/idl/tessera.json" with { type: "json" };
import {
  NEXT_PUBLIC_INDEXER_URL,
  NEXT_PUBLIC_SOLANA_RPC,
  NEXT_PUBLIC_SOLANA_WSS,
  USDC_MINT,
} from "@/lib/constants";
import {
  shieldDeposit,
  ShieldDepositError,
  type DepositStage,
} from "@/lib/umbra-deposit";
import { payX402Private } from "@/lib/x402-adapter";

// ── Event union (PRD §13 verbatim names) ───────────────────────────────

export type AgentEvent =
  | { type: "agent.spawned"; ts: number; agentPubkey: string; umbraAddress: string }
  | { type: "payment.received"; ts: number; amount: bigint; from: string; txSig: string }
  | { type: "proof.generating"; ts: number; threshold: bigint; rangeMs: [number, number] }
  | { type: "proof.complete"; ts: number; durationMs: number; verifies: boolean }
  | { type: "credential.minted"; ts: number; credentialPda: string; cnftAssetId: string; txSig: string }
  | { type: "x402.outbound"; ts: number; serviceUrl: string; amount: bigint; txSig: string }
  | { type: "x402.inbound"; ts: number; from: string; amount: bigint; verified: boolean }
  | { type: "x402.confirmed"; ts: number; serviceUrl: string; durationMs: number };

// ── Command union ──────────────────────────────────────────────────────

export type AgentCommand =
  | { type: "trigger-payment-from"; from: Keypair; amount: bigint }
  | { type: "ack-incoming-payment"; txSignature: string; amount: bigint; fromUmbraAddress: string }
  | { type: "mint-credential"; threshold: bigint; startTs: number; endTs: number }
  | { type: "pay-x402"; serviceUrl: string; amount: bigint; nonce: string };

export interface AgentState {
  pubkey: string;
  umbraAddress: string;
  running: boolean;
  spawnedAt: number;
  isRegistered: boolean;
  eventCount: number;
}

// JSON-serializable form of AgentEvent — bigints render as decimal strings
// so SSE payloads survive JSON.stringify and the UI receives strings (which
// it converts on the client side as needed).
export type WireAgentEvent = Omit<AgentEvent, never> extends infer _E
  ? Record<string, unknown>
  : never;

export function eventToWire(event: AgentEvent): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(event)) {
    out[k] = typeof v === "bigint" ? v.toString() : v;
  }
  return out;
}

// ── Helpers ────────────────────────────────────────────────────────────

const RING_CAP = 256;

function buildAnchorWalletFromKeypair(kp: Keypair) {
  return {
    publicKey: kp.publicKey,
    async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
      if (tx instanceof VersionedTransaction) tx.sign([kp]);
      else tx.partialSign(kp);
      return tx;
    },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
      for (const tx of txs) {
        if (tx instanceof VersionedTransaction) tx.sign([kp]);
        else tx.partialSign(kp);
      }
      return txs;
    },
  };
}

interface ResolvedSdk {
  // Day 0 02-register.ts confirmed this factory is async — it derives the
  // master seed lazily and may invoke the signer's signMessage on first use.
  // The hand-rolled `AgentSigner` shape from PRD §14 doesn't apply with
  // SDK 4.0; stick to the canonical factory which is the proven path.
  createSignerFromPrivateKeyBytes: (bytes: Uint8Array) => Promise<unknown> | unknown;
  getUmbraClient: (args: Record<string, unknown>) => Promise<unknown>;
  getUserAccountQuerierFunction: (args: { client: unknown }) => (
    addr: string,
  ) => Promise<{ state: "non_existent" | "exists"; data?: { x25519PublicKey?: Uint8Array | number[] } }>;
  getUserRegistrationFunction: (
    args: { client: unknown },
    deps?: Record<string, unknown>,
  ) => (opts?: Record<string, unknown>) => Promise<unknown>;
}

async function loadSdk(): Promise<ResolvedSdk> {
  const mod: unknown = await import("@umbra-privacy/sdk");
  return mod as ResolvedSdk;
}

async function isRegisteredOnChain(
  sdk: ResolvedSdk,
  client: unknown,
  address: string,
): Promise<boolean> {
  try {
    const querier = sdk.getUserAccountQuerierFunction({ client });
    const result = await querier(address);
    if (!result || result.state !== "exists") return false;
    const key = result.data?.x25519PublicKey;
    if (!key) return false;
    const bytes = key instanceof Uint8Array ? key : Uint8Array.from(key);
    return bytes.some((b) => b !== 0);
  } catch {
    return false;
  }
}

// ── Agent class ────────────────────────────────────────────────────────

export class Agent {
  readonly pubkey: PublicKey;
  readonly umbraAddress: string;
  readonly spawnedAt: number;
  readonly client: unknown;
  readonly anchorProgram: Program<Idl>;
  readonly anchorConnection: Connection;

  private readonly keypair: Keypair;
  private readonly sdk: ResolvedSdk;
  private readonly events: AgentEvent[] = [];
  private readonly subscribers = new Set<(event: AgentEvent) => void>();
  private readonly receivedDeposits: { txSig: string; amount: bigint; from: string }[] = [];
  private commandQueue: Promise<void> = Promise.resolve();
  private isRegistered: boolean;
  private running = true;

  private constructor(args: {
    keypair: Keypair;
    sdk: ResolvedSdk;
    client: unknown;
    anchorProgram: Program<Idl>;
    anchorConnection: Connection;
    isRegistered: boolean;
  }) {
    this.keypair = args.keypair;
    this.pubkey = args.keypair.publicKey;
    this.umbraAddress = args.keypair.publicKey.toBase58();
    this.sdk = args.sdk;
    this.client = args.client;
    this.anchorProgram = args.anchorProgram;
    this.anchorConnection = args.anchorConnection;
    this.isRegistered = args.isRegistered;
    this.spawnedAt = Date.now();
  }

  static async spawn(opts: { keypair: Keypair }): Promise<Agent> {
    const sdk = await loadSdk();
    const signer = await sdk.createSignerFromPrivateKeyBytes(opts.keypair.secretKey);
    const client = await sdk.getUmbraClient({
      signer,
      network: "devnet",
      rpcUrl: NEXT_PUBLIC_SOLANA_RPC,
      rpcSubscriptionsUrl: NEXT_PUBLIC_SOLANA_WSS,
      indexerApiEndpoint: NEXT_PUBLIC_INDEXER_URL,
      deferMasterSeedSigning: false,
    });
    const isRegistered = await isRegisteredOnChain(
      sdk,
      client,
      opts.keypair.publicKey.toBase58(),
    );

    const connection = new Connection(NEXT_PUBLIC_SOLANA_RPC, "confirmed");
    const provider = new AnchorProvider(connection, buildAnchorWalletFromKeypair(opts.keypair), {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    const anchorProgram = new Program(idlJson as unknown as Idl, provider) as unknown as Program<Idl>;

    const agent = new Agent({
      keypair: opts.keypair,
      sdk,
      client,
      anchorProgram,
      anchorConnection: connection,
      isRegistered,
    });
    agent.emit({
      type: "agent.spawned",
      ts: Date.now(),
      agentPubkey: agent.pubkey.toBase58(),
      umbraAddress: agent.umbraAddress,
    });
    return agent;
  }

  emit(event: AgentEvent): void {
    if (!this.running) return;
    this.events.push(event);
    if (this.events.length > RING_CAP) this.events.shift();
    for (const cb of this.subscribers) {
      try {
        cb(event);
      } catch {
        // A subscriber throwing must never bring down emit() — drop the
        // exception and continue. Subscribers are responsible for their
        // own error handling.
      }
    }
  }

  subscribe(cb: (event: AgentEvent) => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  getRecentEvents(): AgentEvent[] {
    return [...this.events];
  }

  getState(): AgentState {
    return {
      pubkey: this.pubkey.toBase58(),
      umbraAddress: this.umbraAddress,
      running: this.running,
      spawnedAt: this.spawnedAt,
      isRegistered: this.isRegistered,
      eventCount: this.events.length,
    };
  }

  /** Mark the on-chain registration state as confirmed. Called by the spawn
   *  route after running register() on a fresh keypair. */
  markRegistered(): void {
    this.isRegistered = true;
  }

  /** Queue a command for serial execution. Each command is awaited before
   *  the next runs so on-chain operations don't interleave. */
  command(cmd: AgentCommand): Promise<void> {
    if (!this.running) {
      return Promise.reject(new Error("agent stopped"));
    }
    const next = this.commandQueue.then(() => this.handleCommand(cmd));
    // Swallow rejections at the queue level — each handler emits its own
    // failure events; an unhandled queue rejection would block subsequent
    // commands.
    this.commandQueue = next.catch(() => undefined);
    return next;
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.subscribers.clear();
  }

  // ── Command handlers ────────────────────────────────────────────────

  private async handleCommand(cmd: AgentCommand): Promise<void> {
    switch (cmd.type) {
      case "trigger-payment-from":
        return this.handleTriggerPayment(cmd);
      case "ack-incoming-payment":
        return this.handleAckIncomingPayment(cmd);
      case "mint-credential":
        return this.handleMintCredential(cmd);
      case "pay-x402":
        return this.handlePayX402(cmd);
    }
  }

  private async handleAckIncomingPayment(cmd: {
    txSignature: string;
    amount: bigint;
    fromUmbraAddress: string;
  }): Promise<void> {
    // The user's connected wallet on /agent already submitted the deposit
    // (so the agent itself doesn't need a Keypair to send from). This handler
    // records the deposit txSig for later G81-workaround use during
    // mint-credential and emits the user-visible payment.received event.
    this.receivedDeposits.push({
      txSig: cmd.txSignature,
      amount: cmd.amount,
      from: cmd.fromUmbraAddress,
    });
    this.emit({
      type: "payment.received",
      ts: Date.now(),
      amount: cmd.amount,
      from: cmd.fromUmbraAddress,
      txSig: cmd.txSignature,
    });
  }

  private async handleTriggerPayment(cmd: {
    from: Keypair;
    amount: bigint;
  }): Promise<void> {
    const fromSigner = await this.sdk.createSignerFromPrivateKeyBytes(cmd.from.secretKey);
    const fromClient = await this.sdk.getUmbraClient({
      signer: fromSigner,
      network: "devnet",
      rpcUrl: NEXT_PUBLIC_SOLANA_RPC,
      rpcSubscriptionsUrl: NEXT_PUBLIC_SOLANA_WSS,
      indexerApiEndpoint: NEXT_PUBLIC_INDEXER_URL,
      deferMasterSeedSigning: false,
    });

    let lastStage: DepositStage | null = null;
    try {
      const result = await shieldDeposit({
        client: fromClient,
        recipientUmbraAddress: this.umbraAddress,
        amount: cmd.amount,
        mint: USDC_MINT,
        onProgress: (stage) => {
          lastStage = stage;
        },
      });
      this.receivedDeposits.push({
        txSig: result.queueSignature,
        amount: cmd.amount,
        from: cmd.from.publicKey.toBase58(),
      });
      this.emit({
        type: "payment.received",
        ts: Date.now(),
        amount: cmd.amount,
        from: cmd.from.publicKey.toBase58(),
        txSig: result.queueSignature,
      });
    } catch (e) {
      const stage = lastStage ?? "submitted";
      const message = e instanceof ShieldDepositError ? e.message : e instanceof Error ? e.message : String(e);
      this.emit({
        type: "payment.received",
        ts: Date.now(),
        amount: BigInt(0),
        from: cmd.from.publicKey.toBase58(),
        // The wire format expects a string; we surface the failure shape so
        // the UI can render an error state. Negative-path event taxonomy
        // expansion is logged as G126.
        txSig: `error:${stage}:${message.slice(0, 80)}`,
      });
      throw e;
    }
  }

  private async handleMintCredential(cmd: {
    threshold: bigint;
    startTs: number;
    endTs: number;
  }): Promise<void> {
    const t0 = Date.now();
    this.emit({
      type: "proof.generating",
      ts: t0,
      threshold: cmd.threshold,
      rangeMs: [cmd.startTs * 1000, cmd.endTs * 1000],
    });

    // G125 (server-side mint blocked): the witness needs amount/nonce/secret
    // for each UTXO, which the SDK only enumerates via
    // `getClaimableUtxoScannerFunction` (broken on G81). We can't synthesize
    // these from RPC tx parsing without the SDK's decryption helpers. Emit
    // proof.complete with verifies:false so the live feed shows the agent
    // attempted a mint and stopped honestly. Real implementation lands when
    // G81 is fixed in @umbra-privacy/sdk.
    await new Promise((r) => setTimeout(r, 50));
    this.emit({
      type: "proof.complete",
      ts: Date.now(),
      durationMs: Date.now() - t0,
      verifies: false,
    });
  }

  private async handlePayX402(cmd: {
    serviceUrl: string;
    amount: bigint;
    nonce: string;
  }): Promise<void> {
    // Real x402 over Umbra round-trip:
    //   1. POST the service URL with no body → expect 402 + X402Challenge
    //   2. Build the deposit via shieldDeposit (binds nonce in optional_data)
    //   3. POST again with `x-payment: base64(JSON(proof))` → expect 200
    // The agent's `cmd.nonce` is informational here (used in the outbound
    // event for log readability); the authoritative nonce comes from the
    // 402 challenge the service issues.
    const start = Date.now();

    this.emit({
      type: "x402.outbound",
      ts: start,
      serviceUrl: cmd.serviceUrl,
      amount: cmd.amount,
      txSig: "",
    });

    const challengeRes = await fetch(cmd.serviceUrl, { method: "POST" });
    if (challengeRes.status !== 402) {
      throw new Error(
        `pay-x402: expected 402 challenge, got ${challengeRes.status}`,
      );
    }
    const challenge = (await challengeRes.json()) as Parameters<
      typeof payX402Private
    >[1];

    const proof = await payX402Private(this.client, challenge);

    this.emit({
      type: "x402.outbound",
      ts: Date.now(),
      serviceUrl: cmd.serviceUrl,
      amount: cmd.amount,
      txSig: proof.txSignature,
    });

    const wireProof = {
      scheme: proof.scheme,
      txSignature: proof.txSignature,
      nonce: proof.nonce,
    };
    const headerValue = Buffer.from(JSON.stringify(wireProof), "utf8").toString("base64");
    const finalRes = await fetch(cmd.serviceUrl, {
      method: "POST",
      headers: { "x-payment": headerValue },
    });

    if (!finalRes.ok) {
      const text = await finalRes.text();
      throw new Error(
        `pay-x402: service rejected payment (${finalRes.status}): ${text.slice(0, 200)}`,
      );
    }

    this.emit({
      type: "x402.confirmed",
      ts: Date.now(),
      serviceUrl: cmd.serviceUrl,
      durationMs: Date.now() - start,
    });
  }
}

// ── Registry ───────────────────────────────────────────────────────────

const registry = new Map<string, Agent>();

export async function spawnAgent(keypair: Keypair): Promise<Agent> {
  const key = keypair.publicKey.toBase58();
  const existing = registry.get(key);
  if (existing && existing.getState().running) return existing;
  const agent = await Agent.spawn({ keypair });
  registry.set(key, agent);
  return agent;
}

export function getAgent(pubkey: string): Agent | null {
  const agent = registry.get(pubkey);
  if (!agent) return null;
  if (!agent.getState().running) return null;
  return agent;
}

export function listAgents(): Agent[] {
  return Array.from(registry.values()).filter((a) => a.getState().running);
}

/** Test-only: clear the registry and stop all agents. Never called from
 *  request handlers. */
export function __resetRegistryForTests(): void {
  for (const agent of registry.values()) agent.stop();
  registry.clear();
}

// ── Validation helpers (used by /api/agent/command) ────────────────────

export function validateCommand(input: unknown): AgentCommand | { error: string } {
  if (!input || typeof input !== "object") return { error: "command must be an object" };
  const c = input as Record<string, unknown>;
  if (typeof c.type !== "string") return { error: "command.type must be a string" };
  switch (c.type) {
    case "trigger-payment-from": {
      if (!Array.isArray(c.fromSecretKey) || c.fromSecretKey.length !== 64) {
        return { error: "trigger-payment-from: fromSecretKey must be a 64-byte JSON array" };
      }
      const amount = parseBigint(c.amount);
      if (amount === null || amount <= BigInt(0)) {
        return { error: "trigger-payment-from: amount must be a positive integer string" };
      }
      const from = Keypair.fromSecretKey(Uint8Array.from(c.fromSecretKey as number[]));
      return { type: "trigger-payment-from", from, amount };
    }
    case "ack-incoming-payment": {
      if (typeof c.txSignature !== "string" || c.txSignature.length < 32) {
        return { error: "ack-incoming-payment: txSignature must be a non-empty string" };
      }
      const amount = parseBigint(c.amount);
      if (amount === null || amount <= BigInt(0)) {
        return { error: "ack-incoming-payment: amount must be a positive integer string" };
      }
      if (typeof c.fromUmbraAddress !== "string" || c.fromUmbraAddress.length === 0) {
        return { error: "ack-incoming-payment: fromUmbraAddress must be a non-empty string" };
      }
      return {
        type: "ack-incoming-payment",
        txSignature: c.txSignature,
        amount,
        fromUmbraAddress: c.fromUmbraAddress,
      };
    }
    case "mint-credential": {
      const threshold = parseBigint(c.threshold);
      const startTs = Number(c.startTs);
      const endTs = Number(c.endTs);
      if (threshold === null || threshold <= BigInt(0)) {
        return { error: "mint-credential: threshold must be a positive integer string" };
      }
      if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || startTs >= endTs) {
        return { error: "mint-credential: startTs must be a number < endTs" };
      }
      return { type: "mint-credential", threshold, startTs, endTs };
    }
    case "pay-x402": {
      if (typeof c.serviceUrl !== "string" || c.serviceUrl.length === 0) {
        return { error: "pay-x402: serviceUrl must be a non-empty string" };
      }
      const amount = parseBigint(c.amount);
      if (amount === null || amount <= BigInt(0)) {
        return { error: "pay-x402: amount must be a positive integer string" };
      }
      if (typeof c.nonce !== "string" || c.nonce.length === 0) {
        return { error: "pay-x402: nonce must be a non-empty string" };
      }
      return { type: "pay-x402", serviceUrl: c.serviceUrl, amount, nonce: c.nonce };
    }
    default:
      return { error: `unknown command.type: ${c.type}` };
  }
}

function parseBigint(x: unknown): bigint | null {
  if (typeof x === "bigint") return x;
  if (typeof x === "number" && Number.isFinite(x)) return BigInt(Math.floor(x));
  if (typeof x === "string" && /^-?\d+$/.test(x)) {
    try {
      return BigInt(x);
    } catch {
      return null;
    }
  }
  return null;
}
