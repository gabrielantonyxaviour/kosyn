import { NextResponse } from "next/server";
import { NILLION_BASE_URL, NILLION_MODEL } from "@/lib/nillion";

/**
 * GET /api/nillion/test
 *
 * Validates Nillion nilAI connectivity, proof receipt, and attestation.
 * Returns detailed step-by-step results with a PASS/FAIL verdict.
 * Internal test only — no auth required.
 */
export async function GET() {
  const apiKey = process.env.NILLION_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NILLION_API_KEY not configured" },
      { status: 500 },
    );
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const results: Record<string, unknown> = {};
  let passed = 0;
  let failed = 0;

  // Step 1: Health check
  try {
    const res = await fetch(`${NILLION_BASE_URL}/v1/health`);
    const data = await res.json();
    results.health = { ok: res.ok, status: res.status, data };
    if (res.ok) passed++;
    else failed++;
  } catch (e) {
    results.health = { ok: false, error: String(e) };
    failed++;
  }

  // Step 2: List models
  try {
    const res = await fetch(`${NILLION_BASE_URL}/v1/models`, { headers });
    const data = (await res.json()) as { data?: Array<{ id: string }> };
    results.models = { ok: res.ok, models: data.data?.map((m) => m.id) ?? [] };
    if (res.ok) passed++;
    else failed++;
  } catch (e) {
    results.models = { ok: false, error: String(e) };
    failed++;
  }

  // Step 3: Chat completion (non-streaming) — verify response + signature
  try {
    const body = JSON.stringify({
      model: NILLION_MODEL,
      messages: [
        { role: "user", content: "Say 'Nillion TEE works' and nothing else." },
      ],
      temperature: 0.0,
      stream: false,
    });
    const res = await fetch(`${NILLION_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      body,
    });
    const data = (await res.json()) as {
      choices?: Array<{ message: { content: string } }>;
      signature?: string;
      model?: string;
    };
    const content = data.choices?.[0]?.message?.content;
    const hasSignature =
      typeof data.signature === "string" && data.signature.length > 0;
    results.chat = {
      ok: res.ok && !!content && hasSignature,
      content,
      signatureLength: data.signature?.length ?? 0,
      signaturePrefix: data.signature?.slice(0, 20) ?? null,
      model: data.model,
      proofReceived: hasSignature,
    };
    if (res.ok && content && hasSignature) passed++;
    else failed++;
  } catch (e) {
    results.chat = { ok: false, error: String(e) };
    failed++;
  }

  // Step 4: Public key
  try {
    const res = await fetch(`${NILLION_BASE_URL}/v1/public_key`, { headers });
    const text = await res.text();
    results.publicKey = {
      ok: res.ok,
      keyLength: text.trim().length,
      keyPrefix: text.trim().slice(0, 40),
    };
    if (res.ok) passed++;
    else failed++;
  } catch (e) {
    results.publicKey = { ok: false, error: String(e) };
    failed++;
  }

  // Step 5: TEE attestation
  try {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const res = await fetch(
      `${NILLION_BASE_URL}/v1/attestation/report?nonce=${nonce}`,
      { headers },
    );
    const data = (await res.json()) as {
      nonce?: string;
      verifying_key?: string;
      cpu_attestation?: string;
      gpu_attestation?: string;
    };
    results.attestation = {
      ok: res.ok,
      nonceMatch: data.nonce === nonce,
      hasVerifyingKey: !!data.verifying_key,
      hasCpuAttestation: !!data.cpu_attestation,
      hasGpuAttestation: !!data.gpu_attestation,
    };
    if (res.ok && data.verifying_key) passed++;
    else failed++;
  } catch (e) {
    results.attestation = { ok: false, error: String(e) };
    failed++;
  }

  return NextResponse.json({
    verdict: failed === 0 ? "PASS" : "FAIL",
    passed,
    failed,
    total: passed + failed,
    baseUrl: NILLION_BASE_URL,
    model: NILLION_MODEL,
    ...results,
  });
}
