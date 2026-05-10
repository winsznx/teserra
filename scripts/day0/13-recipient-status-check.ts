// Diagnostic for the parallel discriminator bug in
// lib/umbra-deposit.ts::checkRecipientUmbraStatus.
//
// Mirrors 12-isregistered-check.ts but exercises the recipient-side check
// the /employer form runs. Calls the production helper directly and logs the
// {ok, reason} verdict against the Day 0 keypair (which IS registered on-chain
// per 12-isregistered-check.ts).

import { logResult, shortError, envKeypair, loadKeypairBytes, makeClient } from "./_lib.ts";
import { checkRecipientUmbraStatus } from "../../lib/umbra-deposit.ts";

const ID = "13-recipient-status-check";

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

  const { client, signer } = await makeClient(secret);
  const addr = String(signer.address);

  let result: Awaited<ReturnType<typeof checkRecipientUmbraStatus>> | null = null;
  let threw: string | null = null;
  try {
    result = await checkRecipientUmbraStatus(client, addr);
  } catch (e) {
    threw = shortError(e);
  }

  const ok = result?.ok === true;
  const passed = ok && threw === null;

  return logResult({
    id: ID,
    status: passed ? "PASS" : "FAIL",
    detail: passed
      ? `recipient detected as registered (Day 0 keypair, on-chain x25519 non-zero)`
      : `recipient detected as NOT registered (bug repro: ${result?.ok === false ? `reason=${result.reason}` : "threw"})`,
    data: {
      durationMs: Date.now() - t0,
      recipient: addr,
      result,
      threw,
    },
  });
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
