import { describe, expect, it } from "vitest";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  deriveBufferPda,
  deriveCredentialPda,
  deriveNullifierPda,
  deriveStatePda,
  deriveTreeAuthorityPda,
  fetchTesseraState,
  getProgram,
  MPL_BUBBLEGUM_ID,
} from "../../lib/anchor";

const PROGRAM_ID = new PublicKey("9jCxFKjcwt7uYZtPwfEh2gPt7BdKxW6qEwuwbFStWCKd");
const TREE = new PublicKey("BqYFcy1SzqNBCmbWMRrhnV768itgD2C6TUE2HhDZ7CBd");
const KEYPAIR_PATH = join(__dirname, "..", "..", "scripts", "day0", ".keypair.json");

function loadKeypair(): Keypair {
  const raw = JSON.parse(readFileSync(KEYPAIR_PATH, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

describe("PDA derivations", () => {
  const owner = loadKeypair().publicKey;

  it("deriveStatePda matches the test-suite fixture", () => {
    const [pda] = deriveStatePda(PROGRAM_ID);
    const [expected] = PublicKey.findProgramAddressSync([Buffer.from("tessera_state")], PROGRAM_ID);
    expect(pda.toBase58()).toBe(expected.toBase58());
  });

  it("deriveCredentialPda matches the test-suite derivation", () => {
    const proofHash = new Uint8Array(32).fill(0xAB);
    const [pda] = deriveCredentialPda(owner, proofHash, PROGRAM_ID);
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from("credential"), owner.toBuffer(), Buffer.from(proofHash)],
      PROGRAM_ID,
    );
    expect(pda.toBase58()).toBe(expected.toBase58());
  });

  it("deriveBufferPda is owner+batch_id keyed", () => {
    const batchId = new Uint8Array(32).fill(0x42);
    const [pda] = deriveBufferPda(owner, batchId, PROGRAM_ID);
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from("public_input_buffer"), owner.toBuffer(), Buffer.from(batchId)],
      PROGRAM_ID,
    );
    expect(pda.toBase58()).toBe(expected.toBase58());
  });

  it("deriveNullifierPda is hash-keyed", () => {
    const nh = new Uint8Array(32).fill(0x77);
    const [pda] = deriveNullifierPda(nh, PROGRAM_ID);
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(nh)],
      PROGRAM_ID,
    );
    expect(pda.toBase58()).toBe(expected.toBase58());
  });

  it("deriveTreeAuthorityPda matches the Bubblegum convention", () => {
    const [pda] = deriveTreeAuthorityPda(TREE);
    const [expected] = PublicKey.findProgramAddressSync([TREE.toBuffer()], MPL_BUBBLEGUM_ID);
    expect(pda.toBase58()).toBe(expected.toBase58());
    // Reference value from on-chain pre-flight in last session's REPORT.md.
    expect(pda.toBase58()).toBe("8UPRUu8j6BF7YFcoHUrHA5PJfcJWkUPZz8tqAcLzZ2Pm");
  });

  it("rejects wrong-size proofHash / batchId / nullifier", () => {
    expect(() => deriveCredentialPda(owner, new Uint8Array(31), PROGRAM_ID)).toThrow();
    expect(() => deriveBufferPda(owner, new Uint8Array(33), PROGRAM_ID)).toThrow();
    expect(() => deriveNullifierPda(new Uint8Array(0), PROGRAM_ID)).toThrow();
  });
});

describe("fetchTesseraState (live devnet)", () => {
  it("returns the on-chain state for the deployed program", async () => {
    const conn = new Connection("https://api.devnet.solana.com", "confirmed");
    const program = getProgram(conn, new Wallet(loadKeypair()));
    const state = await fetchTesseraState(program);
    expect(state).not.toBeNull();
    expect(state!.merkleTree.toBase58()).toBe(TREE.toBase58());
    expect(state!.totalCredentialsIssued).toBeGreaterThanOrEqual(1n);
  });
});
