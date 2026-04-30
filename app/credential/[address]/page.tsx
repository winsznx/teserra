import { CredentialViewerContent } from "@/components/credential-viewer-content";

export default async function CredentialPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  // TODO(backend): Fetch credential from Solana RPC / Indexer
  const found = true; // Stub

  return <CredentialViewerContent address={address} found={found} />;
}
