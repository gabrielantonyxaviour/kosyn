import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns";
import { workflowSchema } from "@/lib/validators";

// Use Google DNS to avoid ISP caching issues with trycloudflare.com
dns.setServers(["8.8.8.8", "8.8.4.4"]);

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
          error: `The CRE service is currently offline. Please reach out to gabrielantony56@gmail.com to have it turned back on.`,
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
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const isNetwork =
      message.includes("fetch") ||
      message.includes("ENOTFOUND") ||
      message.includes("resolve");
    return NextResponse.json(
      {
        error: isNetwork
          ? "CRE service unreachable — the Cloudflare tunnel may have expired. Restart cloudflared and update .env.local with the new URL."
          : message,
        code: isNetwork ? "CRE_UNREACHABLE" : "INTERNAL_ERROR",
      },
      { status: isNetwork ? 503 : 500 },
    );
  }
}
