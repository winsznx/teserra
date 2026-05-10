// lib/umbra-deposit.ts — wraps the Umbra SDK's "public balance → encrypted
// balance direct deposit" flow with the 3-stage progress UI from PRD §11.3.
//
// The SDK's `getPublicBalanceToEncryptedBalanceDirectDepositorFunction` is a
// single async call that internally: builds the tx, signs, submits, then
// awaits the Arcium MPC callback. The full call returns `Promise<DepositResult>`
// — there's no first-class hook for "tx submitted" vs "callback finalized".
//
// To surface the PRD §11.3 three stages we stage progress heuristically:
//   t=0          → fire onProgress("submitted")     — call entered
//   t=tSubmitMs  → fire onProgress("mpc-computing") — heuristic tx-sent point
//   on resolve   → fire onProgress("committed", queueSig) — callback finalized
//
// This is honest enough for UX: the SDK call genuinely blocks for both phases
// in sequence, so the timer-based stage transition correlates with what the
// user is actually waiting on. If the SDK ever exposes per-step callbacks,
// swap the timer for the real hook and remove the heuristic.

export type DepositStage =
  | "submitted"
  | "mpc-computing"
  | "committed";

export interface ShieldDepositParams {
  client: unknown;
  recipientUmbraAddress: string;
  /** Atomic units (e.g. dUSDC has 6 decimals → 1.5 dUSDC = 1_500_000n). */
  amount: bigint;
  /** Token mint base58. */
  mint: string;
  /** Up to 32 bytes; defaults to zeros. Used by x402-style verification. */
  optionalData?: Uint8Array;
  onProgress?: (stage: DepositStage, txSig?: string) => void;
}

export interface ShieldDepositResult {
  queueSignature: string;
  callbackSignature?: string;
  callbackStatus?: "finalized" | "pruned" | "timed-out";
  callbackElapsedMs?: number;
}

export class ShieldDepositError extends Error {
  constructor(
    public stage: DepositStage | "validation",
    public underlying: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ShieldDepositError";
  }
}

const SUBMIT_HEURISTIC_MS = 2_500;

export async function shieldDeposit(
  params: ShieldDepositParams,
): Promise<ShieldDepositResult> {
  const { client, recipientUmbraAddress, amount, mint, optionalData, onProgress } = params;

  if (!client) throw new ShieldDepositError("validation", null, "client is required");
  if (amount <= BigInt(0)) {
    throw new ShieldDepositError("validation", null, "amount must be > 0");
  }

  const sdk: unknown = await import("@umbra-privacy/sdk");
  const sdkApi = sdk as {
    getPublicBalanceToEncryptedBalanceDirectDepositorFunction: (args: {
      client: unknown;
    }) => (
      destination: unknown,
      mint: unknown,
      transferAmount: unknown,
      options?: { optionalData?: Uint8Array },
    ) => Promise<{
      queueSignature: string;
      callbackStatus?: "finalized" | "pruned" | "timed-out";
      callbackSignature?: string;
      callbackElapsedMs?: number;
    }>;
  };

  const deposit = sdkApi.getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });

  onProgress?.("submitted");

  // Promote the user from "submitted" → "mpc-computing" once the SDK is past
  // the synchronous tx-build/sign/submit phase. The SDK doesn't surface the
  // queueSignature mid-flight so we estimate the boundary; if the deposit
  // resolves before the timer (tiny dev-net latency), the timer becomes a
  // no-op because we'll have already fired "committed".
  let stagedMpcComputing = false;
  const mpcTimer = setTimeout(() => {
    if (!stagedMpcComputing) {
      stagedMpcComputing = true;
      onProgress?.("mpc-computing");
    }
  }, SUBMIT_HEURISTIC_MS);

  try {
    const result = await deposit(
      recipientUmbraAddress,
      mint,
      amount,
      optionalData ? { optionalData } : undefined,
    );
    if (!stagedMpcComputing) {
      stagedMpcComputing = true;
      onProgress?.("mpc-computing");
    }
    onProgress?.("committed", result.queueSignature);
    return {
      queueSignature: result.queueSignature,
      callbackSignature: result.callbackSignature,
      callbackStatus: result.callbackStatus,
      callbackElapsedMs: result.callbackElapsedMs,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const stage: DepositStage = stagedMpcComputing ? "mpc-computing" : "submitted";
    throw new ShieldDepositError(stage, err, err.message);
  } finally {
    clearTimeout(mpcTimer);
  }
}

const VALID_BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidSolanaAddress(s: string): boolean {
  return VALID_BASE58.test(s);
}

/** Discriminated union returned by SDK 4.0's `getUserAccountQuerierFunction`. */
export interface UmbraAccountQueryResult {
  state: "non_existent" | "exists";
  data?: { x25519PublicKey?: Uint8Array | number[] };
}

/** Returns true when the address has the *shape* of a Solana base58 pubkey AND
 *  is registered with Umbra (non-zero x25519 key). G76 protection — without
 *  this the employer could "shield" to an unregistered address that nobody
 *  could ever decrypt.
 *
 *  G119: the SDK returns a discriminated union `{state: "non_existent"} |
 *  {state: "exists"; data: {x25519PublicKey}}`, NOT a flat object with
 *  `x25519PublicKey` at the top level. Reading `account.x25519PublicKey`
 *  always yielded `undefined` and falsely flagged registered users. Mirror
 *  `components/umbra-provider.tsx::checkIsRegistered`. */
export async function checkRecipientUmbraStatus(
  client: unknown,
  recipientAddress: string,
): Promise<{ ok: true } | { ok: false; reason: "invalid-address" | "not-registered" | "rpc-error" }> {
  if (!isValidSolanaAddress(recipientAddress)) {
    return { ok: false, reason: "invalid-address" };
  }
  try {
    return await checkRecipientStatusInner(
      async (addr) => {
        const sdk: unknown = await import("@umbra-privacy/sdk");
        const sdkApi = sdk as {
          getUserAccountQuerierFunction: (args: { client: unknown }) =>
            (address: string) => Promise<UmbraAccountQueryResult>;
        };
        const querier = sdkApi.getUserAccountQuerierFunction({ client });
        return querier(addr);
      },
      recipientAddress,
    );
  } catch {
    return { ok: false, reason: "rpc-error" };
  }
}

/** Pure verdict logic — exposed for unit tests so we can mock the chain
 *  query without standing up a full Umbra client. */
export async function checkRecipientStatusInner(
  query: (addr: string) => Promise<UmbraAccountQueryResult>,
  recipientAddress: string,
): Promise<{ ok: true } | { ok: false; reason: "not-registered" | "rpc-error" }> {
  let account: UmbraAccountQueryResult;
  try {
    account = await query(recipientAddress);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Account does not exist|non_existent|not.?found/i.test(msg)) {
      return { ok: false, reason: "not-registered" };
    }
    return { ok: false, reason: "rpc-error" };
  }
  if (!account || account.state !== "exists") {
    return { ok: false, reason: "not-registered" };
  }
  const key = account.data?.x25519PublicKey;
  if (!key) return { ok: false, reason: "not-registered" };
  const bytes = key instanceof Uint8Array ? key : Uint8Array.from(key);
  if (!bytes.some((b) => b !== 0)) return { ok: false, reason: "not-registered" };
  return { ok: true };
}
