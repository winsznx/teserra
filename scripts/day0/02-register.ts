import { logResult, shortError, envKeypair, loadKeypairBytes, makeClient } from "./_lib.ts";

const ID = "02-register";

async function main() {
  const t0 = Date.now();
  const kpPath = envKeypair();
  if (!kpPath) {
    return logResult({ id: ID, status: "BLOCKED", detail: "No keypair", needsTim: "Set TESSERA_DAY0_KEYPAIR or generate scripts/day0/.keypair.json" });
  }

  let secret: Uint8Array;
  try { secret = loadKeypairBytes(kpPath); } catch (e) {
    return logResult({ id: ID, status: "FAIL", detail: `Could not read keypair at ${kpPath}`, error: shortError(e) });
  }

  const { sdk, client, signer } = await makeClient(secret);

  // Wire the user-registration ZK prover (G77).
  const zkProver = await (async () => {
    try {
      const wzp: any = await import("@umbra-privacy/web-zk-prover");
      const assetProvider = wzp.getCdnZkAssetProvider({});
      return wzp.getUserRegistrationProver({ assetProvider });
    } catch (e) {
      throw new Error(`web-zk-prover wiring failed: ${shortError(e)}`);
    }
  })();

  let signatures: string[] = [];
  try {
    const register = sdk.getUserRegistrationFunction({ client }, { zkProver });
    const sigs = await register({ confidential: true, anonymous: true });
    signatures = Array.isArray(sigs) ? sigs.map(String) : [String(sigs)];
  } catch (e) {
    return logResult({
      id: ID,
      status: "FAIL",
      detail: "register({confidential:true, anonymous:true}) rejected",
      error: shortError(e),
      data: { durationMs: Date.now() - t0, signerAddress: String(signer.address) },
    });
  }

  // Read on-chain user account.
  let onchain: any = null;
  let x25519Hex: string | null = null;
  let x25519AllZero: boolean | null = null;
  try {
    const query = sdk.getUserAccountQuerierFunction({ client });
    onchain = await query(signer.address);
    const buf: Uint8Array | undefined = onchain?.data?.x25519PublicKey ?? onchain?.x25519PublicKey;
    if (buf instanceof Uint8Array) {
      x25519Hex = Buffer.from(buf).toString("hex");
      x25519AllZero = buf.every((b) => b === 0);
    }
  } catch (e) {
    return logResult({
      id: ID,
      status: "FAIL",
      detail: "register() returned but on-chain UserAccount query failed",
      error: shortError(e),
      data: { durationMs: Date.now() - t0, signatures },
    });
  }

  // Verify G75: master-viewing-key X25519 deriver should match on-chain x25519PublicKey.
  let derivedHex: string | null = null;
  let deriverMatch: boolean | null = null;
  let deriverError: string | null = null;
  try {
    const deriverFactory = sdk.getMasterViewingKeyX25519KeypairDeriver;
    if (typeof deriverFactory === "function") {
      const deriver = deriverFactory({ client });
      const result = typeof deriver === "function" ? await deriver({ client }) : deriver;
      const pub: Uint8Array | undefined = result?.publicKey ?? result?.x25519PublicKey ?? result;
      if (pub instanceof Uint8Array) {
        derivedHex = Buffer.from(pub).toString("hex");
        deriverMatch = derivedHex === x25519Hex;
      }
    }
  } catch (e) {
    deriverError = shortError(e);
  }

  // The SDK registration is idempotent — when the account is already registered,
  // it returns 0 signatures. PASS criteria is therefore "on-chain x25519PublicKey
  // is non-zero" (i.e. account exists), independent of how many txs were issued.
  const accountExists = x25519Hex !== null && x25519AllZero === false;
  const passed = accountExists;
  const idempotentSkip = signatures.length === 0 && accountExists;
  return logResult({
    id: ID,
    status: passed ? "PASS" : "FAIL",
    detail: passed
      ? `register PASS: ${idempotentSkip ? "account already registered (0 new sigs — idempotent skip)" : `${signatures.length} sig(s)`}; on-chain x25519PublicKey non-zero; G75 deriver match=${deriverMatch}`
      : `register completed but on-chain state did not validate (sigs=${signatures.length}, x25519AllZero=${x25519AllZero})`,
    data: {
      durationMs: Date.now() - t0,
      signerAddress: String(signer.address),
      signatures,
      x25519PublicKeyHex: x25519Hex,
      x25519AllZero,
      g75DeriverMatch: deriverMatch,
      g75DeriverError: deriverError,
      g75DerivedHex: derivedHex,
    },
  });
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
