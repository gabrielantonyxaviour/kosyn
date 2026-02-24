"use client";

import { useState, useCallback } from "react";
import {
  createCredential,
  deriveEncryptionKey,
  deriveKeyMaterial,
  getAssertion,
  isPasskeySupported,
  type PasskeyCredential,
} from "@/lib/passkey";
import { encryptRecord, decryptRecord, type EncryptedBlob } from "@/lib/crypto";

export function usePasskey() {
  const [credential, setCredential] = useState<PasskeyCredential | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const supported = typeof window !== "undefined" && isPasskeySupported();

  const register = useCallback(async (username: string) => {
    setIsLoading(true);
    try {
      const cred = await createCredential(username);
      if (cred) setCredential(cred);
      return cred;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verify = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAssertion();
      setIsVerified(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Trigger the platform authenticator (Face ID / Touch ID) and derive
   * the AES-256-GCM encryption key via WebAuthn PRF.
   * Returns null if the user cancels or PRF is unsupported.
   */
  const deriveKey = useCallback(async (): Promise<CryptoKey | null> => {
    setIsLoading(true);
    try {
      return await deriveEncryptionKey();
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Encrypt a string using the patient's passkey-derived AES key.
   * Triggers the platform authenticator.
   */
  const encryptData = useCallback(
    async (data: string): Promise<EncryptedBlob | null> => {
      const key = await deriveKey();
      if (!key) return null;
      return encryptRecord(data, key);
    },
    [deriveKey],
  );

  /**
   * Decrypt an EncryptedBlob using the patient's passkey-derived AES key.
   * Triggers the platform authenticator.
   */
  const decryptData = useCallback(
    async (blob: EncryptedBlob): Promise<string | null> => {
      const key = await deriveKey();
      if (!key) return null;
      try {
        return await decryptRecord(blob, key);
      } catch {
        // Wrong key or tampered data
        return null;
      }
    },
    [deriveKey],
  );

  /**
   * Derive the raw 32-byte key material for marketplace key wrapping.
   * Triggers Face ID / Touch ID. Returns the same bytes as the AES key
   * used for record encryption — for ECDH-wrapping only, never stored raw.
   */
  const deriveRawKey = useCallback(async (): Promise<ArrayBuffer | null> => {
    setIsLoading(true);
    try {
      return await deriveKeyMaterial();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    credential,
    isVerified,
    isLoading,
    supported,
    register,
    verify,
    deriveKey,
    deriveRawKey,
    encryptData,
    decryptData,
  };
}
