import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const CRE_URLS: Record<string, string | undefined> = {
  "payment-mint": process.env.CRE_PAYMENT_MINT_URL,
};

async function triggerCRE(workflow: string, data: Record<string, unknown>) {
  const url = CRE_URLS[workflow];
  if (!url) {
    console.error(`CRE URL not configured for workflow: ${workflow}`);
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    console.log(`[webhook] CRE ${workflow} result:`, result);
  } catch (err) {
    console.error(`[webhook] CRE ${workflow} fetch failed:`, err);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (sig && process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } else {
      // Fallback for local dev without webhook secret
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const type = session.metadata?.type;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null;
    const amount = session.amount_total ? session.amount_total / 100 : null;

    if (!paymentIntentId || !amount) {
      console.error("Webhook: missing payment_intent or amount_total", {
        paymentIntentId,
        amount,
      });
      return NextResponse.json({ received: true });
    }

    if (type === "deposit") {
      const recipientAddress = session.metadata?.walletAddress;
      if (!recipientAddress) {
        console.error("Webhook: deposit missing walletAddress in metadata");
        return NextResponse.json({ received: true });
      }
      await triggerCRE("payment-mint", {
        stripePaymentId: paymentIntentId,
        amount,
        recipientAddress,
      });
    } else if (type === "consultation") {
      const doctorAddress = session.metadata?.doctorAddress;
      if (!doctorAddress) {
        console.error(
          "Webhook: consultation missing doctorAddress in metadata",
        );
        return NextResponse.json({ received: true });
      }
      await triggerCRE("payment-mint", {
        stripePaymentId: paymentIntentId,
        amount,
        recipientAddress: doctorAddress,
      });
    }
  }

  return NextResponse.json({ received: true });
}
