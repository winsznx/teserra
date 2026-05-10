import { describe, expect, it } from "vitest";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

import { buildIncomeWitness } from "../../lib/witness";
import { generateIncomeProof } from "../../lib/proof";
import {
  deriveCredentialPda,
  fetchCredentialByPda,
  getProgram,
  mintCredential,
  verifyCredential,
} from "../../lib/anchor";

const ROOT = join(__dirname, "..", "..");
const WASM = join(ROOT, "public", "circuits", "income_proof.wasm");
const ZKEY = join(ROOT, "public", "circuits", "income_proof_final.zkey");
const KEYPAIR_PATH = join(ROOT, "scripts", "day0", ".keypair.json");
const TREE = new PublicKey("BqYFcy1SzqNBCmbWMRrhnV768itgD2C6TUE2HhDZ7CBd");
const TREE_DEPTH = 20;

function loadKeypair(): Keypair {
  const raw = JSON.parse(readFileSync(KEYPAIR_PATH, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function freshSyntheticInputs() {
  const randBig = (n: number) => {
    const b = randomBytes(n);
    let v = 0n;
    for (const byte of b) v = (v << 8n) | BigInt(byte);
    return v;
  };
  const u = {
    amount: 100_000n,
    nonce: randBig(8),
    secret: randBig(8),
    timestamp: 1_751_000_000,
    pathElements: new Array<bigint>(TREE_DEPTH).fill(0n),
    pathIndices: new Array<number>(TREE_DEPTH).fill(0),
  };
  const { poseidon2 } = require("poseidon-lite");
  const inner = poseidon2([u.amount, u.nonce]);
  const leaf = poseidon2([inner, u.secret]);
  let node = leaf;
  for (let d = 0; d < TREE_DEPTH; d++) node = poseidon2([node, 0n]);
  return {
    utxos: [u],
    employerSecret: 0x9876543210FEDCBAn,
    threshold: 50_000n,
    startTs: u.timestamp - 86_400,
    endTs: u.timestamp + 86_400,
    merkleRoot: node,
  };
}

describe("end-to-end: mintCredential against live devnet", () => {
  it(
    "stages, verifies, mints, and reads back the credential",
    async () => {
      const kp = loadKeypair();
      const conn = new Connection("https://api.devnet.solana.com", "confirmed");
      const program = getProgram(conn, new Wallet(kp));

      const witness = buildIncomeWitness(freshSyntheticInputs());
      const proofResult = await generateIncomeProof({ witness, wasmPath: WASM, zkeyPath: ZKEY });

      const stages: string[] = [];
      const result = await mintCredential({
        program,
        owner: kp.publicKey,
        proof: proofResult.proof,
        publicSignals: proofResult.publicSignals,
        metadataUri: "https://tessera.demo/credential/lib-e2e",
        merkleTree: TREE,
        onProgress: (s) => stages.push(s),
      });

      expect(stages).toContain("staging-init");
      expect(stages).toContain("staging-append-1");
      expect(stages).toContain("staging-append-2");
      expect(stages).toContain("verifying");
      expect(stages).toContain("complete");

      expect(result.txSignatures.init.length).toBeGreaterThan(40);
      expect(result.txSignatures.append1.length).toBeGreaterThan(40);
      expect(result.txSignatures.append2.length).toBeGreaterThan(40);
      expect(result.txSignatures.verify.length).toBeGreaterThan(40);

      const credential = await fetchCredentialByPda(program, result.credentialPda);
      expect(credential).not.toBeNull();
      expect(credential!.owner.toBase58()).toBe(kp.publicKey.toBase58());
      expect(credential!.threshold).toBe(50_000n);

      const above = await verifyCredential(program, result.credentialPda, 50_000n);
      expect(above.valid).toBe(true);
      expect(above.reason).toBe(0);

      const below = await verifyCredential(program, result.credentialPda, 10_000_000n);
      expect(below.valid).toBe(false);
      expect(below.reason).toBe(2);

      console.log(`E2E credential PDA: ${result.credentialPda.toBase58()}`);
      console.log(`E2E verify tx:      ${result.txSignatures.verify}`);
    },
    600_000,
  );
});
