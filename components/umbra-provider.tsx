"use client";

import * as React from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";

import {
  NEXT_PUBLIC_INDEXER_URL,
  NEXT_PUBLIC_SOLANA_RPC,
  NEXT_PUBLIC_SOLANA_WSS,
} from "@/lib/constants";
import {
  fetchUtxos as fetchUtxosLib,
  type RawUmbraUtxo,
  type ScanOptions,
} from "@/lib/umbra-witness";
import {
  shieldDeposit,
  type ShieldDepositParams,
  type ShieldDepositResult,
} from "@/lib/umbra-deposit";

// AnchorProvider expects a signTransaction/signAllTransactions/publicKey shape.
// Anchor 0.30.1 doesn't re-export the type from its index, so we declare it
// inline. Any wallet-adapter `useWallet()` instance with an active publicKey
// satisfies this — we just narrow the optional methods.
interface AnchorWalletShape {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

// Phase names preserve the contract /employee was built against in the prior
// session: { "no-wallet" | "loading" | "initializing" | "ready" | "init-failed" }.
type ProviderState =
  | { phase: "no-wallet" }
  | { phase: "loading" }
  | { phase: "initializing"; publicKey: PublicKey; walletName: string | null }
  | {
      phase: "ready";
      publicKey: PublicKey;
      walletName: string | null;
      umbraAddress: string;
      isRegistered: boolean;
      anchorWallet: AnchorWalletShape;
      connection: Connection;
      client: unknown;
    }
  | {
      phase: "init-failed";
      publicKey: PublicKey;
      walletName: string | null;
      error: Error;
    };

interface UmbraContextValue {
  state: ProviderState;
  /** Trigger Umbra registration. No-op if already registered. Requires phase=ready. */
  register: () => Promise<void>;
  /** Wraps `lib/umbra-witness::fetchUtxos`. Throws if state.phase !== "ready". */
  scan: (opts: ScanOptions) => Promise<RawUmbraUtxo[]>;
  /** Wraps `lib/umbra-deposit::shieldDeposit`. Throws if state.phase !== "ready". */
  deposit: (
    params: Omit<ShieldDepositParams, "client">,
  ) => Promise<ShieldDepositResult>;
  /** Manual retry for failed Umbra client init. */
  retryInit: () => void;
}

const UmbraContext = React.createContext<UmbraContextValue | null>(null);
export const __UmbraContext = UmbraContext;

interface UmbraProviderProps {
  children: React.ReactNode;
}

function buildAnchorWallet(
  publicKey: PublicKey,
  signTransaction:
    | (<T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>)
    | undefined,
  signAllTransactions:
    | (<T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>)
    | undefined,
): AnchorWalletShape | null {
  if (!signTransaction || !signAllTransactions) return null;
  return { publicKey, signTransaction, signAllTransactions };
}

/** Shape of `getUserAccountQuerierFunction({client})(addr)` per SDK 4.0.
 *  Discriminated union: { state: "non_existent" } | { state: "exists"; data: ... }.
 *  Exposed for the unit test that mocks the chain call. */
export interface UmbraUserAccountQueryResult {
  state: "non_existent" | "exists";
  data?: { x25519PublicKey?: Uint8Array | number[] };
}

/** Canonical "is this user registered" check, mirroring Day 0 02-register.ts:
 *    1. account.state === "exists"  (PDA found on-chain)
 *    2. data.x25519PublicKey present and contains at least one non-zero byte
 *       (G76: 32 zero bytes means the slot was provisioned but never claimed)
 *
 *  Errors that look like "Account does not exist" are treated as "not registered";
 *  any other error is propagated so callers can distinguish RPC outages from a
 *  fresh wallet. The previous bug here was: `querier()` was called with no
 *  address argument → the SDK threw `Failed to derive user account PDA…`, the
 *  blanket `try/catch` swallowed it, and `Boolean(account)` was always false. */
export async function checkIsRegistered(
  query: (addr: string) => Promise<UmbraUserAccountQueryResult>,
  signerAddress: string,
): Promise<boolean> {
  try {
    const account = await query(signerAddress);
    if (!account || account.state !== "exists") return false;
    const key = account.data?.x25519PublicKey;
    if (!key) return false;
    const bytes = key instanceof Uint8Array ? key : Uint8Array.from(key);
    return bytes.some((b) => b !== 0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Account does not exist|non_existent|not.?found/i.test(msg)) return false;
    throw err;
  }
}

// Wallet-adapter's `StandardWalletAdapter` exposes `.wallet` (the underlying
// Wallet Standard wallet) and `.standard === true`. The Umbra SDK ships
// `createSignerFromWalletAccount(wallet, account)` that builds the IUmbraSigner
// — auto-signing the canonical master-seed message internally. This is the
// official path per Discord intel; rolling a custom signer drifts from the
// SDK's domain-separated message format.
async function buildUmbraSignerFromAdapter(
  adapter: unknown,
  publicKeyBase58: string,
): Promise<unknown> {
  const a = adapter as {
    standard?: boolean;
    wallet?: { accounts?: ReadonlyArray<{ address: string }> };
  };
  if (a.standard !== true || !a.wallet?.accounts) {
    throw new Error(
      "Wallet does not implement the Wallet Standard. Use a modern wallet (Solflare, Phantom, Backpack).",
    );
  }
  const account = a.wallet.accounts.find((acc) => acc.address === publicKeyBase58);
  if (!account) {
    throw new Error(
      "Wallet Standard account list doesn't contain the connected public key.",
    );
  }
  const sdk: unknown = await import("@umbra-privacy/sdk");
  const sdkApi = sdk as {
    createSignerFromWalletAccount: (wallet: unknown, account: unknown) => unknown;
  };
  return sdkApi.createSignerFromWalletAccount(a.wallet, account);
}

export function UmbraProvider({ children }: UmbraProviderProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [state, setState] = React.useState<ProviderState>({ phase: "no-wallet" });
  const [retryToken, setRetryToken] = React.useState(0);
  // Memoize the registration query by signer address so re-renders within a
  // single connected session don't re-hit the RPC. Cleared on disconnect.
  const registrationCacheRef = React.useRef<{ address: string; registered: boolean } | null>(null);

  const adapterName = wallet.wallet?.adapter.name ?? null;
  const publicKeyStr = wallet.publicKey?.toBase58() ?? null;

  React.useEffect(() => {
    let cancelled = false;

    if (wallet.connecting) {
      setState({ phase: "loading" });
      return () => {
        cancelled = true;
      };
    }
    if (!wallet.connected || !wallet.publicKey || !wallet.wallet) {
      registrationCacheRef.current = null;
      setState({ phase: "no-wallet" });
      return () => {
        cancelled = true;
      };
    }
    const publicKey = wallet.publicKey;
    setState({
      phase: "initializing",
      publicKey,
      walletName: adapterName,
    });

    (async () => {
      try {
        const signer = await buildUmbraSignerFromAdapter(
          wallet.wallet!.adapter,
          publicKey.toBase58(),
        );
        if (cancelled) return;

        const sdk: unknown = await import("@umbra-privacy/sdk");
        if (cancelled) return;
        const sdkApi = sdk as {
          getUmbraClient: (args: Record<string, unknown>) => Promise<unknown>;
          getUserAccountQuerierFunction: (args: { client: unknown }) =>
            (address: string) => Promise<UmbraUserAccountQueryResult>;
        };

        // deferMasterSeedSigning = true → wallet popup deferred to first
        // operation that needs a derived key (scan / deposit / register).
        // Construction itself is silent so connecting a wallet doesn't fire
        // an immediate signature prompt.
        const client = await sdkApi.getUmbraClient({
          signer,
          network: "devnet",
          rpcUrl: NEXT_PUBLIC_SOLANA_RPC,
          rpcSubscriptionsUrl: NEXT_PUBLIC_SOLANA_WSS,
          indexerApiEndpoint: NEXT_PUBLIC_INDEXER_URL,
          deferMasterSeedSigning: true,
        });
        if (cancelled) return;

        const cached = registrationCacheRef.current;
        let registered: boolean;
        if (cached && cached.address === publicKey.toBase58()) {
          registered = cached.registered;
        } else {
          const querier = sdkApi.getUserAccountQuerierFunction({ client });
          registered = await checkIsRegistered(querier, publicKey.toBase58());
          registrationCacheRef.current = {
            address: publicKey.toBase58(),
            registered,
          };
        }
        if (cancelled) return;

        const anchorWallet = buildAnchorWallet(
          publicKey,
          wallet.signTransaction,
          wallet.signAllTransactions,
        );
        if (!anchorWallet) {
          throw new Error(
            "Wallet adapter does not expose signTransaction / signAllTransactions",
          );
        }

        setState({
          phase: "ready",
          publicKey,
          walletName: adapterName,
          umbraAddress: publicKey.toBase58(),
          isRegistered: registered,
          anchorWallet,
          connection,
          client,
        });
      } catch (e) {
        if (cancelled) return;
        const err = e instanceof Error ? e : new Error(String(e));
        setState({
          phase: "init-failed",
          publicKey,
          walletName: adapterName,
          error: err,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    wallet.connecting,
    wallet.connected,
    publicKeyStr,
    adapterName,
    wallet.signTransaction,
    wallet.signAllTransactions,
    wallet.wallet,
    wallet.publicKey,
    connection,
    retryToken,
  ]);

  const register = React.useCallback(async () => {
    if (state.phase !== "ready") {
      throw new Error("UmbraProvider: register() requires phase 'ready'");
    }
    if (state.isRegistered) return;
    const sdk: unknown = await import("@umbra-privacy/sdk");
    const sdkApi = sdk as {
      getUserRegistrationFunction: (args: { client: unknown }) => () => Promise<unknown>;
    };
    const registerFn = sdkApi.getUserRegistrationFunction({ client: state.client });
    await registerFn();
    registrationCacheRef.current = {
      address: state.publicKey.toBase58(),
      registered: true,
    };
    setState((prev) => (prev.phase === "ready" ? { ...prev, isRegistered: true } : prev));
  }, [state]);

  const scan = React.useCallback(
    async (opts: ScanOptions) => {
      if (state.phase !== "ready") {
        throw new Error("UmbraProvider: scan() requires phase 'ready'");
      }
      return fetchUtxosLib(state.client, NEXT_PUBLIC_INDEXER_URL, state.umbraAddress, opts);
    },
    [state],
  );

  const deposit = React.useCallback(
    async (params: Omit<ShieldDepositParams, "client">) => {
      if (state.phase !== "ready") {
        throw new Error("UmbraProvider: deposit() requires phase 'ready'");
      }
      return shieldDeposit({ ...params, client: state.client });
    },
    [state],
  );

  const retryInit = React.useCallback(() => setRetryToken((t) => t + 1), []);

  const value = React.useMemo<UmbraContextValue>(
    () => ({ state, register, scan, deposit, retryInit }),
    [state, register, scan, deposit, retryInit],
  );

  return <UmbraContext.Provider value={value}>{children}</UmbraContext.Provider>;
}
