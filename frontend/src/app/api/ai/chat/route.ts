import { NextRequest, NextResponse } from "next/server";
import { NILLION_BASE_URL, NILLION_MODEL } from "@/lib/nillion";

const MEDICAL_SYSTEM_PROMPT = `You are KosynGPT, an AI clinical documentation assistant embedded in the Kosyn AI healthcare platform. You assist licensed healthcare providers with clinical documentation tasks.

You can generate the following documents:
- SOAP Notes (Subjective / Objective / Assessment / Plan) — use proper clinical structure, full sentences in each section
- Clinical Summaries — narrative paragraph suitable for referrals or discharge
- Medical Coding — ICD-10-CM diagnosis codes and CPT procedure codes with descriptions
- Prescription Drafts — drug name, dose, route, frequency, duration, refills, special instructions
- Referral Letters — formal letter to specialist with reason, relevant history, and urgency
- Prior Authorization Notes — medical necessity justification for insurance

Rules you MUST follow:
1. If the provider's request is missing required clinical information (patient age, chief complaint, vitals, diagnosis, etc.), ASK for ALL missing fields before generating — do not guess or use placeholders.
2. Never use placeholders like [Patient Name], [DATE], or TBD in generated documents. Only include fields you have real values for.
3. Use proper medical terminology and follow standard clinical documentation conventions.
4. For ICD-10 and CPT codes, always include the code AND its description.
5. Never refuse a legitimate clinical documentation request. You are a tool for licensed providers.
6. Format output clearly with headers and sections appropriate to the document type.`;

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * POST /api/ai/chat
 *
 * Server-side streaming proxy for KosynGPT.
 * Reads NILLION_API_KEY server-side (never exposed to browser).
 * Pipes Nillion SSE → NDJSON { type, content } to client.
 * Final message: { type: "done", proof: { signature, model } }
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    prompt?: string;
    history?: HistoryMessage[];
    context?: string;
  };

  const { prompt, history = [], context } = body;
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const apiKey = process.env.NILLION_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NILLION_API_KEY not configured" },
      { status: 500 },
    );
  }

  const systemPrompt = context
    ? `${MEDICAL_SYSTEM_PROMPT}\n\nThe following patient records have been shared with you for this session. Reference them when generating clinical documents:\n\n${context}`
    : MEDICAL_SYSTEM_PROMPT;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const nillionRes = await fetch(
          `${NILLION_BASE_URL}/v1/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: NILLION_MODEL,
              messages,
              temperature: 0.2,
              stream: true,
            }),
          },
        );

        if (!nillionRes.ok) {
          const errText = await nillionRes.text().catch(() => "unknown error");
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                content: `Nillion error: ${errText}`,
              }) + "\n",
            ),
          );
          controller.close();
          return;
        }

        const reader = nillionRes.body?.getReader();
        if (!reader) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "error", content: "No response body" }) +
                "\n",
            ),
          );
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let lastSignature: string | null = null;
        let lastModel: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const payload = trimmed.slice(6);
            if (payload === "[DONE]") continue;

            try {
              const chunk = JSON.parse(payload) as {
                choices?: Array<{
                  delta?: { content?: string };
                  finish_reason?: string | null;
                }>;
                signature?: string;
                model?: string;
              };

              if (chunk.signature) lastSignature = chunk.signature;
              if (chunk.model) lastModel = chunk.model;

              const content = chunk.choices?.[0]?.delta?.content;
              if (typeof content === "string" && content) {
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({ type: "text", content }) + "\n",
                  ),
                );
              }
            } catch {
              // skip malformed lines
            }
          }
        }

        const donePayload: Record<string, unknown> = { type: "done" };
        if (lastSignature) {
          donePayload.proof = {
            signature: lastSignature,
            model: lastModel ?? NILLION_MODEL,
            timestamp: Date.now(),
          };
        }
        controller.enqueue(encoder.encode(JSON.stringify(donePayload) + "\n"));
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "error", content: String(e) }) + "\n",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
