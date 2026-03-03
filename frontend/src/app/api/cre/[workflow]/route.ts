import { NextRequest, NextResponse } from "next/server";
import { workflowSchema } from "@/lib/validators";

// Per-workflow trigger URLs — point to cre-bridge (local) or deployed CRE DON endpoint
const WORKFLOW_URLS: Record<string, string | undefined> = {
  "record-upload": process.env.CRE_RECORD_UPLOAD_URL,
  "consultation-processing": process.env.CRE_CONSULTATION_PROCESSING_URL,
  "provider-decryption": process.env.CRE_PROVIDER_DECRYPTION_URL,
  "provider-registration": process.env.CRE_PROVIDER_REGISTRATION_URL,
  "payment-mint": process.env.CRE_PAYMENT_MINT_URL,
  "data-marketplace": process.env.CRE_DATA_MARKETPLACE_URL,
  "patient-ai-attest": process.env.CRE_PATIENT_AI_ATTEST_URL,
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workflow: string }> },
) {
  try {
    const { workflow } = await params;
    const parsed = workflowSchema.safeParse(workflow);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid workflow", code: "INVALID_WORKFLOW" },
        { status: 400 },
      );
    }

    const data = await req.json();
    const triggerUrl = WORKFLOW_URLS[parsed.data];

    if (!triggerUrl) {
      return NextResponse.json(
        {
          error: `CRE workflow '${parsed.data}' not configured. Start the CRE bridge (bun scripts/cre-bridge.ts) and set ${`CRE_${parsed.data.toUpperCase().replace(/-/g, "_")}_URL`} in .env.local.`,
          code: "CRE_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const res = await fetch(triggerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
