import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { CIRCUITS_DIR, logResult, shortError } from "./_lib.ts";

const ID = "08-ptau";

const FILE = "powersOfTau28_hez_final_15.ptau";
const MIRRORS = [
  // Hermez S3 — historical canonical mirror; observed 403 on 2026-05-03.
  `https://hermez.s3-eu-west-1.amazonaws.com/${FILE}`,
  // GCS mirror — alive on 2026-05-03 probe.
  `https://storage.googleapis.com/zkevm/ptau/${FILE}`,
];

async function sha256(path: string): Promise<string> {
  const { createReadStream } = await import("node:fs");
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
}

async function tryFetch(url: string, dest: string): Promise<{ ok: true; bytes: number } | { ok: false; reason: string }> {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) return { ok: false, reason: `${res.status} ${res.statusText}` };
    await pipeline(Readable.fromWeb(res.body as any), createWriteStream(dest));
    return { ok: true, bytes: statSync(dest).size };
  } catch (e) {
    return { ok: false, reason: shortError(e) };
  }
}

async function main() {
  if (!existsSync(CIRCUITS_DIR)) mkdirSync(CIRCUITS_DIR, { recursive: true });
  const dest = join(CIRCUITS_DIR, FILE);

  const attempts: Array<{ url: string; result: { ok: boolean; reason?: string; bytes?: number } }> = [];
  let succeeded = false;
  if (existsSync(dest) && statSync(dest).size > 0) {
    succeeded = true;
    attempts.push({ url: "(cached on disk)", result: { ok: true, bytes: statSync(dest).size } });
  } else {
    for (const url of MIRRORS) {
      const r = await tryFetch(url, dest);
      attempts.push({ url, result: r });
      if (r.ok) { succeeded = true; break; }
    }
  }

  if (!succeeded) {
    return logResult({
      id: ID,
      status: "FAIL",
      detail: "All ptau mirrors failed",
      data: { attempts },
      needsTim: "Provide a mirror URL or supply circuits/" + FILE + " manually",
    });
  }

  const size = statSync(dest).size;
  const hash = await sha256(dest);

  return logResult({
    id: ID,
    status: "WORKAROUND_DOCUMENTED",
    detail: `Downloaded ${FILE} (${size} bytes). SHA256 computed — Tim must compare against the canonical Hermez Phase-1 published value before relying on it.`,
    data: { destPath: dest, sizeBytes: size, sha256: hash, attempts },
    needsTim: "Verify printed SHA256 against the iden3/snarkjs Phase-1 published hash list",
  });
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
