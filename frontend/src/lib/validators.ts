import { z } from "zod";

export const workflowSchema = z.enum([
  "record-upload",
  "provider-registration",
  "provider-decryption",
  "consultation-processing",
  "payment-mint",
  "data-marketplace",
  "patient-ai-attest",
]);

export const stripeCheckoutSchema = z.object({
  amount: z.number().positive(),
  doctorName: z.string().min(1),
  doctorAddress: z.string().startsWith("0x"),
});
