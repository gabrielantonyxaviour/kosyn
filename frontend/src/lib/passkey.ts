import { deriveKeyFromPRF, PRF_SALT, HKDF_INFO } from "./crypto";

export interface PasskeyCredential {
  id: string;
  rawId: ArrayBuffer;
  type: string;
  prfEnabled: boolean;
}

// WebAuthn PRF extension types not yet in lib.dom.d.ts
type AuthExtInputWithPRF = AuthenticationExtensionsClientInputs & {
  prf?: { eval?: { first: ArrayBuffer; second?: ArrayBuffer } };
};
type AuthExtOutputWithPRF = AuthenticationExtensionsClientOutputs & {
  prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } };
};

/**
 * Create a passkey with PRF extension enabled.
 * PRF (Pseudo-Random Function) lets us derive a deterministic AES key
 * from the passkey using a fixed salt — the key never leaves the device.
 */
export async function createCredential(
  username: string,
): Promise<PasskeyCredential | null> {
  if (!window.PublicKeyCredential) return null;

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = new TextEncoder().encode(username);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Kosyn AI", id: window.location.hostname },
      user: {
        id: userId,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "required",
      },
      extensions: { prf: {} } as AuthExtInputWithPRF,
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) return null;

  const exts = credential.getClientExtensionResults() as AuthExtOutputWithPRF;
  const prfEnabled = exts.prf?.enabled ?? false;

  return {
    id: credential.id,
    rawId: credential.rawId,
    type: credential.type,
    prfEnabled,
  };
}

/**
 * Derive an AES-256-GCM CryptoKey from the user's passkey via the PRF extension.
 *
 * This triggers the platform authenticator (Face ID / Touch ID / Windows Hello).
 * The PRF output is fed into HKDF to produce a deterministic AES key.
 * The key is NEVER stored — it is re-derived on every encrypt/decrypt operation.
 *
 * Same passkey + same salt → same key, every time.
 */
export async function deriveEncryptionKey(): Promise<CryptoKey | null> {
  if (!window.PublicKeyCredential) return null;

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  let assertion: PublicKeyCredential | null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challenge.buffer as ArrayBuffer,
        userVerification: "required",
        extensions: {
          prf: { eval: { first: PRF_SALT.buffer as ArrayBuffer } },
        } as AuthExtInputWithPRF,
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
  } catch {
    return null;
  }

  if (!assertion) return null;

  const exts = assertion.getClientExtensionResults() as AuthExtOutputWithPRF;
  const prfOutput = exts.prf?.results?.first;

  if (!prfOutput) {
    // PRF not supported by this authenticator
    throw new Error(
      "Your authenticator does not support the PRF extension required for encryption. " +
        "Use Chrome 116+, Safari 17+, or Edge 116+.",
    );
  }

  return deriveKeyFromPRF(prfOutput);
}

/**
 * Derive the same 32-byte key material as deriveEncryptionKey(), but returned
 * as a raw ArrayBuffer (extractable) so it can be wrapped for the marketplace.
 *
 * Triggers the platform authenticator (Face ID / Touch ID / Windows Hello).
 * The returned bytes are the patient's AES-256-GCM key material — used only
 * for ECDH-wrapping before registering on-chain. Never stored or transmitted raw.
 */
export async function deriveKeyMaterial(): Promise<ArrayBuffer | null> {
  if (!window.PublicKeyCredential) return null;

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  let assertion: PublicKeyCredential | null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challenge.buffer as ArrayBuffer,
        userVerification: "required",
        extensions: {
          prf: { eval: { first: PRF_SALT.buffer as ArrayBuffer } },
        } as AuthExtInputWithPRF,
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
  } catch {
    return null;
  }

  if (!assertion) return null;

  const exts = assertion.getClientExtensionResults() as AuthExtOutputWithPRF;
  const prfOutput = exts.prf?.results?.first;

  if (!prfOutput) {
    throw new Error(
      "Your authenticator does not support the PRF extension required for encryption. " +
        "Use Chrome 116+, Safari 17+, or Edge 116+.",
    );
  }

  // Same HKDF derivation as deriveKeyFromPRF, but via deriveBits (returns raw bytes)
  const baseKey = await crypto.subtle.importKey(
    "raw",
    prfOutput,
    "HKDF",
    false,
    ["deriveBits"],
  );

  return crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: HKDF_INFO,
    },
    baseKey,
    256,
  );
}

/**
 * Simple passkey assertion (no PRF) — used for authentication-only flows.
 */
export async function getAssertion(challenge?: Uint8Array): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  const actualChallenge =
    challenge || crypto.getRandomValues(new Uint8Array(32));

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: actualChallenge.buffer as ArrayBuffer,
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}
