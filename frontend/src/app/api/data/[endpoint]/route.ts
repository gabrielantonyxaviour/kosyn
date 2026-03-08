import { NextRequest, NextResponse } from "next/server";
import { verifyX402Payment } from "@/lib/x402";
import { getOptedInRecords } from "@/app/api/demo/store";
import { getContributorSet } from "@/lib/marketplace-chain";
import {
  aggregateDemographics,
  aggregateConditions,
  aggregateOutcomes,
} from "@/lib/data-aggregation";

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
      // Next.js lowercases all incoming headers — try both casings
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
    // paymentProof is base64-encoded JSON: { txHash, from, amount, token, to }
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

    // --- 2. Get patients who opted in on-chain (DataMarketplace.getActiveContributors) ---
    const contributorSet = await getContributorSet();

    // --- 3. Get records from opted-in patients who are also on-chain contributors ---
    // The demo store holds plaintext formData for research aggregation.
    // In production this step would run inside a CRE TEE, fetching and decrypting
    // each patient's encrypted IPFS blob before aggregating.
    const allOptedIn = getOptedInRecords();
    const eligibleRecords = allOptedIn.filter((r) =>
      contributorSet.has(r.patientAddress.toLowerCase()),
    );

    if (eligibleRecords.length === 0) {
      // No opted-in patients on-chain yet — return 503 with instructions
      return NextResponse.json(
        {
          error: "No consenting patients in dataset yet",
          hint: "Patients must call DataMarketplace.listData() on Fuji and opt in via /patients/records/share",
          contributors_on_chain: contributorSet.size,
          records_in_store: allOptedIn.length,
        },
        { status: 503 },
      );
    }

    // --- 4. Aggregate ---
    // Production path: delegate to CRE TEE workflow (decrypts real IPFS records).
    // Development path: aggregate from plaintext demo store records.
    const creAggUrl = process.env.CRE_DATA_AGGREGATION_URL;

    if (creAggUrl) {
      // Production: CRE TEE fetches IPFS blobs, unwraps patient keys, aggregates inside enclave
      const creRes = await fetch(creAggUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, queryId: 0 }),
      });
      if (!creRes.ok) {
        return NextResponse.json(
          { error: "CRE aggregation workflow failed", status: creRes.status },
          { status: 502 },
        );
      }
      return NextResponse.json(await creRes.json());
    }

    // Development fallback: demo store aggregation (plaintext, no decryption needed)
    if (endpoint === "demographics") {
      return NextResponse.json(aggregateDemographics(eligibleRecords));
    }
    if (endpoint === "conditions") {
      return NextResponse.json(aggregateConditions(eligibleRecords));
    }
    if (endpoint === "outcomes") {
      return NextResponse.json(aggregateOutcomes(eligibleRecords));
    }

    return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
