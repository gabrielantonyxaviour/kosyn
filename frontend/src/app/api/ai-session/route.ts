import { NextRequest, NextResponse } from "next/server";
import { sessions, cleanExpiredSessions } from "@/lib/ai-sessions";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    patientAddress?: string;
    healthContext?: string;
    expiresInMinutes?: number;
  };
  const { patientAddress, healthContext, expiresInMinutes } = body;

  if (!patientAddress || !healthContext) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }
  if (![15, 30, 60, 240].includes(expiresInMinutes ?? 0)) {
    return NextResponse.json(
      { error: "Invalid session duration. Must be 15, 30, 60, or 240." },
      { status: 400 },
    );
  }

  // Sweep expired sessions before adding new one
  cleanExpiredSessions();

  const sessionToken = crypto.randomUUID();
  const expiresAt = Date.now() + (expiresInMinutes ?? 60) * 60000;

  sessions.set(sessionToken, {
    healthContext,
    expiresAt,
    patientAddress,
    createdAt: Date.now(),
  });

  return NextResponse.json({ sessionToken, expiresAt });
}

export async function DELETE(req: NextRequest) {
  const body = (await req.json()) as { sessionToken?: string };
  const { sessionToken } = body;

  if (!sessionToken) {
    return NextResponse.json(
      { error: "Missing sessionToken" },
      { status: 400 },
    );
  }

  sessions.delete(sessionToken);
  return NextResponse.json({ success: true });
}
