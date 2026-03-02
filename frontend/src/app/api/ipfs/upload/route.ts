import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { data, filename } = body as { data: unknown; filename?: string };

  if (!data) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const pinataKey = process.env.PINATA_API_KEY;
  const pinataSecret = process.env.PINATA_SECRET_API_KEY;

  if (!pinataKey || !pinataSecret) {
    return NextResponse.json(
      { error: "Pinata not configured" },
      { status: 500 },
    );
  }

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: pinataKey,
      pinata_secret_api_key: pinataSecret,
    },
    body: JSON.stringify({
      pinataContent: data,
      pinataMetadata: { name: filename ?? "kosyn-profile" },
      pinataOptions: { cidVersion: 1 },
    }),
  });

  const result = (await res.json()) as { IpfsHash?: string; error?: string };

  if (!res.ok) {
    return NextResponse.json(
      { error: result.error ?? "Pinata error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ cid: result.IpfsHash });
}
