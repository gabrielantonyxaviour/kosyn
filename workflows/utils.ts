/**
 * Shared utilities for CRE workflows.
 *
 * IMPORTANT: All crypto uses @noble libraries (pure JS) — NOT crypto.subtle.
 * The CRE simulator WASM sandbox has no Web Crypto API, no atob/btoa, no crypto global.
 */
import { p256 } from "@noble/curves/nist.js";
import { gcm } from "@noble/ciphers/aes.js";

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Encode a UTF-8 string to base64 (no btoa dependency). */
export function stringToBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  return bytesToBase64(bytes);
}

/** Encode a Uint8Array to base64 (no btoa dependency). */
export function bytesToBase64(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += BASE64_CHARS[(b0 >> 2) & 0x3f];
    result += BASE64_CHARS[((b0 << 4) | (b1 >> 4)) & 0x3f];
    result +=
      i + 1 < bytes.length ? BASE64_CHARS[((b1 << 2) | (b2 >> 6)) & 0x3f] : "=";
    result += i + 2 < bytes.length ? BASE64_CHARS[b2 & 0x3f] : "=";
  }
  return result;
}

/**
 * Parse a Nillion nilAI response to extract the AI text.
 *
 * Response format (standard OpenAI JSON, non-streaming):
 *   {"choices":[{"message":{"role":"assistant","content":"..."},"finish_reason":"stop"}],"signature":"..."}
 *
 * Falls back to raw string if parsing fails.
 */
export function parseNillionResponse(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = parsed.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }
  } catch {
    // fall through
  }
  return raw;
}

/** @deprecated Use parseNillionResponse instead */
export function parseClaudeResponse(raw: string): string {
  return parseNillionResponse(raw);
}

/**
 * Parse a Nillion nilAI response, extracting both text content and the cryptographic proof.
 * Returns `{ text, proof }` where `proof` is present only if `signature` is in the response.
 */
export function parseNillionResponseWithProof(raw: string): {
  text: string;
  proof?: { signature: string; model: string };
} {
  try {
    const parsed = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>;
      signature?: string;
      model?: string;
    };
    const content = parsed.choices?.[0]?.message?.content;
    const text =
      typeof content === "string" && content.trim() ? content.trim() : raw;
    const proof = parsed.signature
      ? { signature: parsed.signature, model: parsed.model || "unknown" }
      : undefined;
    return { text, proof };
  } catch {
    return { text: raw };
  }
}

// ---- TEE Encryption / Decryption (noble — no crypto.subtle) -----------------

/** Decode a base64 string to bytes (no atob dependency in CRE runtime). */
export function base64ToBytes(b64: string): Uint8Array {
  const lookup = new Uint8Array(256);
  for (let i = 0; i < BASE64_CHARS.length; i++) {
    lookup[BASE64_CHARS.charCodeAt(i)] = i;
  }
  const len = b64.length;
  let padLen = 0;
  if (b64[len - 1] === "=") padLen++;
  if (b64[len - 2] === "=") padLen++;
  const byteLen = (len * 3) / 4 - padLen;
  const bytes = new Uint8Array(byteLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[b64.charCodeAt(i)];
    const b = lookup[b64.charCodeAt(i + 1)];
    const c = lookup[b64.charCodeAt(i + 2)];
    const d = lookup[b64.charCodeAt(i + 3)];
    bytes[p++] = (a << 2) | (b >> 4);
    if (p < byteLen) bytes[p++] = ((b & 0xf) << 4) | (c >> 2);
    if (p < byteLen) bytes[p++] = ((c & 0x3) << 6) | d;
  }
  return bytes;
}

/** Decode a base64url string (JWK format) to bytes. */
function base64UrlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return base64ToBytes(b64);
}

/**
 * ECDH key agreement using noble P-256.
 * Takes a JWK private key and a JWK public key, returns the raw x-coordinate
 * of the shared point (32 bytes) — identical to Web Crypto's deriveKey(ECDH → AES-GCM 256).
 */
function ecdhDeriveKey(
  privJwk: { d?: string },
  pubJwk: { x?: string; y?: string },
): Uint8Array {
  if (!privJwk.d) throw new Error("Private JWK missing 'd' field");
  if (!pubJwk.x || !pubJwk.y)
    throw new Error("Public JWK missing 'x' or 'y' field");

  const privD = base64UrlToBytes(privJwk.d);
  const pubX = base64UrlToBytes(pubJwk.x);
  const pubY = base64UrlToBytes(pubJwk.y);

  // Build uncompressed public key: 04 || x || y
  const pubRaw = new Uint8Array(65);
  pubRaw[0] = 0x04;
  pubRaw.set(pubX, 1);
  pubRaw.set(pubY, 33);

  // ECDH: shared point (compressed = 02/03 || x)
  const shared = p256.getSharedSecret(privD, pubRaw);
  // x-coordinate = AES-256-GCM key (matches Web Crypto's deriveKey)
  return shared.slice(1, 33);
}

/**
 * Decrypt data encrypted with encryptForTee() using the CRE private key.
 *
 * Uses pure JS ECDH (noble P-256) + AES-256-GCM (noble ciphers).
 * No crypto.subtle — works inside CRE simulator WASM sandbox.
 *
 * Runs inside CRE TEE — raw plaintext never leaves the enclave.
 */
export function decryptInTee(bundle: string, privKeyB64: string): string {
  const decoded = new TextDecoder().decode(base64ToBytes(bundle));
  const { ephemeralPubKey, iv, ct } = JSON.parse(decoded) as {
    ephemeralPubKey: { x?: string; y?: string };
    iv: number[];
    ct: number[];
  };

  const privJwk = JSON.parse(
    new TextDecoder().decode(base64ToBytes(privKeyB64)),
  ) as { d?: string };

  const aesKey = ecdhDeriveKey(privJwk, ephemeralPubKey);
  const aes = gcm(aesKey, new Uint8Array(iv));
  const plainBytes = aes.decrypt(new Uint8Array(ct));
  return new TextDecoder().decode(plainBytes);
}

/**
 * Unwrap an ECDH-wrapped AES-256-GCM key using the CRE private key.
 * Mirrors wrapKeyForMarketplace() from frontend/src/lib/crypto.ts.
 * Returns raw 32-byte AES key as Uint8Array.
 */
export function unwrapKeyFromMarketplace(
  wrappedBundle: string,
  recipientPrivKeyJwkB64: string,
): Uint8Array {
  const decoded = new TextDecoder().decode(base64ToBytes(wrappedBundle));
  const { ephemeralPubKey, iv, ct } = JSON.parse(decoded) as {
    ephemeralPubKey: { x?: string; y?: string };
    iv: number[];
    ct: number[];
  };

  const privJwk = JSON.parse(
    new TextDecoder().decode(base64ToBytes(recipientPrivKeyJwkB64)),
  ) as { d?: string };

  const wrappingKey = ecdhDeriveKey(privJwk, ephemeralPubKey);
  const aes = gcm(wrappingKey, new Uint8Array(iv));
  return aes.decrypt(new Uint8Array(ct));
}

/** AES-256-GCM decrypt an encrypted blob back to plaintext JSON. */
export function decryptBlob(
  blob: { iv: number[]; ct: number[] },
  key: Uint8Array,
): string {
  const aes = gcm(key, new Uint8Array(blob.iv));
  const pt = aes.decrypt(new Uint8Array(blob.ct));
  return new TextDecoder().decode(pt);
}

// ---- HIPAA Safe Harbor De-identification -----------------------------------

const PROVIDER_FIELDS = new Set([
  "surgeon",
  "assistantSurgeon",
  "anesthesiologist",
  "cardiologist",
  "referringPhysician",
  "attendingPhysician",
  "clinician",
  "administeredBy",
  "reviewedBy",
  "orderingPhysician",
  "pathologist",
  "therapist",
  "dietitian",
  "dentist",
  "examiner",
  "triageNurse",
  "radiologist",
  "specificProvider",
  "referringProvider",
  "orderingProvider",
  "prescribedBy",
  "documentedBy",
  "lab",
  "facility",
  "referringFacility",
]);

const DATE_FIELDS = new Set([
  "date",
  "dateOfSurgery",
  "admissionDate",
  "dischargeDate",
  "sessionDate",
  "dateAdministered",
  "collectionDate",
  "specimenDate",
  "reportDate",
  "assessmentDate",
  "visitDate",
  "arrivalDate",
  "referralDate",
  "startDate",
  "nextDue",
  "nextAppointment",
  "followUpDate",
  "reconciliationDate",
  "onsetDate",
  "lastOccurrence",
  "dateRecorded",
  "examDate",
  "testDate",
]);

const FREE_TEXT_FIELDS = new Set([
  "notes",
  "clinicalNotes",
  "operativeFindings",
  "postOpPlan",
  "treatmentPlanUpdate",
  "dischargeInstructions",
  "returnToErInstructions",
  "followUpInstructions",
  "restrictions",
  "familyImplications",
  "questionsForSpecialist",
  "clinicalHistory",
  "hpi",
  "clinicalInterpretation",
]);

function stripYear(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/\b(\d{4})\b/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  if (year < 1900 || year > 2100) return null;
  return match[1];
}

/**
 * HIPAA Safe Harbor de-identification.
 * Strips all 18 identifier categories from structured health record form data.
 */
export function deidentify(
  formData: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(formData)) {
    if (PROVIDER_FIELDS.has(key)) continue;
    if (FREE_TEXT_FIELDS.has(key)) continue;

    if (DATE_FIELDS.has(key)) {
      const year = stripYear(value);
      if (year !== null) result[key] = year;
      continue;
    }

    if (key === "medications") {
      try {
        const items = JSON.parse(value) as Record<string, string>[];
        const cleaned = items.map((item) => {
          const kept: Record<string, string> = {};
          for (const f of [
            "name",
            "dose",
            "unit",
            "route",
            "frequency",
            "indication",
          ]) {
            if (f in item) kept[f] = item[f];
          }
          return kept;
        });
        result[key] = JSON.stringify(cleaned);
      } catch {
        /* omit */
      }
      continue;
    }

    if (key === "tests" || key === "labResults") {
      try {
        const items = JSON.parse(value) as Record<string, string>[];
        const cleaned = items.map((item) => {
          const kept: Record<string, string> = {};
          for (const f of [
            "testName",
            "loincCode",
            "value",
            "unit",
            "refRange",
            "flag",
          ]) {
            if (f in item) kept[f] = item[f];
          }
          return kept;
        });
        result[key] = JSON.stringify(cleaned);
      } catch {
        /* omit */
      }
      continue;
    }

    result[key] = value;
  }

  return result;
}
