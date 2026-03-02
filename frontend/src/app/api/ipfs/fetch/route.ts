import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get("cid");

  if (!cid) {
    return NextResponse.json(
      { error: "Missing cid parameter" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);

    if (!res.ok) {
      return NextResponse.json(
        { error: `IPFS fetch failed with status ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch from IPFS: ${message}` },
      { status: 502 },
    );
  }
}
