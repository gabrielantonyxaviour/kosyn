"use client";

import { useState, useEffect } from "react";
import { useBooking } from "./use-bookings";

export interface ConsultationResult {
  soapNote?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  summary?: string;
  medicalCodes?: string[];
  drugInteractions?: string[];
  riskScores?: Record<string, number>;
  proof?: { signature: string; model: string; timestamp: number };
  completedAt: number;
}

export function useConsultationResult(bookingId: number | undefined) {
  const { booking, isLoading: bookingLoading } = useBooking(bookingId);
  const [result, setResult] = useState<ConsultationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (bookingLoading || !booking) {
      if (!bookingLoading) setIsLoading(false);
      return;
    }

    if (!booking.resultCid) {
      setResult(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/ipfs/fetch?cid=${encodeURIComponent(booking.resultCid)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [booking, bookingLoading]);

  return { result, isLoading };
}
