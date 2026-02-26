/**
 * Patient profile helpers.
 *
 * Personal data (name, DOB, gender, avatar) is AES-256-GCM encrypted
 * client-side with the patient's passkey and stored on IPFS. Only the
 * IPFS CID and a minimal cache (no personal data) live in localStorage.
 *
 * On-chain: PatientRegistry stores { profileCid, profileHash, registeredAt }.
 * localStorage: kosyn-profile:{address} stores { profileCid, passkeyCredentialId, completedAt }
 * No plaintext personal data is ever persisted client-side.
 */

/** What localStorage stores — no plaintext personal data. */
export interface PatientProfileCache {
  profileCid: string;
  passkeyCredentialId?: string;
  completedAt: string;
}

/** The actual profile — only available after decrypting from IPFS. */
export interface PatientProfile {
  name: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "prefer-not-to-say";
  avatarDataUrl?: string;
}

const cacheKey = (address: string) => `kosyn-profile:${address.toLowerCase()}`;

export function getProfileCache(address: string): PatientProfileCache | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(cacheKey(address));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PatientProfileCache;
  } catch {
    return null;
  }
}

export function saveProfileCache(
  address: string,
  cache: PatientProfileCache,
): void {
  localStorage.setItem(cacheKey(address), JSON.stringify(cache));
}

export function clearProfileCache(address: string): void {
  localStorage.removeItem(cacheKey(address));
}

/** localStorage-only check — used as fast cache when contract not deployed. */
export function isOnboarded(address: string): boolean {
  return getProfileCache(address) !== null;
}

/** Fetch encrypted profile blob from IPFS. Returns the raw JSON string. */
export async function fetchEncryptedProfile(cid: string): Promise<string> {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
  ];
  for (const url of gateways) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.text();
    } catch {
      // try next gateway
    }
  }
  throw new Error("Failed to fetch profile from IPFS");
}
