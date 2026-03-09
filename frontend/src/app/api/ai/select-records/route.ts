import { NextRequest, NextResponse } from "next/server";
import { NILLION_BASE_URL, NILLION_MODEL } from "@/lib/nillion";

interface RecordSummary {
  id: number;
  recordType: string;
  label: string;
  formData?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    transcript?: string;
    records?: RecordSummary[];
  };

  const { transcript, records = [] } = body;
  if (!transcript?.trim()) {
    return NextResponse.json(
      { error: "transcript is required" },
      { status: 400 },
    );
  }

  if (records.length === 0) {
    return NextResponse.json({
      selectedIds: [],
      reasoning: "No records available.",
    });
  }

  const apiKey = process.env.NILLION_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NILLION_API_KEY not configured" },
      { status: 500 },
    );
  }

  const recordList = records
    .map((r) => {
      const summary = r.formData
        ? Object.entries(r.formData)
            .slice(0, 3)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : "no data";
      return `ID ${r.id}: ${r.label} (${r.recordType}) — ${summary}`;
    })
    .join("\n");

  const prompt = `You are a clinical AI. Given this consultation transcript and list of patient records, identify which records are most relevant for generating clinical documentation.

TRANSCRIPT:
${transcript}

AVAILABLE RECORDS:
${recordList}

Return ONLY a JSON array of record IDs that are relevant. Example: [1, 3, 5]
If all records are relevant, return all IDs. If none are relevant, return [].
Respond with ONLY the JSON array, no explanation.`;

  try {
    const res = await fetch(`${NILLION_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NILLION_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        stream: false,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({
        selectedIds: records.map((r) => r.id),
        reasoning: "AI unavailable — all records selected.",
      });
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Parse JSON array from response
    const match = content.match(/\[[\d,\s]*\]/);
    if (match) {
      const ids = JSON.parse(match[0]) as number[];
      return NextResponse.json({
        selectedIds: ids,
        reasoning: "AI-selected based on transcript relevance.",
      });
    }

    return NextResponse.json({
      selectedIds: records.map((r) => r.id),
      reasoning: "Could not parse AI response — all records selected.",
    });
  } catch {
    return NextResponse.json({
      selectedIds: records.map((r) => r.id),
      reasoning: "Error — all records selected.",
    });
  }
}
