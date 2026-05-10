import { logResult, shortError, envKeypair, loadKeypairBytes, makeClient, UMBRA_DEVNET_USDC_MINT, UMBRA_FAUCET_URL } from "./_lib.ts";

const ID = "03-deposit";
const TRANSFER_AMOUNT = 100_000n; // 0.1 dUSDC at 6 decimals
const TEST_ID = "tessera_day0_test"; // right-padded to 32 zero bytes per OptionalData32

function makeOptionalData32(label: string): Uint8Array {
  const buf = new Uint8Array(32);
  const bytes = new TextEncoder().encode(label);
  buf.set(bytes.slice(0, 32), 0);
  return buf;
}

async function main() {
  const t0 = Date.now();
  const kpPath = envKeypair();
  if (!kpPath) {
    return logResult({ id: ID, status: "BLOCKED", detail: "No keypair", data: { dUsdcMint: UMBRA_DEVNET_USDC_MINT, faucet: UMBRA_FAUCET_URL } });
  }

  const secret = loadKeypairBytes(kpPath);
  const { sdk, client, signer } = await makeClient(secret);

  const optionalData = makeOptionalData32(TEST_ID);

  let result: any;
  try {
    const deposit = sdk.getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
    result = await deposit(signer.address, UMBRA_DEVNET_USDC_MINT, TRANSFER_AMOUNT, { optionalData });
  } catch (e) {
    const msg = shortError(e);
    const errCodeMatch = msg.match(/#?(70\d{5})|0x[0-9a-fA-F]+/);
    return logResult({
      id: ID,
      status: "FAIL",
      detail: "deposit rejected",
      error: msg,
      data: {
        durationMs: Date.now() - t0,
        amount: String(TRANSFER_AMOUNT),
        mint: UMBRA_DEVNET_USDC_MINT,
        optionalDataLength: optionalData.length,
        testId: TEST_ID,
        errorCodeHint: errCodeMatch?.[0] ?? null,
      },
    });
  }

  const queueSig = result?.queueSignature ?? null;
  const callbackSig = result?.callbackSignature ?? null;
  const callbackStatus = result?.callbackStatus ?? null;
  return logResult({
    id: ID,
    status: queueSig ? "PASS" : "FAIL",
    detail: queueSig ? `deposit queued; queueSig=${queueSig} callbackStatus=${callbackStatus}` : "deposit returned but no queueSignature in result",
    data: {
      durationMs: Date.now() - t0,
      queueSig,
      callbackSig,
      callbackStatus,
      callbackElapsedMs: result?.callbackElapsedMs ?? null,
      amount: String(TRANSFER_AMOUNT),
      mint: UMBRA_DEVNET_USDC_MINT,
      optionalDataAccepted: optionalData.length === 32,
      optionalDataHex: Buffer.from(optionalData).toString("hex"),
      testId: TEST_ID,
      resultKeys: result && typeof result === "object" ? Object.keys(result).slice(0, 16) : null,
    },
  });
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
