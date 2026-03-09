import { NextRequest, NextResponse } from "next/server";
import { verifyX402Payment } from "@/lib/x402";
import { getContributorSet } from "@/lib/marketplace-chain";

// KUSD has 6 decimals — 10 KUSD = 10 * 10^6
const ENDPOINT_PRICES: Record<string, string> = {
  demographics: "10000000",
  conditions: "25000000",
  outcomes: "50000000",
};

const ENDPOINT_DESCRIPTIONS: Record<string, string> = {
  demographics: "Age/gender distribution across consenting patients",
  conditions: "Most common conditions from consultation records",
  outcomes: "Treatment outcome correlations",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ endpoint: string }> },
) {
  try {
    const { endpoint } = await params;

    if (!ENDPOINT_PRICES[endpoint]) {
      return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
    }

    const paymentProof =
      req.headers.get("x-payment") || req.headers.get("X-Payment");

    if (!paymentProof) {
      return NextResponse.json(
        {
          x402Version: 1,
          error: "Payment Required",
          accepts: [
            {
              scheme: "exact",
              network: "eip155:43113",
              maxAmountRequired: ENDPOINT_PRICES[endpoint],
              resource: `/api/data/${endpoint}`,
              description: ENDPOINT_DESCRIPTIONS[endpoint],
              payTo: process.env.NEXT_PUBLIC_DATA_MARKETPLACE,
              currency: "KUSD",
            },
          ],
        },
        { status: 402 },
      );
    }

    // --- 1. Verify KUSD payment on-chain ---
    let txHash: string;
    try {
      const decoded = Buffer.from(paymentProof, "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      txHash = parsed.txHash;
      if (!txHash) throw new Error("missing txHash");
    } catch {
      return NextResponse.json(
        { error: "Invalid payment proof format" },
        { status: 402 },
      );
    }

    const { valid, error } = await verifyX402Payment(
      txHash,
      process.env.NEXT_PUBLIC_DATA_MARKETPLACE!,
      BigInt(ENDPOINT_PRICES[endpoint]),
    );

    if (!valid) {
      return NextResponse.json(
        { error: error || "Invalid payment" },
        { status: 402 },
      );
    }

    // --- 2. Verify on-chain contributors exist ---
    const contributorSet = await getContributorSet();
    if (contributorSet.size === 0) {
      return NextResponse.json(
        {
          error: "No consenting patients in dataset yet",
          hint: "Patients must call DataMarketplace.listData() on Fuji",
        },
        { status: 503 },
      );
    }

    // --- 3. Delegate aggregation to CRE TEE ---
    const creAggUrl = process.env.CRE_DATA_AGGREGATION_URL;
    if (!creAggUrl) {
      return NextResponse.json(
        { error: "CRE aggregation service not configured" },
        { status: 503 },
      );
    }

    const creRes = await fetch(creAggUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        queryId: 0,
        contributors: [...contributorSet],
      }),
    });

    if (!creRes.ok) {
      return NextResponse.json(
        { error: "CRE aggregation workflow failed", status: creRes.status },
        { status: 502 },
      );
    }

    return NextResponse.json(await creRes.json());
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
