// Static cNFT metadata stub for `metadataUriFor` references stored on
// minted credentials. The slug encodes `${owner}-${proofHashHex}` so wallet
// inspectors / DAS clients can resolve the URI without an external host.
//
// Returns the minimal shape Bubblegum / wallets expect: name, symbol,
// description, image. The image is a static parchment-styled SealCard
// thumbnail — same aesthetic as `/credential/[address]` but tiny (no
// auth, no chain reads, just a constant resource per slug).

import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> },
): Promise<Response> {
  const { address } = await params;

  return NextResponse.json(
    {
      name: "TESSERA Income Credential",
      symbol: "TESSERA",
      description:
        "A Tessera credential proves the holder's verified income exceeded a threshold over a date range. The exact amount, employer identity, and transaction history are not disclosed.",
      image: "https://tessera.demo/credential-seal.png",
      external_url: `https://tessera.demo/credential/${address}`,
      properties: {
        category: "credential",
        creators: [
          {
            address: "TESSERA",
            share: 100,
          },
        ],
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}

export const dynamic = "force-dynamic";
