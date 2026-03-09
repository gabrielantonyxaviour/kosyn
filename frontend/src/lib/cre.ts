export interface CREResponse {
  success: boolean;
  txHash?: string;
  data?: Record<string, unknown>;
  error?: string;
}

export async function triggerWorkflow(
  workflow: string,
  data: Record<string, unknown>,
): Promise<CREResponse> {
  const res = await fetch(`/api/cre/${workflow}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export type WorkflowStep = {
  id: string;
  label: string;
  status: "pending" | "processing" | "done" | "error";
  detail?: string;
};

export function getWorkflowSteps(workflow: string): WorkflowStep[] {
  const steps: Record<string, WorkflowStep[]> = {
    "record-upload": [
      {
        id: "encrypt",
        label: "AES-256-GCM encrypted (client-side)",
        status: "pending",
      },
      {
        id: "ipfs",
        label: "Storing encrypted blob on IPFS",
        status: "pending",
      },
      { id: "onchain", label: "Writing CID hash on-chain", status: "pending" },
    ],
    "consultation-processing": [
      {
        id: "encrypt",
        label: "Encrypted (ECDH + AES-256-GCM)",
        status: "pending",
      },
      {
        id: "tee-decrypt",
        label: "Decrypting inside CRE TEE",
        status: "pending",
      },
      {
        id: "pii",
        label: "Stripping PII (HIPAA Safe Harbor)",
        status: "pending",
      },
      {
        id: "ai",
        label: "AI analysis (Nillion nilAI TEE)",
        status: "pending",
      },
      { id: "ipfs", label: "Storing results on IPFS", status: "pending" },
      { id: "onchain", label: "Recording on-chain", status: "pending" },
    ],
    "provider-decryption": [
      { id: "consent", label: "Consent verified on-chain", status: "pending" },
      {
        id: "ipfs",
        label: "Fetching encrypted record from IPFS",
        status: "pending",
      },
      {
        id: "tee-decrypt",
        label: "Decrypting inside CRE TEE",
        status: "pending",
      },
      {
        id: "deidentify",
        label: "De-identifying (HIPAA Safe Harbor)",
        status: "pending",
      },
      {
        id: "deid-upload",
        label: "Uploading de-identified data to IPFS",
        status: "pending",
      },
      {
        id: "onchain",
        label: "Recording access grant on-chain",
        status: "pending",
      },
    ],
    "payment-mint": [
      { id: "verify", label: "Verifying payment", status: "pending" },
      { id: "mint", label: "Minting KUSD", status: "pending" },
      { id: "transfer", label: "Transferring to provider", status: "pending" },
    ],
    "provider-registration": [
      {
        id: "verify",
        label: "Verifying NPI via NPPES (ConfidentialHTTP)",
        status: "pending",
      },
      { id: "register", label: "Registering on-chain", status: "pending" },
    ],
    "data-marketplace": [
      { id: "decrypt", label: "Decrypting records", status: "pending" },
      { id: "anonymize", label: "Full anonymization", status: "pending" },
      { id: "aggregate", label: "Computing statistics", status: "pending" },
      { id: "distribute", label: "Distributing KUSD", status: "pending" },
    ],
    "patient-ai-attest": [
      { id: "context", label: "Collecting session context", status: "pending" },
      {
        id: "tee",
        label: "Processing in Nillion nilAI TEE",
        status: "pending",
      },
      {
        id: "attest",
        label: "Writing attestation on-chain",
        status: "pending",
      },
    ],
  };

  return steps[workflow] || [];
}
