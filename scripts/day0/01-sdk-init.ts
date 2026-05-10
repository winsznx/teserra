import { logResult, shortError, DEVNET_RPC } from "./_lib.ts";

const ID = "01-sdk-init";

async function main() {
  let sdk: any;
  try {
    sdk = await import("@umbra-privacy/sdk");
  } catch (e) {
    return logResult({ id: ID, status: "FAIL", detail: "@umbra-privacy/sdk failed to import", error: shortError(e) });
  }

  if (typeof sdk.getUmbraClient !== "function") {
    return logResult({ id: ID, status: "FAIL", detail: "getUmbraClient is not exported as a function", data: { type: typeof sdk.getUmbraClient } });
  }
  if (typeof sdk.createInMemorySigner !== "function") {
    return logResult({ id: ID, status: "FAIL", detail: "createInMemorySigner not exported", data: { type: typeof sdk.createInMemorySigner } });
  }

  let signer: any;
  try {
    signer = await sdk.createInMemorySigner();
  } catch (e) {
    return logResult({ id: ID, status: "FAIL", detail: "createInMemorySigner() threw", error: shortError(e) });
  }

  try {
    const wssUrl = DEVNET_RPC.replace(/^http/, "ws");
    const client = await sdk.getUmbraClient({
      signer,
      network: "devnet",
      rpcUrl: DEVNET_RPC,
      rpcSubscriptionsUrl: wssUrl,
      lazy: true,
    });
    return logResult({
      id: ID,
      status: "PASS",
      detail: "getUmbraClient resolved on devnet (lazy=true)",
      data: { signerAddress: String(signer.address), network: "devnet", rpcUrl: DEVNET_RPC, clientKeys: Object.keys(client ?? {}).slice(0, 16) },
    });
  } catch (e) {
    return logResult({
      id: ID,
      status: "FAIL",
      detail: "getUmbraClient({network:'devnet'}) threw",
      error: shortError(e),
      needsTim: "Possibly an Umbra devnet config / RPC problem — DM @UmbraPrivacy",
    });
  }
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
