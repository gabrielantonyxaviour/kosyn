import { NextRequest, NextResponse } from "next/server";
import { conversations, getPatientConversations } from "@/lib/ai-conversations";
import type { ConversationMessage } from "@/lib/ai-conversations";

export async function GET(req: NextRequest) {
  const patientAddress = req.nextUrl.searchParams.get("patientAddress");
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const conv = conversations.get(id);
    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(conv);
  }

  if (!patientAddress) {
    return NextResponse.json(
      { error: "Missing patientAddress" },
      { status: 400 },
    );
  }

  return NextResponse.json(getPatientConversations(patientAddress));
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    patientAddress?: string;
    title?: string;
  };

  if (!body.patientAddress) {
    return NextResponse.json(
      { error: "Missing patientAddress" },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const conv = {
    id,
    patientAddress: body.patientAddress,
    title: body.title || "New conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  conversations.set(id, conv);
  return NextResponse.json(conv);
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as {
    id?: string;
    title?: string;
    messages?: ConversationMessage[];
  };

  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const conv = conversations.get(body.id);
  if (!conv) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  if (body.title) conv.title = body.title;
  if (body.messages) conv.messages = body.messages;
  conv.updatedAt = Date.now();

  return NextResponse.json(conv);
}

export async function DELETE(req: NextRequest) {
  const body = (await req.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  conversations.delete(body.id);
  return NextResponse.json({ success: true });
}
