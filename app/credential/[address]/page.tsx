import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider, BN, Program, type Idl } from "@coral-xyz/anchor";

import idlJson from "../../../idl/tessera.json" with { type: "json" };
import { NEXT_PUBLIC_SOLANA_RPC } from "@/lib/constants";
import {
  fetchCredentialByPda,
  type CredentialAccount,
} from "@/lib/anchor";
import {
  CredentialViewerContent,
  type CredentialWire,
} from "@/components/credential-viewer-content";

// Read-only AnchorProvider stub. `program.account.credential.all` and
// `fetchCredentialByPda` only need a Connection — they never sign — so we
// supply throwing sign methods. AnchorProvider's constructor still wants
// publicKey on the wallet, so we use a deterministic placeholder.
const READ_ONLY_PUBKEY = new PublicKey("11111111111111111111111111111111");

const noSign = async <T,>(_t: T): Promise<T> => {
  throw new Error("CredentialPage: read-only provider cannot sign");
};

function readOnlyProgram(connection: Connection): Program<Idl> {
  const wallet = {
    publicKey: READ_ONLY_PUBKEY,
    signTransaction: noSign as <T extends Transaction | VersionedTransaction>(t: T) => Promise<T>,
    signAllTransactions: (async <T,>(_txs: T[]) => {
      throw new Error("CredentialPage: read-only provider cannot sign");
    }) as <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>,
  };
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const idl = idlJson as unknown as Idl;
  return new Program(idl, provider) as unknown as Program<Idl>;
}

interface PdaLookup {
  credential: CredentialAccount;
  credentialPda: PublicKey;
}

async function lookupCredential(
  paramAddress: string,
): Promise<PdaLookup | null> {
  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(paramAddress);
  } catch {
    return null;
  }

  const connection = new Connection(NEXT_PUBLIC_SOLANA_RPC, "confirmed");
  const program = readOnlyProgram(connection);

  // Path A: param is a credential PDA directly.
  const direct = await fetchCredentialByPda(program, pubkey);
  if (direct) return { credential: direct, credentialPda: pubkey };

  // Path B: param is an owner wallet — find their credentials and pick the
  // most recently issued one. The owner field starts at offset 8 (after the
  // Anchor 8-byte discriminator).
  try {
    const all = await (program.account as unknown as {
      credential: {
        all: (filters: { memcmp: { offset: number; bytes: string } }[]) => Promise<
          { publicKey: PublicKey; account: Record<string, unknown> }[]
        >;
      };
    }).credential.all([{ memcmp: { offset: 8, bytes: pubkey.toBase58() } }]);
    if (all.length === 0) return null;
    const decoded = all.map(({ publicKey: pda, account }) => ({
      pda,
      credential: shapeCredential(account),
    }));
    decoded.sort(
      (a, b) => Number(b.credential.issuedAt) - Number(a.credential.issuedAt),
    );
    const top = decoded[0];
    return { credential: top.credential, credentialPda: top.pda };
  } catch {
    return null;
  }
}

function shapeCredential(raw: Record<string, unknown>): CredentialAccount {
  const r = raw as Record<string, unknown>;
  const toBig = (x: unknown): bigint => {
    if (typeof x === "bigint") return x;
    if (typeof x === "number") return BigInt(x);
    if (x instanceof BN) return BigInt((x as BN).toString());
    return BigInt(String(x));
  };
  const toBytes = (x: unknown): Uint8Array =>
    x instanceof Uint8Array ? x : Uint8Array.from(x as number[]);
  return {
    owner: new PublicKey(r.owner as PublicKey),
    incomeAboveThreshold: Boolean(r.incomeAboveThreshold),
    threshold: toBig(r.threshold),
    startTs: toBig(r.startTs),
    endTs: toBig(r.endTs),
    dateRangeHash: toBytes(r.dateRangeHash),
    merkleRoot: toBytes(r.merkleRoot),
    employerCommitment: toBytes(r.employerCommitment),
    proofHash: toBytes(r.proofHash),
    nullifierHashes: (r.nullifierHashes as Array<number[] | Uint8Array>).map(toBytes),
    issuedAt: toBig(r.issuedAt),
    expiresAt: toBig(r.expiresAt),
    issuer: new PublicKey(r.issuer as PublicKey),
    cnftAssetId: new PublicKey(r.cnftAssetId as PublicKey),
    bump: Number(r.bump),
  };
}

function toWire(c: CredentialAccount): CredentialWire {
  // Strip class instances (PublicKey, Uint8Array) into JSON-safe primitives
  // so React's RSC serialization preserves what the client component reads.
  return {
    threshold: c.threshold,
    startTs: c.startTs,
    endTs: c.endTs,
    issuedAt: c.issuedAt,
    expiresAt: c.expiresAt,
    incomeAboveThreshold: c.incomeAboveThreshold,
    employerCommitment: Array.from(c.employerCommitment),
    proofHash: Array.from(c.proofHash),
    issuer: c.issuer.toBase58(),
    ownerBase58: c.owner.toBase58(),
  };
}

export default async function CredentialPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const lookup = await lookupCredential(address);
  return (
    <CredentialViewerContent
      paramAddress={address}
      credential={lookup ? toWire(lookup.credential) : null}
      credentialPdaBase58={lookup?.credentialPda.toBase58() ?? null}
    />
  );
}

export const dynamic = "force-dynamic";
