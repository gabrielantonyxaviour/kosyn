/**
 * Nillion nilAI client — TEE-based inference with cryptographic proofs.
 *
 * Base URL: https://api.nilai.nillion.network
 * Auth: Authorization: Bearer {NILLION_API_KEY}
 * Chat: POST /v1/chat/completions (OpenAI-compatible)
 * Response includes `signature` field — secp256k1 ECDSA over response body.
 * Attestation: GET /v1/attestation/report — proves code runs in AMD SEV-SNP + NVIDIA CC TEE.
 */

export const NILLION_BASE_URL =
  process.env.NILLION_BASE_URL || "https://api.nilai.nillion.network";

export const NILLION_MODEL =
  process.env.NILLION_MODEL || "google/gemma-3-27b-it";

export interface NillionProof {
  signature: string;
  model: string;
  timestamp: number;
}

export interface AttestationReport {
  nonce: string;
  verifying_key: string;
  cpu_attestation: string;
  gpu_attestation: string;
}

export interface NillionModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

function getApiKey(): string {
  return process.env.NILLION_API_KEY || "";
}

function authHeader(): Record<string, string> {
  return { Authorization: `Bearer ${getApiKey()}` };
}

/** GET /v1/public_key — cached, used for proof verification */
let _publicKeyCache: string | null = null;
export async function getPublicKey(): Promise<string> {
  if (_publicKeyCache) return _publicKeyCache;
  const res = await fetch(`${NILLION_BASE_URL}/v1/public_key`, {
    headers: authHeader(),
  });
  if (!res.ok)
    throw new Error(`Failed to fetch Nillion public key: ${res.status}`);
  const text = await res.text();
  _publicKeyCache = text.trim();
  return _publicKeyCache;
}

/** GET /v1/attestation/report — TEE proof (CPU + GPU attestation) */
export async function getAttestation(
  nonce?: string,
): Promise<AttestationReport> {
  const n =
    nonce ||
    Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  const res = await fetch(
    `${NILLION_BASE_URL}/v1/attestation/report?nonce=${n}`,
    {
      headers: authHeader(),
    },
  );
  if (!res.ok) throw new Error(`Attestation failed: ${res.status}`);
  return res.json() as Promise<AttestationReport>;
}

/** GET /v1/models — list available models */
export async function listModels(): Promise<NillionModel[]> {
  const res = await fetch(`${NILLION_BASE_URL}/v1/models`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`Failed to list models: ${res.status}`);
  const data = (await res.json()) as { data: NillionModel[] };
  return data.data;
}

/** GET /v1/health */
export async function healthCheck(): Promise<{
  status: string;
  uptime?: number;
}> {
  const res = await fetch(`${NILLION_BASE_URL}/v1/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}
