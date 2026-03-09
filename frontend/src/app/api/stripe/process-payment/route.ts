import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const schema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // 1. Retrieve the Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(
      parsed.data.sessionId,
    );

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed", code: "NOT_PAID" },
        { status: 400 },
      );
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null;
    const amount = session.amount_total ? session.amount_total / 100 : null;
    const recipientAddress = session.metadata?.walletAddress;

    if (!paymentIntentId || !amount || !recipientAddress) {
      return NextResponse.json(
        { error: "Missing payment data", code: "INCOMPLETE" },
        { status: 400 },
      );
    }

    // 2. Trigger CRE payment-mint workflow
    const creUrl = process.env.CRE_PAYMENT_MINT_URL;
    if (!creUrl) {
      return NextResponse.json(
        { error: "CRE service not configured", code: "CRE_OFFLINE" },
        { status: 503 },
      );
    }

    const creRes = await fetch(creUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stripePaymentId: paymentIntentId,
        amount,
        recipientAddress,
      }),
    });

    const creResult = await creRes.json();

    if (!creRes.ok) {
      return NextResponse.json(
        {
          error: creResult.error ?? "CRE workflow failed",
          code: "CRE_FAILED",
        },
        { status: 502 },
      );
    }

    // 3. Return success with CRE result (may contain txHash)
    return NextResponse.json({
      success: true,
      amount,
      recipientAddress,
      paymentIntentId,
      cre: creResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
