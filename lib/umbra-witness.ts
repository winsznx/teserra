// lib/umbra-witness.ts — bridge between Umbra SDK / indexer and the
// witness builder. Real-UTXO smoke is gated on G81 (SDK scanner bug) +
// indexer schema discovery (G108 below). The SDK path is wired through
// `fetchUtxosViaSdk`; the direct-indexer fallback is logged but not
// implemented because the devnet indexer responds with raw protobuf and
// no published .proto file. When the SDK scanner ships its fix, the
// indexer fallback can be removed entirely.

import type { IncomeProofInputs, UmbraUtxoData } from "./witness";

export interface RawUmbraUtxo {
  amount: bigint;
  nonce: bigint;
  secret: bigint;
  timestamp: number;
  leafIndex: number;
  merkleProof: bigint[];
}

export interface ScanOptions {
  startTs: number;
  endTs: number;
  mint: string;
}

/** Detect the v4 SDK's `fetchClaimableUtxos` BigInt-vs-number arithmetic crash
 *  (G81). Used to switch to the indexer fallback rather than re-throw. */
export function isG81ScannerBug(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Cannot mix BigInt and other types/i.test(msg);
}

/** Pull the user's claimable UTXOs via `getClaimableUtxoScannerFunction`.
 *  Wraps the SDK call with the parallelisation pattern from G74 (whose
 *  improvements should already live in `lib/umbra-client.ts` once that
 *  lands — for now the SDK does the iteration internally). */
export async function fetchUtxosViaSdk(
  client: any,
  opts: ScanOptions,
): Promise<RawUmbraUtxo[]> {
  // Dynamic import so consumers without @umbra-privacy/sdk in their tree
  // don't fail at module-load time.
  const sdk: any = await import("@umbra-privacy/sdk");
  const scanFn = sdk.getClaimableUtxoScannerFunction({ client });
  const result = await scanFn();

  // v4 result shape per Discord intel: {selfBurnable, received, publicSelfBurnable, publicReceived}
  const all: any[] = [];
  for (const k of ["selfBurnable", "received", "publicSelfBurnable", "publicReceived"]) {
    if (Array.isArray(result?.[k])) all.push(...result[k]);
  }

  return all
    .filter((u) => {
      const mint = String(u?.mint ?? u?.tokenMint ?? "");
      if (mint && mint !== opts.mint) return false;
      const ts = Number(u?.timestamp ?? u?.depositTimestamp ?? 0);
      return ts >= opts.startTs && ts <= opts.endTs;
    })
    .map(toRaw);
}

function toRaw(u: any): RawUmbraUtxo {
  // Field names from G73 (SDK v4): merklePath / leafIndex etc.
  const proof: bigint[] = (u?.merklePath ?? []).map((b: any) =>
    typeof b === "bigint" ? b : BigInt(b?.toString?.() ?? "0"),
  );
  return {
    amount: BigInt((u.amount ?? 0).toString()),
    nonce: BigInt((u.nonce ?? u.h2RandomSecret ?? 0).toString()),
    secret: BigInt((u.utxoSecret ?? u.poseidonPrivateKey ?? 0).toString()),
    timestamp: Number(u.timestamp ?? u.depositTimestamp ?? 0),
    leafIndex: Number(u.leafIndex ?? u.commitmentIndex ?? 0),
    merkleProof: proof,
  };
}

/** Indexer fallback. Devnet `https://utxo-indexer.api-devnet.umbraprivacy.com`
 *  serves raw protobuf with no published schema (200 → application/protobuf,
 *  ~390 bytes for a single UTXO). Without the .proto file the byte layout is
 *  non-trivial to decode safely. Logged as G108 — when the SDK scanner is
 *  fixed (G81) this fallback becomes unnecessary. */
export async function fetchUtxosViaIndexer(
  _indexerUrl: string,
  _umbraAddress: string,
  _opts: ScanOptions,
): Promise<RawUmbraUtxo[]> {
  throw new Error(
    "fetchUtxosViaIndexer: needs Tim discovery — the devnet indexer returns " +
      "protobuf with no published schema (G108). Stay on fetchUtxosViaSdk; if it " +
      "throws G81, the FE must surface the bug rather than silently fall through.",
  );
}

/** Selector. Tries SDK; on G81, surfaces clearly rather than secretly degrading. */
export async function fetchUtxos(
  client: any,
  indexerUrl: string,
  umbraAddress: string,
  opts: ScanOptions,
): Promise<RawUmbraUtxo[]> {
  try {
    return await fetchUtxosViaSdk(client, opts);
  } catch (err) {
    if (isG81ScannerBug(err)) {
      // The fallback isn't implemented yet (G108); re-throw with a richer
      // message so the FE knows G81 is the real culprit.
      throw new Error(
        `Umbra SDK scanner threw G81 (BigInt/number mix). Indexer fallback is ` +
          `not implemented (G108). Original error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    throw err;
  }
}

export interface UtxoConversionOpts {
  threshold: bigint;
  startTs: number;
  endTs: number;
  merkleRoot: bigint;
  employerSecret: bigint;
}

export function utxosToProofInputs(
  utxos: RawUmbraUtxo[],
  opts: UtxoConversionOpts,
): IncomeProofInputs {
  const TREE_DEPTH = 20;
  const converted: UmbraUtxoData[] = utxos.map((u) => {
    if (u.merkleProof.length !== TREE_DEPTH) {
      throw new Error(
        `utxo merkleProof length ${u.merkleProof.length} != ${TREE_DEPTH} — ` +
          "Umbra SDK indexer returned an unexpected tree depth.",
      );
    }
    return {
      amount: u.amount,
      nonce: u.nonce,
      secret: u.secret,
      timestamp: u.timestamp,
      pathElements: u.merkleProof,
      pathIndices: leafIndexToPathBits(u.leafIndex, TREE_DEPTH),
    };
  });
  return {
    utxos: converted,
    employerSecret: opts.employerSecret,
    threshold: opts.threshold,
    startTs: opts.startTs,
    endTs: opts.endTs,
    merkleRoot: opts.merkleRoot,
  };
}

function leafIndexToPathBits(leafIndex: number, depth: number): number[] {
  const bits: number[] = [];
  let i = leafIndex >>> 0;
  for (let d = 0; d < depth; d++) {
    bits.push(i & 1);
    i >>>= 1;
  }
  return bits;
}
