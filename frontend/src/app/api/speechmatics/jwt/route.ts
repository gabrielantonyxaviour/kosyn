import { NextResponse } from "next/server";

export async function POST() {
  try {
    const apiKey = process.env.SPEECHMATICS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Speechmatics API key not configured" },
        { status: 500 },
      );
    }

    // For hackathon: return the API key directly
    // In production: use @speechmatics/auth to create a proper JWT
    return NextResponse.json({ jwt: apiKey });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
