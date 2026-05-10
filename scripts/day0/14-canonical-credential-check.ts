// Confirms the canonical demo credential PDA loads via the same path that
// app/credential/[address]/page.tsx server-renders. Stand-in for the
// "open localhost:3000/credential/<pda>" smoke step in environments without
// a browser.

import { logResult, shortError } from "./_lib.ts";
import { fetchCredentialByPda } from "../../lib/anchor.ts";
import {
  Connection as Conn,
  PublicKey as Pk,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import idl from "../../idl/tessera.json" with { type: "json" };

const ID = "14-canonical-credential-check";
const PDA = "BPSRtkvuqKpuaK1mSY3LgqtcZqupzz8FZdQ1GrKvDaFz";

async function main() {
  process.env.NEXT_PUBLIC_PROGRAM_ID =
    process.env.NEXT_PUBLIC_PROGRAM_ID ?? "9jCxFKjcwt7uYZtPwfEh2gPt7BdKxW6qEwuwbFStWCKd";
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

  const conn = new Conn(rpc, "confirmed");
  const noSign = (async () => {
    throw new Error("read-only");
  }) as <T extends Transaction | VersionedTransaction>(t: T) => Promise<T>;
  const wallet = {
    publicKey: new Pk("11111111111111111111111111111111"),
    signTransaction: noSign,
    signAllTransactions: (async () => {
      throw new Error("read-only");
    }) as <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>,
  };
  const provider = new AnchorProvider(conn, wallet, { commitment: "confirmed" });
  const program = new Program(idl as unknown as Idl, provider) as unknown as Program<Idl>;

  let cred;
  try {
    cred = await fetchCredentialByPda(program, new Pk(PDA));
  } catch (e) {
    return logResult({ id: ID, status: "FAIL", detail: "fetchCredentialByPda threw", error: shortError(e) });
  }
  if (!cred) {
    return logResult({ id: ID, status: "FAIL", detail: `no credential at ${PDA}` });
  }

  return logResult({
    id: ID,
    status: "PASS",
    detail: `canonical credential renders: threshold=${cred.threshold} startTs=${cred.startTs} endTs=${cred.endTs} valid=${cred.incomeAboveThreshold}`,
    data: {
      pda: PDA,
      threshold: cred.threshold.toString(),
      startTs: cred.startTs.toString(),
      endTs: cred.endTs.toString(),
      issuedAt: cred.issuedAt.toString(),
      expiresAt: cred.expiresAt.toString(),
      issuer: cred.issuer.toBase58(),
      incomeAboveThreshold: cred.incomeAboveThreshold,
      proofHashHexPrefix: Array.from(cred.proofHash.slice(0, 4))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    },
  });
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
