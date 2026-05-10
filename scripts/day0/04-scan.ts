import { logResult, shortError, envKeypair, loadKeypairBytes, makeClient, UMBRA_DEVNET_USDC_MINT } from "./_lib.ts";

const ID = "04-scan";

function sanitiseSample(v: unknown, depth = 0): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return String(v);
  if (v instanceof Uint8Array) return `<bytes:${v.length}>`;
  if (Array.isArray(v)) return depth > 2 ? `<array:${v.length}>` : v.slice(0, 4).map((x) => sanitiseSample(x, depth + 1));
  if (typeof v === "object") {
    if (depth > 2) return "<object>";
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as object).slice(0, 16)) out[k] = sanitiseSample(val, depth + 1);
    return out;
  }
  return v;
}

async function withRetries<T>(fn: () => Promise<T>, attempts: number[]): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts.length; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      if (i < attempts.length - 1) await new Promise((r) => setTimeout(r, attempts[i]));
    }
  }
  throw lastErr;
}

async function main() {
  const t0 = Date.now();
  const kpPath = envKeypair();
  if (!kpPath) return logResult({ id: ID, status: "BLOCKED", detail: "No keypair" });

  const secret = loadKeypairBytes(kpPath);
  const { sdk, client } = await makeClient(secret);

  let scanResult: any;
  try {
    const scan = sdk.getClaimableUtxoScannerFunction({ client });
    // G74 mitigation note: the SDK's scanner already handles cross-tree iteration internally.
    // We wrap in a 2-attempt retry budget (1.5s, 3s) so empty-state polling completes in ~5s.
    scanResult = await withRetries(() => scan(), [1500, 3000]);
  } catch (e) {
    const err = e instanceof Error ? `${e.name}: ${e.message}\n${(e.stack ?? "").split("\n").slice(0, 6).join("\n")}` : String(e);
    return logResult({ id: ID, status: "FAIL", detail: "scanner threw", error: err, data: { durationMs: Date.now() - t0 } });
  }

  // v4 SDK result shape per Discord intel.
  const v4Keys = ["selfBurnable", "received", "publicSelfBurnable", "publicReceived"] as const;
  const present = v4Keys.filter((k) => scanResult && k in scanResult);
  const counts = Object.fromEntries(v4Keys.map((k) => [k, Array.isArray(scanResult?.[k]) ? scanResult[k].length : null]));

  const allReceived = [
    ...(Array.isArray(scanResult?.received) ? scanResult.received : []),
    ...(Array.isArray(scanResult?.publicReceived) ? scanResult.publicReceived : []),
  ];

  const matchingMint = allReceived.filter((u: any) => {
    const mint = u?.mint ?? u?.tokenMint ?? u?.tokenAddress;
    return mint && String(mint) === UMBRA_DEVNET_USDC_MINT;
  });

  const passed = present.length === v4Keys.length;
  return logResult({
    id: ID,
    status: passed ? "PASS" : "FAIL",
    detail: passed
      ? `scan returned v4 shape; received=${counts.received} publicReceived=${counts.publicReceived} matchingMint=${matchingMint.length}`
      : `scan result missing v4 keys; got [${Object.keys(scanResult ?? {}).slice(0, 8).join(",")}]`,
    data: {
      durationMs: Date.now() - t0,
      v4ShapePresent: present,
      counts,
      firstReceivedSample: allReceived[0] ? sanitiseSample(allReceived[0]) : null,
      matchingMintCount: matchingMint.length,
      observedKeys: scanResult && typeof scanResult === "object" ? Object.keys(scanResult).slice(0, 16) : null,
    },
  });
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
