// Diagnostic for the isRegistered detection bug in components/umbra-provider.tsx.
//
// Reproduces the buggy call shape (querier() with no address arg + Boolean(account)
// success gate) side-by-side with the correct shape from 02-register.ts (querier(addr)
// + state === "exists" + non-zero x25519PublicKey check).
//
// Day 0 keypair must already be registered on-chain — this is a detection
// regression check, NOT a registration test. If the keypair is unregistered the
// CORRECT path returns false too; in that case re-run 02-register.ts first.

import { logResult, shortError, envKeypair, loadKeypairBytes, makeClient } from "./_lib.ts";

const ID = "12-isregistered-check";

async function main() {
  const t0 = Date.now();
  const kpPath = envKeypair();
  if (!kpPath) {
    return logResult({ id: ID, status: "BLOCKED", detail: "No keypair", needsTim: "Set TESSERA_DAY0_KEYPAIR or generate scripts/day0/.keypair.json" });
  }
  let secret: Uint8Array;
  try {
    secret = loadKeypairBytes(kpPath);
  } catch (e) {
    return logResult({ id: ID, status: "FAIL", detail: `Could not read keypair at ${kpPath}`, error: shortError(e) });
  }

  const { sdk, client, signer } = await makeClient(secret);
  const addr = String(signer.address);

  // ── Buggy shape (what umbra-provider.tsx ships today) ─────────────────
  let buggyResult: { ok: boolean; raw: unknown; threw: string | null } = {
    ok: false,
    raw: null,
    threw: null,
  };
  try {
    const querier = sdk.getUserAccountQuerierFunction({ client });
    const account = await querier();
    buggyResult = { ok: Boolean(account), raw: redactBuf(account), threw: null };
  } catch (e) {
    buggyResult = { ok: false, raw: null, threw: shortError(e) };
  }

  // ── Correct shape (Day 0 02-register.ts pattern) ──────────────────────
  let correctResult: {
    ok: boolean;
    state: string | null;
    x25519AllZero: boolean | null;
    x25519Hex: string | null;
    threw: string | null;
  } = { ok: false, state: null, x25519AllZero: null, x25519Hex: null, threw: null };
  try {
    const querier = sdk.getUserAccountQuerierFunction({ client });
    const account: any = await querier(addr);
    const state = account?.state ?? null;
    const buf: Uint8Array | undefined = account?.data?.x25519PublicKey ?? account?.x25519PublicKey;
    const allZero = buf instanceof Uint8Array ? buf.every((b) => b === 0) : null;
    const hex = buf instanceof Uint8Array ? Buffer.from(buf).toString("hex") : null;
    const ok = state === "exists" && allZero === false;
    correctResult = {
      ok,
      state,
      x25519AllZero: allZero,
      x25519Hex: hex,
      threw: null,
    };
  } catch (e) {
    correctResult = {
      ok: false,
      state: null,
      x25519AllZero: null,
      x25519Hex: null,
      threw: shortError(e),
    };
  }

  // The bug is confirmed iff the buggy shape says "registered=false" while the
  // correct shape says "registered=true". Either way, we log both and the
  // human reads the diff.
  const detection = {
    buggy: buggyResult.ok,
    correct: correctResult.ok,
    bugReproduced: buggyResult.ok !== correctResult.ok,
  };

  return logResult({
    id: ID,
    status: detection.bugReproduced ? "PASS" : "BLOCKED",
    detail: detection.bugReproduced
      ? `bug reproduced: buggy=${buggyResult.ok} vs correct=${correctResult.ok}`
      : `bug NOT reproduced: buggy=${buggyResult.ok} == correct=${correctResult.ok} — keypair may not be registered yet, run 02-register first`,
    data: {
      durationMs: Date.now() - t0,
      signerAddress: addr,
      buggy: buggyResult,
      correct: correctResult,
    },
  });
}

function redactBuf(x: unknown): unknown {
  if (x instanceof Uint8Array) return `<bytes:${x.length}>`;
  if (Array.isArray(x)) return x.map(redactBuf);
  if (x && typeof x === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) out[k] = redactBuf(v);
    return out;
  }
  return x;
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
