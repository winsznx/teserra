import { logResult, shortError, INDEXER_URL } from "./_lib.ts";

const ID = "06-indexer-verify";

// Discord intel 2026-05-03 (Cal, Umbra founder): the canonical pay-before-response
// verification flow does NOT use a /verify indexer endpoint. Instead, the receiver
// reconstructs the assertion from chain state alone:
//
//   1. sender embeds tx-id (e.g. an x402 request id) in `optional_data` of the
//      deposit instruction.
//   2. receiver fetches the COMPUTATION ACCOUNT from the deposit tx signature.
//   3. receiver fetches the CALLBACK TXs from the computation account.
//   4. receiver verifies that the callback emitted the same tx-id.
//
// Hot-path verification therefore needs only a Solana RPC — no indexer.
// The indexer is still useful for cold-start UTXO discovery (Check 04 path).

async function probe(url: string) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { method: "GET" });
    const text = await r.text();
    return { ok: r.ok, status: r.status, ms: Date.now() - t0, contentType: r.headers.get("content-type"), bodyPreview: text.slice(0, 240), error: null as string | null };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - t0, contentType: null, bodyPreview: "", error: shortError(e) };
  }
}

async function main() {
  const root = INDEXER_URL.replace(/\/+$/, "");
  const health = await probe(root + "/health");

  const verificationFlow = {
    name: "Umbra deposit-bound x402 verification (Cal, 2026-05-03)",
    description:
      "Sender embeds tx-id in `optional_data` field of the deposit instruction; receiver fetches the deposit's computation account, then the computation's callback transactions, then verifies the callback emitted the same tx-id. No /verify indexer endpoint involved on the hot path.",
    steps: [
      "sender.deposit({...payload, optionalData: encode(txId)}) — Umbra deposit instruction carries opaque 32 bytes",
      "deposit_tx_signature := result.signature",
      "computation_account := connection.getTransaction(deposit_tx_signature).meta.innerInstructions ⇒ Umbra program CPI ⇒ computation account pubkey",
      "callback_txs := connection.getSignaturesForAddress(computation_account, {limit: 32}) — collect callbacks",
      "for each callback_tx: log_messages := connection.getTransaction(callback_tx.signature).meta.logMessages",
      "verify ∃ log line of the form `Program log: Umbra:Callback:<base64(tx_id)>` matching the original tx-id",
    ],
    canonicalSdkExports: [
      "@umbra-privacy/sdk → getPublicBalanceToEncryptedBalanceDirectDepositorFunction (deposit with optional_data)",
      "@umbra-privacy/sdk → ComputationMonitor / getPollingComputationMonitor (track callback finalization)",
    ],
    indexerRoleAfterIntel:
      "Indexer is for cold-start UTXO discovery (used by getClaimableUtxoScannerFunction in Check 04). Pay-before-response x402 verification is RPC-only.",
  };

  const banner =
    health.ok
      ? `Devnet indexer ${root} healthy (${health.status}). Hot-path verification still uses RPC per Cal's pattern below.`
      : `Devnet indexer ${root} health probe returned ${health.status || "unreachable"}. Hot-path verification path uses RPC only and is unaffected.`;

  return logResult({
    id: ID,
    status: "WORKAROUND_DOCUMENTED",
    detail: banner,
    data: {
      indexerUrl: root,
      healthProbe: { url: root + "/health", status: health.status, ms: health.ms, error: health.error, contentType: health.contentType, bodyPreview: health.bodyPreview },
      verificationFlow,
      replacesPriorAssumption: "Earlier Day 0 run probed POST/GET /verify on indexer.umbraprivacy.com (mainnet host, NXDOMAIN). That entire test was scrapped per Discord intel — the canonical pattern needs no /verify endpoint.",
    },
    needsTim:
      "End-to-end exercise of this flow needs a funded keypair + a real x402 request id; until then this is a documented design, not a live-tested one. DM @UmbraPrivacy if any step needs clarification on the optional_data encoding rules.",
  });
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
