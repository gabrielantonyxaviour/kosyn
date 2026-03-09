import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

const schema = z.object({
  amount: z.number().positive().min(1).max(10000),
  walletAddress: z.string().startsWith("0x"),
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

async function checkCREBridge(): Promise<boolean> {
  const mintUrl = process.env.CRE_PAYMENT_MINT_URL;
  if (!mintUrl) return false;
  try {
    const origin = new URL(mintUrl).origin;
    const res = await fetch(`${origin}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const online = await checkCREBridge();
  return NextResponse.json({ cre: online });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { amount, walletAddress } = parsed.data;

    const bridgeOnline = await checkCREBridge();
    if (!bridgeOnline) {
      return NextResponse.json(
        {
          error:
            "The CRE service is currently offline. Please reach out to gabrielantony56@gmail.com to have it turned back on.",
          code: "CRE_OFFLINE",
        },
        { status: 503 },
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${amount} KUSD`,
              description:
                "Kosyn AI — KosynUSD for healthcare services on Avalanche",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/patients/deposit?payment=success&amount=${amount}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/patients/deposit?payment=cancelled`,
      metadata: {
        type: "deposit",
        walletAddress,
        amount: String(amount),
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
