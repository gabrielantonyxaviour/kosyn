"use client";

import { useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import { getPatientConsent, getProviderRegistry } from "@/lib/contracts";
import { useState, useEffect } from "react";

export interface OnChainConsent {
  providerAddress: string;
  recordType: number;
  grantedAt: number;
  expiresAt: number;
  isActive: boolean;
}

export function useIsProviderAllowed(
  patientAddress: string | undefined,
  providerAddress: string | undefined,
) {
  return useReadContract({
    contract: getPatientConsent(),
    method: "isProviderAllowed",
    params: [
      patientAddress || "0x0000000000000000000000000000000000000000",
      providerAddress || "0x0000000000000000000000000000000000000000",
    ],
    queryOptions: { enabled: !!patientAddress && !!providerAddress },
  });
}

export function useConsentDetails(
  patientAddress: string | undefined,
  providerAddress: string | undefined,
) {
  const result = useReadContract({
    contract: getPatientConsent(),
    method: "consents",
    params: [
      patientAddress || "0x0000000000000000000000000000000000000000",
      providerAddress || "0x0000000000000000000000000000000000000000",
    ],
    queryOptions: { enabled: !!patientAddress && !!providerAddress },
  });

  const consent: OnChainConsent | null =
    result.data && result.data[3]
      ? {
          providerAddress: providerAddress ?? "",
          recordType: Number(result.data[0]),
          grantedAt: Number(result.data[1]),
          expiresAt: Number(result.data[2]),
          isActive: result.data[3],
        }
      : null;

  return { ...result, data: consent };
}

/**
 * Fetch all active consents for a patient by checking all registered providers.
 */
export function usePatientConsents(patientAddress: string | undefined) {
  const { data: providerAddresses, isLoading: providersLoading } =
    useReadContract({
      contract: getProviderRegistry(),
      method: "getProviders",
      params: [],
      queryOptions: { enabled: !!patientAddress },
    });

  const [consents, setConsents] = useState<OnChainConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (providersLoading || !patientAddress) return;
    if (!providerAddresses || providerAddresses.length === 0) {
      setConsents([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function fetchAll() {
      const contract = getPatientConsent();
      const results = await Promise.all(
        providerAddresses!.map(async (provAddr) => {
          const data = await readContract({
            contract,
            method: "consents",
            params: [patientAddress! as `0x${string}`, provAddr],
          });
          const isActive = data[3];
          const expiresAt = Number(data[2]);
          const now = Math.floor(Date.now() / 1000);
          if (isActive && expiresAt > now) {
            return {
              providerAddress: provAddr,
              recordType: Number(data[0]),
              grantedAt: Number(data[1]),
              expiresAt,
              isActive: true,
            } as OnChainConsent;
          }
          return null;
        }),
      );
      if (!cancelled) {
        setConsents(results.filter((c): c is OnChainConsent => c !== null));
        setIsLoading(false);
      }
    }

    fetchAll().catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [providerAddresses, providersLoading, patientAddress]);

  return { consents, isLoading };
}
