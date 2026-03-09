import { NextRequest, NextResponse } from "next/server";
import { sessions } from "@/lib/ai-sessions";
import { NILLION_BASE_URL, NILLION_MODEL } from "@/lib/nillion";

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    sessionToken?: string;
    message?: string;
    history?: HistoryMessage[];
  };
  const { sessionToken, message, history = [] } = body;

  if (!sessionToken || !message) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const session = sessions.get(sessionToken);
  if (!session || Date.now() >= session.expiresAt) {
    return NextResponse.json(
      { error: "Session expired or invalid" },
      { status: 401 },
    );
  }

  const apiKey = process.env.NILLION_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NILLION_API_KEY not configured" },
      { status: 500 },
    );
  }

  const systemPrompt = `You are Kosyn AI, a personal health assistant for the patient.
You have access to the following health records:

${session.healthContext}

Rules:
- Never repeat raw PHI in full — summarize when referencing records
- Recommend professional consultation for clinical decisions
- Answer questions about health trends, medications, conditions
- Be conversational and empathetic
- Do not generate prescriptions or clinical documents`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
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
