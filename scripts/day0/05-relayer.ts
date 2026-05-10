import { logResult, shortError } from "./_lib.ts";

const ID = "05-relayer";

const CANDIDATES = [
  process.env.UMBRA_RELAYER_URL,
  "https://relayer.api-devnet.umbraprivacy.com",
  "https://relayer-devnet.umbraprivacy.com",
  "https://relayer.umbraprivacy.com",
].filter((u): u is string => Boolean(u));

async function probe(url: string) {
  const t0 = Date.now();
  try {
    const r = await fetch(url + "/health", { method: "GET" });
    return { url, status: r.status, ok: r.ok, ms: Date.now() - t0, error: null as string | null };
  } catch (e) {
    return { url, status: 0, ok: false, ms: Date.now() - t0, error: shortError(e) };
  }
}

async function main() {
  const sdk: any = await import("@umbra-privacy/sdk");
  const probes = await Promise.all(CANDIDATES.map(probe));

  const winner = probes.find((p) => p.ok && p.status === 200);
  if (!winner) {
    return logResult({
      id: ID,
      status: "WORKAROUND_DOCUMENTED",
      detail: "No devnet relayer endpoint reachable on /health. Implement user-pays-gas with no retry; surface PRD §13 'Gasless mode unavailable' banner.",
      data: { probes },
      needsTim: "Confirm working devnet relayer URL with @francis_codex; set UMBRA_RELAYER_URL env",
    });
  }

  let factoryOk = false;
  let factoryError: string | null = null;
  try {
    const relayer = sdk.getUmbraRelayer({ apiEndpoint: winner.url });
    factoryOk = relayer && typeof relayer === "object";
  } catch (e) { factoryError = shortError(e); }

  return logResult({
    id: ID,
    status: factoryOk ? "PASS" : "FAIL",
    detail: factoryOk ? `Relayer reachable + factory OK at ${winner.url}` : `Reachable at ${winner.url} but SDK factory threw`,
    data: { winner, probes, factoryError },
  });
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
