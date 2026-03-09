"use client";

import { useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import { getBookingRegistry } from "@/lib/contracts";
import { useState, useEffect, useCallback } from "react";

export type BookingStatus = 0 | 1 | 2 | 3 | 4;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  0: "booked",
  1: "access-requested",
  2: "access-granted",
  3: "in-session",
  4: "completed",
};

export interface OnChainBooking {
  id: number;
  patient: string;
  doctor: string;
  fee: number;
  status: BookingStatus;
  metadataCid: string;
  resultCid: string;
  requestedRecordTypes: number[];
  createdAt: number;
  completedAt: number;
  patientName?: string;
  doctorName?: string;
  specialty?: string;
  date?: string;
  time?: string;
}

async function hydrateBooking(
  id: bigint,
  contract: ReturnType<typeof getBookingRegistry>,
): Promise<OnChainBooking> {
  const data = await readContract({
    contract,
    method: "getBooking",
    params: [id],
  });

  const booking: OnChainBooking = {
    id: Number(id),
    patient: data.patient,
    doctor: data.doctor,
    fee: Number(data.fee),
    status: Number(data.status) as BookingStatus,
    metadataCid: data.metadataCid,
    resultCid: data.resultCid,
    requestedRecordTypes: data.requestedRecordTypes.map(Number),
    createdAt: Number(data.createdAt),
    completedAt: Number(data.completedAt),
  };

  if (booking.metadataCid) {
    try {
      const res = await fetch(
        `/api/ipfs/fetch?cid=${encodeURIComponent(booking.metadataCid)}`,
      );
      if (res.ok) {
        const meta = await res.json();
        booking.patientName = meta.patientName;
        booking.doctorName = meta.doctorName;
        booking.specialty = meta.specialty;
        booking.date = meta.date;
        booking.time = meta.time;
      }
    } catch {
      // metadata fetch is best-effort
    }
  }

  return booking;
}

export function usePatientBookings(address: string | undefined) {
  const {
    data: bookingIds,
    isLoading: idsLoading,
    refetch,
  } = useReadContract({
    contract: getBookingRegistry(),
    method: "getPatientBookings",
    params: [address || "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!address, refetchInterval: 5000 },
  });

  const [bookings, setBookings] = useState<OnChainBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (idsLoading) return;
    if (!bookingIds || bookingIds.length === 0) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function fetchAll() {
      const contract = getBookingRegistry();
      const results = await Promise.all(
        bookingIds!.map((id) => hydrateBooking(id, contract)),
      );
      if (!cancelled) {
        setBookings(results.sort((a, b) => b.createdAt - a.createdAt));
        setIsLoading(false);
      }
    }

    fetchAll().catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [bookingIds, idsLoading]);

  return { bookings, isLoading, refetch };
}

export function useDoctorBookings(address: string | undefined) {
  const {
    data: bookingIds,
    isLoading: idsLoading,
    refetch,
  } = useReadContract({
    contract: getBookingRegistry(),
    method: "getDoctorBookings",
    params: [address || "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!address, refetchInterval: 5000 },
  });

  const [bookings, setBookings] = useState<OnChainBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (idsLoading) return;
    if (!bookingIds || bookingIds.length === 0) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function fetchAll() {
      const contract = getBookingRegistry();
      const results = await Promise.all(
        bookingIds!.map((id) => hydrateBooking(id, contract)),
      );
      if (!cancelled) {
        setBookings(results.sort((a, b) => b.createdAt - a.createdAt));
        setIsLoading(false);
      }
    }

    fetchAll().catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [bookingIds, idsLoading]);

  return { bookings, isLoading, refetch };
}

export function useBooking(bookingId: number | undefined) {
  const contract = getBookingRegistry();

  const {
    data: rawBooking,
    isLoading: rawLoading,
    refetch,
  } = useReadContract({
    contract,
    method: "getBooking",
    params: [BigInt(bookingId ?? 0)],
    queryOptions: { enabled: bookingId !== undefined, refetchInterval: 3000 },
  });

  const [booking, setBooking] = useState<OnChainBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (rawLoading || !rawBooking || bookingId === undefined) {
      if (!rawLoading) setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const b: OnChainBooking = {
      id: bookingId,
      patient: rawBooking.patient,
      doctor: rawBooking.doctor,
      fee: Number(rawBooking.fee),
      status: Number(rawBooking.status) as BookingStatus,
      metadataCid: rawBooking.metadataCid,
      resultCid: rawBooking.resultCid,
      requestedRecordTypes: rawBooking.requestedRecordTypes.map(Number),
      createdAt: Number(rawBooking.createdAt),
      completedAt: Number(rawBooking.completedAt),
    };

    if (b.metadataCid) {
      fetch(`/api/ipfs/fetch?cid=${encodeURIComponent(b.metadataCid)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((meta) => {
          if (!cancelled && meta) {
            b.patientName = meta.patientName;
            b.doctorName = meta.doctorName;
            b.specialty = meta.specialty;
            b.date = meta.date;
            b.time = meta.time;
          }
          if (!cancelled) {
            setBooking(b);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setBooking(b);
            setIsLoading(false);
          }
        });
    } else {
      if (!cancelled) {
        setBooking(b);
        setIsLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [rawBooking, rawLoading, bookingId]);

  return { booking, isLoading, refetch };
}
