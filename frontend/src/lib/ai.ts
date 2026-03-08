/**
 * AI Service Client — Nillion nilAI (TEE-based inference with cryptographic proofs)
 *
 * All app-level AI inference routes through Nillion's nilAI API.
 * Endpoint: NILLION_BASE_URL (https://api.nilai.nillion.network)
 * Auth: Authorization: Bearer {NILLION_API_KEY} — server-side only
 *
 * Every response includes a `signature` field — secp256k1 ECDSA proof that
 * the response was generated inside an AMD SEV-SNP + NVIDIA CC TEE enclave.
 */

import { NILLION_BASE_URL, NILLION_MODEL } from "./nillion";

const NILLION_API_KEY = process.env.NILLION_API_KEY || "";

/** Map legacy model names to Nillion model IDs */
function resolveModel(model?: "sonnet" | "opus"): string {
  if (model === "opus") return "openai/gpt-oss-20b";
  return NILLION_MODEL; // default: google/gemma-3-27b-it
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  prompt?: string;
  messages?: ChatMessage[];
  sessionId?: string;
  model?: "sonnet" | "opus";
  maxTurns?: number;
  isPlan?: boolean;
  workingDirectory?: string;
}

export interface ChatEvent {
  type:
    | "claude_event"
    | "raw_output"
    | "error"
    | "completion"
    | "context_overflow";
  sessionId: string;
  timestamp: string;
  data: unknown;
}

export interface NillionProof {
  signature: string;
  model: string;
  timestamp: number;
}

/**
 * Send a prompt to Nillion nilAI and get a streaming response.
 * Returns an async generator of ChatEvent objects (same interface as before).
 * Yields `raw_output` events with text chunks as they arrive via SSE.
 */
export async function* chat(
  request: ChatRequest,
): AsyncGenerator<ChatEvent, void, undefined> {
  const model = resolveModel(request.model);
  const messages: ChatMessage[] = request.messages ?? [
    { role: "user", content: request.prompt ?? "" },
  ];

  const response = await fetch(`${NILLION_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NILLION_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.2, stream: true }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`Nillion error ${response.status}: ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  const sessionId = `nillion-${Date.now()}`;

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
      if (payload === "[DONE]") return;

      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{
            delta?: { content?: string };
            finish_reason?: string | null;
          }>;
        };
        const content = chunk.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content) {
          yield {
            type: "raw_output",
            sessionId,
            timestamp: new Date().toISOString(),
            data: content,
          };
        }
        if (chunk.choices?.[0]?.finish_reason === "stop") return;
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

/**
 * Send a prompt and collect the full text response (non-streaming).
 * Also returns `proof` from Nillion's cryptographic signature.
 */
export async function chatSync(
  request: ChatRequest,
): Promise<{ text: string; sessionId: string; proof?: NillionProof }> {
  const model = resolveModel(request.model);
  const messages: ChatMessage[] = request.messages ?? [
    { role: "user", content: request.prompt ?? "" },
  ];

  const response = await fetch(`${NILLION_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NILLION_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.2, stream: false }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`Nillion error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    signature?: string;
    model?: string;
  };

  const text = data.choices[0]?.message?.content ?? "";
  const proof: NillionProof | undefined = data.signature
    ? {
        signature: data.signature,
        model: data.model ?? model,
        timestamp: Date.now(),
      }
    : undefined;

  return { text: text.trim(), sessionId: `nillion-${Date.now()}`, proof };
}

/**
 * Health check — verify Nillion nilAI is reachable.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${NILLION_BASE_URL}/v1/health`);
    const data = (await response.json()) as { status?: string };
    return response.ok && !!data.status;
  } catch {
    return false;
  }
}
