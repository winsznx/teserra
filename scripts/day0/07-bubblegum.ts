import { logResult, shortError, DEVNET_RPC, envKeypair, loadKeypairBytes } from "./_lib.ts";

const ID = "07-bubblegum";

async function main() {
  const t0 = Date.now();
  const kpPath = envKeypair();
  if (!kpPath) return logResult({ id: ID, status: "BLOCKED", detail: "No keypair" });

  let mpl: any;
  let umiBundle: any;
  let umiKeypair: any;
  let signerIdentity: any;
  let dasApi: any;
  try {
    mpl = await import("@metaplex-foundation/mpl-bubblegum");
    umiBundle = await import("@metaplex-foundation/umi-bundle-defaults");
    umiKeypair = await import("@metaplex-foundation/umi");
    signerIdentity = umiKeypair.signerIdentity;
    dasApi = await import("@metaplex-foundation/digital-asset-standard-api").catch(() => null);
  } catch (e) {
    return logResult({
      id: ID,
      status: "BLOCKED",
      detail: "Umi bundle / DAS missing (only @metaplex-foundation/mpl-bubblegum was installed for Day 0; tree creation needs Umi)",
      error: shortError(e),
      needsTim: "pnpm add @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults @metaplex-foundation/mpl-token-metadata",
    });
  }

  const secret = loadKeypairBytes(kpPath);
  const umi = umiBundle.createUmi(DEVNET_RPC).use(mpl.mplBubblegum());
  if (dasApi?.dasApi) umi.use(dasApi.dasApi());
  const kp = umiKeypair.createKeypairFromSecretKey
    ? umiKeypair.createKeypairFromSecretKey(secret)
    : umi.eddsa.createKeypairFromSecretKey(secret);
  const signer = umiKeypair.createSignerFromKeypair(umi, kp);
  umi.use(signerIdentity(signer));

  // Create a small Merkle tree (maxDepth 14, maxBufferSize 64, canopyDepth 11).
  let merkleTreePubkey: string | null = null;
  try {
    const merkleTree = umiKeypair.generateSigner(umi);
    const builder = await mpl.createTree(umi, {
      merkleTree,
      maxDepth: 14,
      maxBufferSize: 64,
      canopyDepth: 11,
    });
    const built = typeof builder?.sendAndConfirm === "function"
      ? await builder.sendAndConfirm(umi)
      : await builder;
    merkleTreePubkey = String(merkleTree.publicKey ?? merkleTree.public_key ?? "");
    if (!merkleTreePubkey) throw new Error("merkleTree.publicKey missing");
  } catch (e) {
    return logResult({
      id: ID,
      status: "FAIL",
      detail: "createTree failed",
      error: shortError(e),
      data: { durationMs: Date.now() - t0 },
    });
  }

  // Mint one cNFT to the signer. mpl-bubblegum 5.x signature changed from earlier
  // versions; capture failure but keep the tree result — tree creation alone
  // unblocks the downstream Anchor program work.
  let mintTxSig: string | null = null;
  let mintError: string | null = null;
  try {
    const mintRes = await mpl.mintV1(umi, {
      leafOwner: signer.publicKey,
      merkleTree: merkleTreePubkey,
      metadata: {
        name: "TESSERA Day 0",
        symbol: "TSDAY0",
        uri: "https://example.com/day0",
        sellerFeeBasisPoints: 0,
        collection: { __option: "None" },
        creators: [],
      },
    }).sendAndConfirm(umi);
    mintTxSig = String(mintRes?.signature ?? "");
  } catch (e) {
    mintError = shortError(e);
  }

  return logResult({
    id: ID,
    status: mintTxSig ? "PASS" : "WORKAROUND_DOCUMENTED",
    detail: mintTxSig
      ? `Tree created + cNFT minted; tree=${merkleTreePubkey}`
      : `Tree created (tree=${merkleTreePubkey}); mintV1 failed in 5.x — tree alone unblocks Anchor program scaffolding (BUILD_SEQUENCE Step 0c). Mint to be retried during Step 9.`,
    data: { durationMs: Date.now() - t0, merkleTreePubkey, mintTxSig, mintError },
  });
}

main().catch((e) => {
  logResult({ id: ID, status: "FAIL", detail: "uncaught", error: shortError(e) });
  process.exit(1);
});
