"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Circle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { poseidon2 } from "poseidon-lite";
import { keccak_256 } from "@noble/hashes/sha3.js";

import { Button } from "@/components/ui/button";
import { ProgressWithStatus } from "@/components/progress-with-status";
import { useUmbra } from "@/hooks/use-umbra";
import { buildIncomeWitness, WitnessValidationError } from "@/lib/witness";
import { generateIncomeProof } from "@/lib/proof";
import {
  getProgram,
  fetchTesseraState,
  mintCredential,
  MintCredentialError,
  type MintStage,
} from "@/lib/anchor";
import { utxosToProofInputs } from "@/lib/umbra-witness";

import {
  VISIBLE_STAGES,
  mintStageToVisible,
  type ProofConfig,
  type ProveResult,
  type VisibleStage,
} from "./types";

interface EmployeeProveProps {
  config: ProofConfig;
  onComplete: (result: ProveResult) => void;
  onError: (err: Error) => void;
}

type StageStatus = "pending" | "active" | "done";

interface StageState {
  status: StageStatus;
  durationMs?: number;
}

const TREE_DEPTH = 20;

function poseidon(a: bigint, b: bigint): bigint {
  return poseidon2([a, b]);
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

function deriveRootFromUtxo(u: {
  amount: bigint;
  nonce: bigint;
  secret: bigint;
  leafIndex: number;
  merkleProof: bigint[];
}): bigint {
  if (u.merkleProof.length !== TREE_DEPTH) {
    throw new Error(`merkleProof length ${u.merkleProof.length} != ${TREE_DEPTH}`);
  }
  // Same Poseidon commitment scheme as the v2 circuit fixtures: leaf =
  // P(P(amount, nonce), secret). If the SDK ships a different leaf hash for
  // real UTXOs, snarkjs.fullProve will reject the witness and we surface a
  // "proof generation failed" toast — which is the correct behavior because
  // the witness genuinely fails the circuit's Merkle constraint.
  const inner = poseidon(u.amount, u.nonce);
  let node = poseidon(inner, u.secret);
  const bits = leafIndexToPathBits(u.leafIndex, TREE_DEPTH);
  for (let d = 0; d < TREE_DEPTH; d++) {
    const sibling = u.merkleProof[d];
    node = bits[d] === 0 ? poseidon(node, sibling) : poseidon(sibling, node);
  }
  return node;
}

function consistentRoot(
  utxos: ProofConfig["filteredUtxos"],
): { root: bigint } | { mismatch: true } {
  if (utxos.length === 0) throw new Error("filteredUtxos is empty");
  const first = deriveRootFromUtxo(utxos[0]);
  for (let i = 1; i < utxos.length; i++) {
    const r = deriveRootFromUtxo(utxos[i]);
    if (r !== first) return { mismatch: true };
  }
  return { root: first };
}

function freshEmployerSecret(): bigint {
  const bytes = new Uint8Array(31);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let v = BigInt(0);
  for (const b of bytes) v = (v << BigInt(8)) | BigInt(b);
  return v;
}

function metadataUriFor(owner: string, proofHash: Uint8Array): string {
  const hex = Array.from(proofHash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Resolves through `/api/credential/[address]/metadata` — same Vercel
  // deployment, no external dependency. The slug `${owner}-${hex}` is
  // stable + deterministic from the credential's identity.
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://tessera.demo";
  return `${origin}/api/credential/${owner}-${hex}/metadata`;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function describeMintError(err: unknown): { title: string; toast: string } {
  if (err instanceof MintCredentialError) {
    switch (err.stage) {
      case "staging-init":
        return { title: "Verification didn't start", toast: "Couldn't start verification. Retry." };
      case "staging-append-1":
        return { title: "Verification step 2/4 failed", toast: "Verification step 2/4 failed. Retry." };
      case "staging-append-2":
        return { title: "Verification step 3/4 failed", toast: "Verification step 3/4 failed. Retry." };
      case "verifying":
        return { title: "Proof rejected on-chain", toast: "Proof rejected on-chain. Regenerate from a fresh scan." };
      case "complete":
        return { title: "Mint failed", toast: "Credential mint failed. Your proof is valid — retry." };
    }
  }
  if (err instanceof WitnessValidationError) {
    return { title: "Witness validation failed", toast: err.message };
  }
  if (err instanceof Error && /User rejected/i.test(err.message)) {
    return { title: "Cancelled", toast: "Transaction cancelled." };
  }
  return { title: "Proof generation failed", toast: "Proof generation failed. Refresh and try again." };
}

export function EmployeeProve({ config, onComplete, onError }: EmployeeProveProps) {
  const { state: umbraState } = useUmbra();
  const [stages, setStages] = React.useState<Record<VisibleStage, StageState>>({
    decrypting: { status: "done", durationMs: 0 },
    "building-witness": { status: "pending" },
    "generating-proof": { status: "pending" },
    "verifying-onchain": { status: "pending" },
    "minting-credential": { status: "pending" },
  });
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);

  const setStage = React.useCallback(
    (id: VisibleStage, patch: Partial<StageState>) => {
      setStages((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    },
    [],
  );

  const advance = React.useCallback(
    (id: VisibleStage, durationMs: number) => {
      setStages((prev) => ({ ...prev, [id]: { status: "done", durationMs } }));
    },
    [],
  );

  const run = React.useCallback(async () => {
    if (umbraState.phase !== "ready") {
      onError(new Error("UmbraProvider not ready"));
      return;
    }
    setRunning(true);
    setErrorMessage(null);

    const { anchorWallet, connection, publicKey } = umbraState;

    try {
      // ── 2. Building witness ─────────────────────────────────────────
      setStage("building-witness", { status: "active" });
      const t0 = performance.now();

      const rootOrMismatch = consistentRoot(config.filteredUtxos);
      if ("mismatch" in rootOrMismatch) {
        throw new Error("Pool state changed during scan, please retry");
      }
      const employerSecret = freshEmployerSecret();
      const proofInputs = utxosToProofInputs(config.filteredUtxos, {
        threshold: config.threshold,
        startTs: config.startTs,
        endTs: config.endTs,
        merkleRoot: rootOrMismatch.root,
        employerSecret,
      });
      const witness = buildIncomeWitness(proofInputs);
      const witnessMs = Math.round(performance.now() - t0);
      advance("building-witness", witnessMs);

      // ── 3. Generating ZK proof ──────────────────────────────────────
      setStage("generating-proof", { status: "active" });
      const t1 = performance.now();
      const { proof, publicSignals, generationMs } = await generateIncomeProof({
        witness,
        wasmPath: "/circuits/income_proof.wasm",
        zkeyPath: "/circuits/income_proof_final.zkey",
      });
      advance("generating-proof", generationMs ?? Math.round(performance.now() - t1));

      // ── 4 + 5. Verifying on-chain + Minting credential ──────────────
      setStage("verifying-onchain", { status: "active" });
      const t2 = performance.now();

      const program = getProgram(connection, anchorWallet);
      const state = await fetchTesseraState(program);
      if (!state) {
        throw new Error("Tessera program is not initialized on this network");
      }
      const merkleTree = state.merkleTree;

      const proofHash = keccak_256(
        new Uint8Array([...proof.a, ...proof.b, ...proof.c]),
      );

      const result = await mintCredential({
        program,
        owner: publicKey,
        proof,
        publicSignals,
        metadataUri: metadataUriFor(publicKey.toBase58(), proofHash),
        merkleTree,
        onProgress: (stage: MintStage) => {
          const visible = mintStageToVisible(stage);
          if (visible === "verifying-onchain" && stage !== "verifying") {
            setStage("verifying-onchain", { status: "active" });
          }
          if (stage === "verifying") {
            setStage("verifying-onchain", { status: "active" });
          }
          if (stage === "complete") {
            advance("verifying-onchain", Math.round(performance.now() - t2));
            setStage("minting-credential", { status: "active" });
          }
        },
      });

      advance("minting-credential", Math.round(performance.now() - t2));

      onComplete({
        credentialPda: result.credentialPda,
        cnftAssetId: result.cnftAssetId,
        proofHashHex: bytesToHex(proofHash),
        generationMs: generationMs ?? 0,
        verifyTxSig: result.txSignatures.verify,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const desc = describeMintError(err);
      toast.error(desc.toast);
      setErrorMessage(desc.title);
      onError(err);
    } finally {
      setRunning(false);
    }
  }, [umbraState, config, setStage, advance, onComplete, onError]);

  React.useEffect(() => {
    if (!running && !errorMessage) {
      void run();
    }
    // run is intentionally fire-and-forget on first mount only; we re-trigger
    // via the explicit Retry button rather than a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedCount = VISIBLE_STAGES.filter((s) => stages[s.id].status === "done").length;
  const progressPct = (completedCount / VISIBLE_STAGES.length) * 100;
  const activeStage = VISIBLE_STAGES.find((s) => stages[s.id].status === "active");

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-8 w-full"
    >
      <div className="flex flex-col gap-2 text-center items-center">
        <h3 className="text-h3 font-display">Generating your proof...</h3>
        <p className="text-body-sm text-text-secondary">
          Generating in your browser. Your data never leaves your device.
          (~20–30 seconds)
        </p>
      </div>

      <ProgressWithStatus
        progress={progressPct}
        status={activeStage?.label ?? (errorMessage ? errorMessage : "Ready")}
        subStatus=""
        className="max-w-xl mx-auto"
      />

      <div className="flex flex-col gap-3 mt-2 w-full max-w-xl mx-auto">
        {VISIBLE_STAGES.map((stage, idx) => {
          const s = stages[stage.id];
          return (
            <AnimatePresence key={stage.id}>
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
                className="flex items-center justify-between p-4 bg-bg-surface/40 border border-border-subtle rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 flex items-center justify-center" aria-hidden="true">
                    {s.status === "done" ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : s.status === "active" ? (
                      <Loader2 className="w-4 h-4 text-cipher animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {idx + 1}. {stage.label}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-mono text-text-muted">
                  {s.status === "done" && s.durationMs != null
                    ? `${s.durationMs.toLocaleString()}ms`
                    : s.status === "active"
                    ? "(running)"
                    : ""}
                </div>
              </motion.div>
            </AnimatePresence>
          );
        })}
      </div>

      {errorMessage ? (
        <div className="max-w-xl mx-auto w-full p-4 bg-error/5 border border-error/30 rounded-md flex gap-4 items-start">
          <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex flex-col gap-3">
            <p className="text-sm text-error">{errorMessage}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setErrorMessage(null);
                setStages((prev) => ({
                  ...prev,
                  "building-witness": { status: "pending" },
                  "generating-proof": { status: "pending" },
                  "verifying-onchain": { status: "pending" },
                  "minting-credential": { status: "pending" },
                }));
                void run();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
