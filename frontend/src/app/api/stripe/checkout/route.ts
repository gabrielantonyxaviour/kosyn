import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripeCheckoutSchema } from "@/lib/validators";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = stripeCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Invalid input: amount must be a positive number and doctorName must be non-empty",
        },
        { status: 400 },
      );
    }

    const { amount, doctorName, doctorAddress, walletAddress } = parsed.data;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Consultation with ${doctorName}`,
              description: "Kosyn AI — Healthcare Consultation",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/patients/consultations?payment=success&amount=${amount}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/patients/consultations?payment=cancelled`,
      metadata: {
        type: "consultation",
        doctorName,
        doctorAddress,
        walletAddress,
        amount: String(amount),
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
