import { NextResponse } from "next/server";

export async function GET() {
  // This will be implemented as SSE in Step 12
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
