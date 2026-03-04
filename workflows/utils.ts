/**
 * Shared utilities for CRE workflows.
 */

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

// ---- TEE Encryption / Decryption -------------------------------------------

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

/**
 * Decrypt data encrypted with encryptForTee() using the CRE private key.
 *
 * Accepts the base64 bundle `{ ephemeralPubKey, iv, ct }` and the
 * CRE ECDH private key as a base64-encoded JWK string.
 * Uses ECDH to derive the shared AES-256-GCM key, then decrypts.
 *
 * Runs inside CRE TEE — raw plaintext never leaves the enclave.
 */
export async function decryptInTee(
  bundle: string,
  privKeyB64: string,
): Promise<string> {
  const decoded = new TextDecoder().decode(base64ToBytes(bundle));
  const { ephemeralPubKey, iv, ct } = JSON.parse(decoded) as {
    ephemeralPubKey: JsonWebKey;
    iv: number[];
    ct: number[];
  };

  const privJwk = JSON.parse(
    new TextDecoder().decode(base64ToBytes(privKeyB64)),
  ) as JsonWebKey;

  const privKey = await crypto.subtle.importKey(
    "jwk",
    privJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"],
  );

  const ephPubKey = await crypto.subtle.importKey(
    "jwk",
    ephemeralPubKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  const sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: ephPubKey },
    privKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const plainBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    sharedKey,
    new Uint8Array(ct),
  );

  return new TextDecoder().decode(plainBytes);
}

/**
 * Unwrap an ECDH-wrapped AES-256-GCM key using the CRE private key.
 * Mirrors wrapKeyForMarketplace() from frontend/src/lib/crypto.ts.
 * Returns a CryptoKey ready for decryptBlob().
 */
export async function unwrapKeyFromMarketplace(
  wrappedBundle: string,
  recipientPrivKeyJwkB64: string,
): Promise<CryptoKey> {
  const decoded = new TextDecoder().decode(base64ToBytes(wrappedBundle));
  const { ephemeralPubKey, iv, ct } = JSON.parse(decoded) as {
    ephemeralPubKey: JsonWebKey;
    iv: number[];
    ct: number[];
  };

  const privJwk = JSON.parse(
    new TextDecoder().decode(base64ToBytes(recipientPrivKeyJwkB64)),
  ) as JsonWebKey;

  const privKey = await crypto.subtle.importKey(
    "jwk",
    privJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"],
  );

  const ephPubKey = await crypto.subtle.importKey(
    "jwk",
    ephemeralPubKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  const wrappingKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: ephPubKey },
    privKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const rawBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    wrappingKey,
    new Uint8Array(ct),
  );

  return crypto.subtle.importKey(
    "raw",
    rawBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

/** AES-256-GCM decrypt an encrypted blob back to plaintext JSON. */
export async function decryptBlob(
  blob: { iv: number[]; ct: number[] },
  key: CryptoKey,
): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(blob.iv) },
    key,
    new Uint8Array(blob.ct),
  );
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
