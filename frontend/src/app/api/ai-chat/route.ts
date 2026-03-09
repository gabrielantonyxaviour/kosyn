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
        // Use non-streaming so Nillion returns the signature proof
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
              stream: false,
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

        const data = (await nillionRes.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          signature?: string;
          model?: string;
        };

        const content = data.choices?.[0]?.message?.content ?? "";

        // Simulate streaming by sending text in word-sized chunks
        const words = content.split(/(?<=\s)/);
        let batch = "";
        for (const word of words) {
          batch += word;
          if (batch.length >= 8) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "text", content: batch }) + "\n",
              ),
            );
            batch = "";
          }
        }
        if (batch) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "text", content: batch }) + "\n",
            ),
          );
        }

        // Send done with proof from the non-streaming signature
        const donePayload: Record<string, unknown> = { type: "done" };
        if (data.signature) {
          donePayload.proof = {
            signature: data.signature,
            model: data.model ?? NILLION_MODEL,
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
