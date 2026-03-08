/**
 * Nillion nilAI latency benchmark
 * Tests the 3 query types used in Kosyn AI:
 *   1. Patient KosynGPT — small conversational query
 *   2. Doctor KosynGPT — medium clinical doc generation
 *   3. CRE consultation — long transcript analysis (JSON output)
 *
 * Run: node scripts/test-nillion-latency.mjs
 */

const API_KEY = "b07487b4-55eb-4a7d-bb91-d022fa017e58";
const BASE_URL = "https://api.nilai.nillion.network";
const MODEL = "google/gemma-3-27b-it";

// ── Prompts ──────────────────────────────────────────────────────────────────

const PATIENT_SYSTEM = `You are Kosyn AI, a personal health assistant for the patient.
You have access to the following health records:

- Lisinopril 10mg (hypertension, prescribed 2025-01)
- Ibuprofen 400mg PRN (tension headaches)
- Blood pressure: 130/85 mmHg (last reading 2026-02-15)
- Allergies: Penicillin

Rules:
- Never repeat raw PHI in full — summarize when referencing records
- Recommend professional consultation for clinical decisions
- Be conversational and empathetic`;

const DOCTOR_SYSTEM = `You are KosynGPT, an AI clinical documentation assistant embedded in the Kosyn AI healthcare platform. You assist licensed healthcare providers with clinical documentation tasks.

You can generate SOAP Notes, Clinical Summaries, Medical Coding, Prescription Drafts, Referral Letters, and Prior Authorization Notes.

Rules:
1. If missing required clinical information, ASK before generating — do not guess.
2. Never use placeholders like [Patient Name] or TBD.
3. Use proper medical terminology and standard clinical documentation conventions.
4. For ICD-10 and CPT codes, always include the code AND its description.
5. Format output clearly with headers and sections.`;

const CLINICAL_SYSTEM = `You are a clinical AI assistant running inside a Trusted Execution Environment (TEE).
Your task is to analyze a medical consultation transcript and produce structured clinical documentation.

IMPORTANT PRIVACY RULES:
1. Strip ALL Protected Health Information (PHI) per HIPAA Safe Harbor.
2. Replace any PHI found with [REDACTED].
3. Never output raw patient identifiers.`;

const SAMPLE_TRANSCRIPT = `Doctor: Good morning. What brings you in today?
Patient: I've been having these headaches for about two weeks now. They're a dull pressure mostly behind my eyes, worst in the mornings.
Doctor: Any nausea, vision changes, sensitivity to light?
Patient: A little nausea sometimes. No vision changes.
Doctor: Let me check your vitals. Blood pressure is 130 over 85. Heart rate 72. Temperature normal.
Patient: Is that blood pressure reading okay? I'm on Lisinopril.
Doctor: It's mildly elevated. Have you been taking it consistently?
Patient: Yes, 10mg every morning.
Doctor: Any recent stressors? Sleep changes?
Patient: Work has been intense. Sleep is around 5-6 hours lately.
Doctor: That's likely contributing. I'm going to recommend continuing the Ibuprofen for the headaches, but be mindful — it can reduce the effectiveness of Lisinopril. We should also talk about sleep hygiene and stress management. I'll see you again in two weeks, and if it doesn't improve we'll consider an MRI.
Patient: Thank you, doctor.`;

// ── Query function ────────────────────────────────────────────────────────────

async function query({ label, messages, stream }) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`  stream=${stream}`);
  console.log(`${"─".repeat(60)}`);

  const t0 = Date.now();
  let ttfb = null;
  let totalTokens = 0;
  let outputText = "";

  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      stream,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  !! HTTP ${res.status}: ${err}`);
    return;
  }

  if (stream) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let signature = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (ttfb === null) ttfb = Date.now() - t0;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") continue;

        try {
          const chunk = JSON.parse(payload);
          if (chunk.signature) signature = chunk.signature;
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            outputText += content;
            totalTokens++;
          }
        } catch {}
      }
    }

    const total = Date.now() - t0;
    const approxOutputTokens = Math.round(outputText.split(/\s+/).length * 0.75);
    console.log(`  TTFB:          ${ttfb}ms`);
    console.log(`  Total:         ${total}ms`);
    console.log(`  ~Output words: ${outputText.split(/\s+/).length}`);
    console.log(`  ~Output tokens: ~${approxOutputTokens}`);
    console.log(`  Proof sig:     ${signature ? signature.slice(0, 20) + "…" : "none"}`);
    console.log(`  Preview:       ${outputText.slice(0, 120).replace(/\n/g, " ")}…`);
  } else {
    // non-streaming
    const data = await res.json();
    ttfb = Date.now() - t0;
    const total = Date.now() - t0;
    const content = data.choices?.[0]?.message?.content ?? "";
    const approxOutputTokens = Math.round(content.split(/\s+/).length * 0.75);
    console.log(`  Total (non-stream): ${total}ms`);
    console.log(`  ~Output words:      ${content.split(/\s+/).length}`);
    console.log(`  ~Output tokens:     ~${approxOutputTokens}`);
    console.log(`  Proof sig:          ${data.signature ? data.signature.slice(0, 20) + "…" : "none"}`);
    console.log(`  Preview:            ${content.slice(0, 120).replace(/\n/g, " ")}…`);
  }
}

// ── Run all 3 query types ─────────────────────────────────────────────────────

async function main() {
  console.log(`\nNillion nilAI latency test — model: ${MODEL}`);
  console.log(`Endpoint: ${BASE_URL}/v1/chat/completions`);

  // 1. Patient KosynGPT — small conversational query (streaming, as used in app)
  await query({
    label: "1. Patient KosynGPT — small chat (streaming)",
    stream: true,
    messages: [
      { role: "system", content: PATIENT_SYSTEM },
      { role: "user", content: "What medications am I currently on and are there any I should be careful about?" },
    ],
  });

  // 2. Doctor KosynGPT — medium clinical doc (streaming, as used in app)
  await query({
    label: "2. Doctor KosynGPT — SOAP note generation (streaming)",
    stream: true,
    messages: [
      { role: "system", content: DOCTOR_SYSTEM },
      {
        role: "user",
        content:
          "Generate a SOAP note for: 45yo male, chief complaint chronic lower back pain x3 months. BP 125/80, HR 68. MRI shows L4-L5 disc herniation. Currently on Naproxen 500mg BID. Plan: refer to physiotherapy, continue Naproxen, follow-up 6 weeks.",
      },
    ],
  });

  // 3. CRE consultation — long transcript analysis, non-streaming (as used in CRE workflow)
  await query({
    label: "3. CRE consultation processing — full transcript (non-streaming)",
    stream: false,
    messages: [
      { role: "system", content: CLINICAL_SYSTEM },
      {
        role: "user",
        content: `TRANSCRIPT:\n${SAMPLE_TRANSCRIPT}\n\nPRODUCE THE FOLLOWING (in JSON format):\n{\n  "soapNote": {"subjective":"...","objective":"...","assessment":"...","plan":"..."},\n  "summary": "2-3 sentence clinical summary",\n  "medicalCodes": {"icd10":["..."],"cpt":["..."]},\n  "drugInteractions": [{"drugs":["..."],"severity":"...","description":"..."}],\n  "followUp": {"timeframe":"...","instructions":"..."}\n}\n\nRespond ONLY with valid JSON.`,
      },
    ],
  });

  console.log(`\n${"─".repeat(60)}\nDone.\n`);
}

main().catch(console.error);
