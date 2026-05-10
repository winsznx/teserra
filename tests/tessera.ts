// tests/tessera.ts — TESSERA Anchor program integration tests against devnet.
//
// Staged-public-inputs flow per the G97 fix:
//   1. init_proof_staging(batch_id)          → creates PublicInputBuffer PDA
//   2. append_public_inputs(batch_id, 0, 20) → first chunk
//   3. append_public_inputs(batch_id, 20, 19) → second chunk; finalizes
//   4. verify_income_proof(proof_a, proof_b, proof_c, batch_id, metadata_uri)
//      → reads from buffer, runs Groth16, processes nullifiers, mints cNFT,
//        closes buffer (rent refund).
//
// The synthetic depth-20 fixture is identical to scripts/day0/09-circuit-smoke.ts
// (real-UTXO smoke remains gated on G81).

import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, Wallet, web3 } from "@coral-xyz/anchor";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "chai";

const ROOT = join(__dirname, "..");
const KEYPAIR_PATH = join(ROOT, "scripts", "day0", ".keypair.json");
const IDL_PATH = join(ROOT, "idl", "tessera.json");
const WASM = join(ROOT, "public", "circuits", "income_proof.wasm");
const ZKEY = join(ROOT, "public", "circuits", "income_proof_final.zkey");

const TREE_PUBKEY = new PublicKey("BqYFcy1SzqNBCmbWMRrhnV768itgD2C6TUE2HhDZ7CBd");
const N = 32;
const DEPTH = 20;
const NULLIFIER_BASE = 6;  // snarkjs layout: [0]=validProof, [1]=threshold, [2]=startTs, [3]=endTs, [4]=merkleRoot, [5]=employerCommitment, [6..38)=nullifierHash, [38]=dateRangeHash

const MPL_BUBBLEGUM_ID = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
const SPL_NOOP_ID      = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");
const SPL_COMPRESSION_ID = new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");

function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function emptyArr<T>(n: number, fill: T): T[] { return new Array(n).fill(fill); }

async function buildPoseidon() {
  const cl: any = await import("circomlibjs");
  const inst = await cl.buildPoseidon();
  return (a: bigint, b: bigint): bigint => BigInt(inst.F.toObject(inst([a, b])));
}

function bigintToBytesBe32(v: bigint): Buffer {
  const out = Buffer.alloc(32);
  let x = v;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(x & 0xFFn);
    x >>= 8n;
  }
  return out;
}

interface Proof {
  proof_a: Buffer;
  proof_b: Buffer;
  proof_c: Buffer;
  proofHash: Buffer;
}

interface Fixture {
  publicSignals: bigint[];
  primary: Proof;        // for Test 2 (mint) + Test 4 (nullifier reuse)
  spares: Proof[];       // fresh proofs for negative tests so each gets a unique proof_hash → unique credential PDA
  metadataUri: string;
}

async function buildSyntheticFixture(): Promise<Fixture> {
  const snarkjs: any = (await import("snarkjs")).default ?? await import("snarkjs");
  const p = await buildPoseidon();

  const amounts = emptyArr(N, 0n);
  const isValid = emptyArr(N, 0n);
  const nonces  = emptyArr(N, 0n);
  const timestamps = emptyArr(N, 0n);
  const utxoSecrets = emptyArr(N, 0n);
  const pathElements = Array.from({ length: N }, () => emptyArr(DEPTH, 0n));
  const pathIndices  = Array.from({ length: N }, () => emptyArr(DEPTH, 0n));

  const amount = 100_000n;
  // Fresh nonce + utxoSecret per test run so the on-chain nullifier PDA is
  // unique. Without this, a successful Test 2 run leaves the nullifier
  // consumed, blocking subsequent positive runs.
  const randBytes = (n: number) => {
    const b = randomBytes(n);
    let v = 0n;
    for (const byte of b) v = (v << 8n) | BigInt(byte);
    return v;
  };
  const nonce  = randBytes(8);
  const utxoSecret = randBytes(8);
  const blockTime = 1_751_000_000n;

  amounts[0] = amount;
  isValid[0] = 1n;
  nonces[0] = nonce;
  timestamps[0] = blockTime;
  utxoSecrets[0] = utxoSecret;

  const inner = p(amount, nonce);
  const leaf  = p(inner, utxoSecret);
  let node = leaf;
  for (let d = 0; d < DEPTH; d++) node = p(node, 0n);
  const merkleRoot = node;

  const employerSecret = 0x9876543210FEDCBAn;
  const sumValid = amount;
  const threshold = 50_000n;
  const startTs = blockTime - 86_400n;
  const endTs   = blockTime + 86_400n;
  const dateRangeHash = p(startTs, endTs);
  const employerCommitment = p(employerSecret, sumValid);
  const nullifierHash = emptyArr(N, 0n);
  nullifierHash[0] = p(nonce, utxoSecret);

  const witness = {
    amounts: amounts.map(String),
    isValid: isValid.map(String),
    nonces: nonces.map(String),
    timestamps: timestamps.map(String),
    pathElements: pathElements.map(r => r.map(String)),
    pathIndices: pathIndices.map(r => r.map(String)),
    utxoSecrets: utxoSecrets.map(String),
    employerSecret: employerSecret.toString(),
    threshold: threshold.toString(),
    startTs: startTs.toString(),
    endTs: endTs.toString(),
    merkleRoot: merkleRoot.toString(),
    employerCommitment: employerCommitment.toString(),
    nullifierHash: nullifierHash.map(String),
    dateRangeHash: dateRangeHash.toString(),
  };

  // Generate 6 proofs total for the same witness. Groth16 randomises r and s,
  // so each call produces a different proof + proof_hash → unique credential
  // PDA per negative test. Without this, Anchor's `init` constraint catches
  // re-use of the credential PDA before the handler-side checks fire and the
  // tests can't observe their intended error codes.
  const BN254_P = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
  const { keccak_256 } = await import("@noble/hashes/sha3.js");

  const buildProof = async (): Promise<{ proof: Proof; publicSignals: bigint[] }> => {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(witness, WASM, ZKEY);
    const ax = BigInt(proof.pi_a[0]);
    const ay_neg = (BN254_P - (BigInt(proof.pi_a[1]) % BN254_P)) % BN254_P;
    const proof_a = Buffer.concat([bigintToBytesBe32(ax), bigintToBytesBe32(ay_neg)]);
    const proof_b = Buffer.concat([
      bigintToBytesBe32(BigInt(proof.pi_b[0][1])), bigintToBytesBe32(BigInt(proof.pi_b[0][0])),
      bigintToBytesBe32(BigInt(proof.pi_b[1][1])), bigintToBytesBe32(BigInt(proof.pi_b[1][0])),
    ]);
    const proof_c = Buffer.concat([bigintToBytesBe32(BigInt(proof.pi_c[0])), bigintToBytesBe32(BigInt(proof.pi_c[1]))]);
    const proofHash = Buffer.from(keccak_256(Buffer.concat([proof_a, proof_b, proof_c])));
    return { proof: { proof_a, proof_b, proof_c, proofHash }, publicSignals: (publicSignals as string[]).map(BigInt) };
  };

  const { proof: primary, publicSignals: ps } = await buildProof();
  const spares: Proof[] = [];
  for (let i = 0; i < 5; i++) {
    const { proof } = await buildProof();
    spares.push(proof);
  }

  return { publicSignals: ps, primary, spares, metadataUri: "https://tessera.demo/credential/day0" };
}

function signalBytes(signals: bigint[]): number[][] {
  return signals.map(v => Array.from(bigintToBytesBe32(v)));
}

const cuLog: Record<string, number[]> = {};
async function captureCu(connection: web3.Connection, sig: string, label: string) {
  await connection.confirmTransaction(sig, "confirmed");
  const tx = await connection.getTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  const cu = tx?.meta?.computeUnitsConsumed;
  if (typeof cu === "number") {
    cuLog[label] = cuLog[label] ?? [];
    cuLog[label].push(cu);
  }
}

describe("tessera", () => {
  let provider: AnchorProvider;
  let program: Program<any>;
  let admin: Keypair;
  let statePda: PublicKey;
  let fixture: Fixture;

  before(async () => {
    admin = loadKeypair(KEYPAIR_PATH);
    const wallet = new Wallet(admin);
    provider = new AnchorProvider(
      new web3.Connection("https://api.devnet.solana.com", "confirmed"),
      wallet,
      { commitment: "confirmed", preflightCommitment: "confirmed" },
    );
    anchor.setProvider(provider);

    const idl = JSON.parse(readFileSync(IDL_PATH, "utf8"));
    program = new Program(idl, provider);

    [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("tessera_state")],
      program.programId,
    );

    fixture = await buildSyntheticFixture();
  });

  after(() => {
    console.log("\nCU summary:");
    for (const [k, v] of Object.entries(cuLog)) {
      const min = Math.min(...v), max = Math.max(...v);
      console.log(`  ${k.padEnd(28)} samples=${v.length}  min=${min}  max=${max}`);
    }
  });

  function bufferPda(batchId: Buffer): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("public_input_buffer"), admin.publicKey.toBuffer(), batchId],
      program.programId,
    );
    return pda;
  }

  function credentialPdaFor(proofHash: Buffer): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("credential"), admin.publicKey.toBuffer(), proofHash],
      program.programId,
    );
    return pda;
  }
  function primaryCredentialPda(): PublicKey {
    return credentialPdaFor(fixture.primary.proofHash);
  }

  function nullifierPdas(): PublicKey[] {
    const out: PublicKey[] = [];
    for (let i = 0; i < N; i++) {
      const nh = bigintToBytesBe32(fixture.publicSignals[NULLIFIER_BASE + i]);
      if (nh.every(b => b === 0)) continue;
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nullifier"), nh],
        program.programId,
      );
      out.push(pda);
    }
    return out;
  }

  function verifyAccounts(buffer: PublicKey, credential: PublicKey) {
    const [treeAuth] = PublicKey.findProgramAddressSync(
      [TREE_PUBKEY.toBuffer()],
      MPL_BUBBLEGUM_ID,
    );
    return {
      state: statePda,
      buffer,
      credential,
      owner: admin.publicKey,
      merkleTree: TREE_PUBKEY,
      treeAuthority: treeAuth,
      logWrapper: SPL_NOOP_ID,
      compressionProgram: SPL_COMPRESSION_ID,
      bubblegumProgram: MPL_BUBBLEGUM_ID,
      systemProgram: SystemProgram.programId,
    };
  }

  async function stageSignals(signals: number[][], opts?: { partial?: number }): Promise<{ batchId: Buffer; bufferPda: PublicKey }> {
    if (signals.length !== 39) throw new Error(`expected 39 signals, got ${signals.length}`);
    const batchId = randomBytes(32);
    const bPda = bufferPda(batchId);

    const initSig = await program.methods.initProofStaging(Array.from(batchId))
      .accountsPartial({ buffer: bPda, owner: admin.publicKey, systemProgram: SystemProgram.programId })
      .rpc();
    await captureCu(provider.connection, initSig, "init_proof_staging");

    const stop = opts?.partial ?? 39;
    if (stop > 0) {
      const firstChunk = signals.slice(0, Math.min(20, stop));
      const sig1 = await program.methods.appendPublicInputs(Array.from(batchId), 0, firstChunk)
        .accountsPartial({ buffer: bPda, owner: admin.publicKey })
        .rpc();
      await captureCu(provider.connection, sig1, "append_public_inputs");
    }
    if (stop > 20) {
      const secondChunk = signals.slice(20, stop);
      const sig2 = await program.methods.appendPublicInputs(Array.from(batchId), 20, secondChunk)
        .accountsPartial({ buffer: bPda, owner: admin.publicKey })
        .rpc();
      await captureCu(provider.connection, sig2, "append_public_inputs");
    }
    return { batchId, bufferPda: bPda };
  }

  it("initializes program state", async () => {
    try {
      const sig = await program.methods.initialize()
        .accountsPartial({
          state: statePda,
          admin: admin.publicKey,
          merkleTree: TREE_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      await captureCu(provider.connection, sig, "initialize");
    } catch (e: any) {
      if (!String(e).includes("already in use")) throw e;
    }
    const state = await (program.account as any).tesseraState.fetch(statePda);
    expect(state.admin.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(state.merkleTree.toBase58()).to.equal(TREE_PUBKEY.toBase58());
  });

  it("verifies a valid proof and mints credential", async () => {
    const { batchId, bufferPda: bPda } = await stageSignals(signalBytes(fixture.publicSignals));
    const credential = primaryCredentialPda();

    const sig = await program.methods.verifyIncomeProof(
      Array.from(fixture.primary.proof_a),
      Array.from(fixture.primary.proof_b),
      Array.from(fixture.primary.proof_c),
      Array.from(batchId),
      fixture.metadataUri,
    )
      .accountsPartial(verifyAccounts(bPda, credential))
      .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 })])
      .remainingAccounts(nullifierPdas().map(p => ({ pubkey: p, isSigner: false, isWritable: true })))
      .rpc({ commitment: "confirmed" });
    await captureCu(provider.connection, sig, "verify_income_proof");

    const cred = await (program.account as any).credential.fetch(credential);
    expect(cred.owner.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(cred.threshold.toString()).to.equal("50000");
    expect(cred.cnftAssetId).to.not.be.undefined;

    const state = await (program.account as any).tesseraState.fetch(statePda);
    expect(state.totalCredentialsIssued.toNumber()).to.be.greaterThan(0);
  });

  it("rejects forged amount proof", async () => {
    const proof = fixture.spares[0];
    const tampered = signalBytes(fixture.publicSignals);
    tampered[1][31] = (tampered[1][31] ?? 0) ^ 1;     // flip threshold byte
    const { batchId, bufferPda: bPda } = await stageSignals(tampered);
    let threw = false;
    try {
      await program.methods.verifyIncomeProof(
        Array.from(proof.proof_a), Array.from(proof.proof_b), Array.from(proof.proof_c),
        Array.from(batchId), fixture.metadataUri,
      )
        .accountsPartial(verifyAccounts(bPda, credentialPdaFor(proof.proofHash)))
        .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 })])
        .remainingAccounts(nullifierPdas().map(p => ({ pubkey: p, isSigner: false, isWritable: true })))
        .rpc();
    } catch (e: any) {
      threw = /ProofVerificationFailed|0x1770/.test(String(e));
    }
    expect(threw).to.equal(true);
  });

  it("rejects nullifier reuse", async () => {
    // Reuse the SAME proof as Test 2 → same credential PDA → either
    // CredentialAlreadyExists ("already in use") or NullifierAlreadyConsumed
    // depending on which init constraint fires first.
    const { batchId, bufferPda: bPda } = await stageSignals(signalBytes(fixture.publicSignals));
    let threw = false;
    try {
      await program.methods.verifyIncomeProof(
        Array.from(fixture.primary.proof_a), Array.from(fixture.primary.proof_b), Array.from(fixture.primary.proof_c),
        Array.from(batchId), fixture.metadataUri,
      )
        .accountsPartial(verifyAccounts(bPda, primaryCredentialPda()))
        .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 })])
        .remainingAccounts(nullifierPdas().map(p => ({ pubkey: p, isSigner: false, isWritable: true })))
        .rpc();
    } catch (e: any) {
      threw = /NullifierAlreadyConsumed|CredentialAlreadyExists|already in use|0x1772|0x1773/.test(String(e));
    }
    expect(threw).to.equal(true);
  });

  it("rejects validProof != 1", async () => {
    const proof = fixture.spares[1];
    const tampered = signalBytes(fixture.publicSignals);
    tampered[0] = Array.from(Buffer.alloc(32, 0));   // signal[0] = validProof — zero
    const { batchId, bufferPda: bPda } = await stageSignals(tampered);
    let threw = false;
    try {
      await program.methods.verifyIncomeProof(
        Array.from(proof.proof_a), Array.from(proof.proof_b), Array.from(proof.proof_c),
        Array.from(batchId), fixture.metadataUri,
      )
        .accountsPartial(verifyAccounts(bPda, credentialPdaFor(proof.proofHash)))
        .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 })])
        .remainingAccounts(nullifierPdas().map(p => ({ pubkey: p, isSigner: false, isWritable: true })))
        .rpc();
    } catch (e: any) {
      threw = /InvalidProofSignal|ProofVerificationFailed|0x1774|0x1770/.test(String(e));
    }
    expect(threw).to.equal(true);
  });

  it("rejects startTs >= endTs", async () => {
    const proof = fixture.spares[2];
    const tampered = signalBytes(fixture.publicSignals);
    [tampered[2], tampered[3]] = [tampered[3], tampered[2]];   // swap startTs / endTs
    const { batchId, bufferPda: bPda } = await stageSignals(tampered);
    let threw = false;
    try {
      await program.methods.verifyIncomeProof(
        Array.from(proof.proof_a), Array.from(proof.proof_b), Array.from(proof.proof_c),
        Array.from(batchId), fixture.metadataUri,
      )
        .accountsPartial(verifyAccounts(bPda, credentialPdaFor(proof.proofHash)))
        .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 })])
        .remainingAccounts(nullifierPdas().map(p => ({ pubkey: p, isSigner: false, isWritable: true })))
        .rpc();
    } catch (e: any) {
      threw = /InvalidDateRange|ProofVerificationFailed|0x1775|0x1770/.test(String(e));
    }
    expect(threw).to.equal(true);
  });

  it("verify_credential returns valid for fresh credential above threshold", async () => {
    const sigOut = await program.methods.verifyCredential(new BN(50_000))
      .accounts({ credential: primaryCredentialPda() })
      .view();
    expect((sigOut as any).valid).to.equal(true);
    expect((sigOut as any).reason).to.equal(0);
  });

  it("verify_credential returns invalid below threshold", async () => {
    const out: any = await program.methods.verifyCredential(new BN(10_000_000))
      .accounts({ credential: primaryCredentialPda() })
      .view();
    expect(out.valid).to.equal(false);
    expect(out.reason).to.equal(2);
  });

  it("rejects malformed metadata_uri (transaction-level revert)", async () => {
    const proof = fixture.spares[3];
    const { batchId, bufferPda: bPda } = await stageSignals(signalBytes(fixture.publicSignals));
    const longUri = "x".repeat(220);
    let threw = false;
    try {
      await program.methods.verifyIncomeProof(
        Array.from(proof.proof_a), Array.from(proof.proof_b), Array.from(proof.proof_c),
        Array.from(batchId), longUri,
      )
        .accountsPartial(verifyAccounts(bPda, credentialPdaFor(proof.proofHash)))
        .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 })])
        .remainingAccounts(nullifierPdas().map(p => ({ pubkey: p, isSigner: false, isWritable: true })))
        .rpc();
    } catch (e: any) {
      threw = /InvalidPublicInput|0x1779/.test(String(e));
    }
    expect(threw).to.equal(true);
  });

  it("rejects verify when buffer is not finalized", async () => {
    const proof = fixture.spares[4];
    const { batchId, bufferPda: bPda } = await stageSignals(signalBytes(fixture.publicSignals), { partial: 30 });
    let threw = false;
    try {
      await program.methods.verifyIncomeProof(
        Array.from(proof.proof_a), Array.from(proof.proof_b), Array.from(proof.proof_c),
        Array.from(batchId), fixture.metadataUri,
      )
        .accountsPartial(verifyAccounts(bPda, credentialPdaFor(proof.proofHash)))
        .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 })])
        .remainingAccounts(nullifierPdas().map(p => ({ pubkey: p, isSigner: false, isWritable: true })))
        .rpc();
    } catch (e: any) {
      threw = /BufferNotFinalized|BufferCountMismatch|0x177c|0x177d/.test(String(e));
    }
    expect(threw).to.equal(true);
  });
});
