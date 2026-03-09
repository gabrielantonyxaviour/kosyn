"use client";

import { useReadContract } from "thirdweb/react";
import { getProviderRegistry } from "@/lib/contracts";

export interface ProviderProfile {
  name: string;
  licenseHash: string;
  specialty: string;
  jurisdiction: string;
  isActive: boolean;
  registeredAt: number;
}

export function useProviderProfile(address: string | undefined) {
  const result = useReadContract({
    contract: getProviderRegistry(),
    method: "getProvider",
    params: [address || "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!address },
  });

  const profile: ProviderProfile | null =
    result.data && result.data.name
      ? {
          name: result.data.name,
          licenseHash: result.data.licenseHash,
          specialty: result.data.specialty,
          jurisdiction: result.data.jurisdiction,
          isActive: result.data.isActive,
          registeredAt: Number(result.data.registeredAt),
        }
      : null;

  return { ...result, data: profile };
}

export function useProviderIsRegistered(address: string | undefined) {
  return useReadContract({
    contract: getProviderRegistry(),
    method: "isRegistered",
    params: [address || "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!address },
  });
}
