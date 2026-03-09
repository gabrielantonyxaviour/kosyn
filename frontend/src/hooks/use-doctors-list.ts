"use client";

import { useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import { getProviderRegistry } from "@/lib/contracts";
import { useState, useEffect } from "react";
import type { ProviderProfile } from "@/hooks/use-provider-profile";

export interface DoctorEntry extends ProviderProfile {
  address: string;
}

export function useDoctorsList() {
  const { data: addresses, isLoading: addrsLoading } = useReadContract({
    contract: getProviderRegistry(),
    method: "getProviders",
    params: [],
  });

  const [doctors, setDoctors] = useState<DoctorEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (addrsLoading) return;
    if (!addresses || addresses.length === 0) {
      setDoctors([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function fetchAll() {
      const contract = getProviderRegistry();
      const unique = [...new Set(addresses!)];
      const results = await Promise.all(
        unique.map(async (addr) => {
          const data = await readContract({
            contract,
            method: "getProvider",
            params: [addr],
          });
          return {
            address: addr,
            name: data.name,
            licenseHash: data.licenseHash,
            specialty: data.specialty,
            jurisdiction: data.jurisdiction,
            isActive: data.isActive,
            registeredAt: Number(data.registeredAt),
          } as DoctorEntry;
        }),
      );
      if (!cancelled) {
        setDoctors(results.filter((d) => d.isActive));
        setIsLoading(false);
      }
    }

    fetchAll().catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [addresses, addrsLoading]);

  return { doctors, isLoading };
}
