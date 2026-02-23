/**
 * Client-side encryption utilities for Kosyn health records.
 *
 * Architecture:
 *   1. Patient registers a passkey (WebAuthn, platform authenticator)
 *   2. On every encrypt/decrypt operation, `navigator.credentials.get` is called
 *      with the `prf` extension — the authenticator returns a deterministic
 *      32-byte PRF output for the fixed salt "kosyn-key-v1"
 *   3. PRF output → HKDF-SHA256 → AES-256-GCM key (never stored anywhere)
 *   4. Records are encrypted in the browser before leaving the device
 */

export interface EncryptedBlob {
  v: 1;
  iv: number[];
  ct: number[];
  alg: "AES-256-GCM";
}

/** Fixed PRF salt — same value produces same key from same passkey. */
export const PRF_SALT = new TextEncoder().encode("kosyn-key-v1");

/** HKDF context label — exported for use in passkey.ts deriveKeyMaterial(). */
export const HKDF_INFO = new TextEncoder().encode("kosyn-health-record-v1");

/**
 * Derive an AES-256-GCM CryptoKey from a WebAuthn PRF output (32 bytes).
 * Uses HKDF-SHA256 with a fixed zero salt and context label.
 */
export async function deriveKeyFromPRF(
  prfOutput: ArrayBuffer,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    prfOutput,
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: HKDF_INFO,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * AES-256-GCM encrypt a plaintext string.
 * Returns a serialisable EncryptedBlob (safe for JSON / IPFS).
 */
export async function encryptRecord(
  plaintext: string,
  key: CryptoKey,
): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return {
    v: 1,
    iv: Array.from(iv),
    ct: Array.from(new Uint8Array(ct)),
    alg: "AES-256-GCM",
  };
}

/**
 * AES-256-GCM decrypt an EncryptedBlob.
 * Throws if the key is wrong or data is tampered (GCM authentication tag check).
 */
export async function decryptRecord(
  blob: EncryptedBlob,
  key: CryptoKey,
): Promise<string> {
  const iv = new Uint8Array(blob.iv);
  const ct = new Uint8Array(blob.ct);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/**
 * Export a CryptoKey as raw bytes.
 * Only works on extractable keys — throws if the key was created with extractable=false.
 */
export async function exportRawKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key);
}

/**
 * Wrap the patient's 32-byte key material with the CRE ECDH public key.
 *
 * Uses ephemeral P-256 ECDH to derive a shared AES-256-GCM wrapping key,
 * then encrypts the raw key bytes. Returns a base64-encoded JSON bundle:
 *   { ephemeralPubKey: JWK, iv: number[], ct: number[] }
 *
 * The bundle is stored on-chain (as UTF-8 bytes) via DataMarketplace.registerMarketplaceKey().
 * The CRE TEE unwraps it with its private key to decrypt patient IPFS records.
 */
export async function wrapKeyForMarketplace(
  rawKeyBytes: ArrayBuffer,
  recipientPubKeyB64: string,
): Promise<string> {
  const pubJwk = JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(recipientPubKeyB64), (c) => c.charCodeAt(0)),
    ),
  ) as JsonWebKey;

  const crePubKey = await crypto.subtle.importKey(
    "jwk",
    pubJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"],
  );

  const wrappingKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: crePubKey },
    ephemeral.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    rawKeyBytes,
  );

  const ephPubJwk = await crypto.subtle.exportKey("jwk", ephemeral.publicKey);
  const bundle = {
    ephemeralPubKey: ephPubJwk,
    iv: Array.from(iv),
    ct: Array.from(new Uint8Array(ct)),
  };

  return btoa(JSON.stringify(bundle));
}

/**
 * Encrypt arbitrary plaintext for the CRE TEE using ECDH + AES-256-GCM.
 *
 * Same ECDH pattern as wrapKeyForMarketplace(), but encrypts a full string
 * instead of a 32-byte key. Used to send transcripts, session data, etc.
 * to the CRE TEE without exposing plaintext to node operators.
 *
 * Returns base64-encoded JSON bundle: { ephemeralPubKey, iv, ct }
 */
export async function encryptForTee(
  plaintext: string,
  recipientPubKeyB64: string,
): Promise<string> {
  const pubJwk = JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(recipientPubKeyB64), (c) => c.charCodeAt(0)),
    ),
  ) as JsonWebKey;

  const crePubKey = await crypto.subtle.importKey(
    "jwk",
    pubJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"],
  );

  const wrappingKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: crePubKey },
    ephemeral.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    data,
  );

  const ephPubJwk = await crypto.subtle.exportKey("jwk", ephemeral.publicKey);
  const bundle = {
    ephemeralPubKey: ephPubJwk,
    iv: Array.from(iv),
    ct: Array.from(new Uint8Array(ct)),
  };

  return btoa(JSON.stringify(bundle));
}

/**
 * Unwrap a patient's key material using the CRE private key.
 *
 * Accepts the base64 bundle produced by wrapKeyForMarketplace() and the
 * CRE private key as a base64-encoded JWK string (from CRE secrets vault).
 * Returns an AES-256-GCM CryptoKey ready for decryptRecord().
 *
 * Runs server-side in the CRE TEE — never in the browser.
 */
export async function unwrapKeyFromMarketplace(
  wrappedBundle: string,
  recipientPrivKeyJwkB64: string,
): Promise<CryptoKey> {
  const { ephemeralPubKey, iv, ct } = JSON.parse(atob(wrappedBundle)) as {
    ephemeralPubKey: JsonWebKey;
    iv: number[];
    ct: number[];
  };

  const privJwk = JSON.parse(atob(recipientPrivKeyJwkB64)) as JsonWebKey;

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
