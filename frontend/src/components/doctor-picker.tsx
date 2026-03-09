"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock } from "lucide-react";
import { getDoctors } from "@/lib/demo-api";
import type { DemoDoctor } from "@/app/api/demo/store";
import { countries } from "@/lib/locations";

export interface Doctor {
  address: string;
  name: string;
  specialty: string;
  fee: number;
  jurisdiction: string;
  rating: number;
  reviews: number;
  yearsExp: number;
  bio: string;
  available: string;
}

function formatJurisdiction(jurisdiction: string): string {
  const parts = jurisdiction.split("-");
  if (parts.length < 2) return jurisdiction;
  const country = countries.find((c) => c.code === parts[0]);
  if (!country) return jurisdiction;
  const region = country.regions.find((r) => r.code === parts[1]);
  return region ? `${region.name}, ${country.name}` : country.name;
}

function DoctorAvatar({ name, address }: { name: string; address: string }) {
  const num = parseInt(address.slice(2, 10), 16);
  const hue1 = num % 360;
  const hue2 = (hue1 + 40 + (num % 80)) % 360;
  const initials = name
    .replace("Dr. ", "")
    .split(" ")
    .map((n) => n[0])
    .join("");
  return (
    <div
      className="h-14 w-14 rounded-full shrink-0 flex items-center justify-center text-white font-semibold text-lg"
      style={{
        background: `linear-gradient(135deg, hsl(${hue1}, 80%, 55%), hsl(${hue2}, 90%, 40%))`,
      }}
    >
      {initials}
    </div>
  );
}

interface DoctorPickerProps {
  onSelect: (doctor: Doctor) => void;
  selectedAddress?: string;
  query?: string;
  location?: string;
}

export function DoctorPicker({
  onSelect,
  selectedAddress,
  query,
  location,
}: DoctorPickerProps) {
  const [registeredDoctors, setRegisteredDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    getDoctors().then((docs: DemoDoctor[]) => {
      const mapped: Doctor[] = docs.map((d) => ({
        address: d.address,
        name: d.name,
        specialty: d.specialty,
        fee: d.fee,
        jurisdiction: d.jurisdiction,
        rating: 4.9,
        reviews: 0,
        yearsExp: 10,
        bio: `${d.specialty} specialist. Verified on-chain via CRE.`,
        available: "Today",
      }));
      setRegisteredDoctors(mapped);
    });
  }, []);

  const filtered = registeredDoctors.filter((doc) => {
    if (query && query !== "all") {
      const specialtyMap: Record<string, string[]> = {
        "general-checkup": ["Internal Medicine"],
        "heart-cardiovascular": ["Cardiology"],
        "skin-hair": ["Dermatology"],
        "brain-nerves": ["Neurology"],
        "mental-health": ["Psychiatry"],
        "bones-joints": ["Orthopedics"],
      };
      const matching = specialtyMap[query] || [];
      if (matching.length > 0 && !matching.includes(doc.specialty))
        return false;
    }
    if (location && location.trim() !== "") {
      if (!doc.jurisdiction.toLowerCase().includes(location.toLowerCase()))
        return false;
    }
    return true;
  });

  if (registeredDoctors.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No doctors registered yet. A provider must register at
          /doctors/onboarding first.
        </p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No doctors found matching your criteria. Try a different specialty or
          location.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((doc) => (
        <button
          key={doc.address}
          onClick={() => onSelect(doc)}
          className={`text-left rounded-xl border p-4 transition-all hover:bg-muted/30 ${
            selectedAddress === doc.address
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border"
          }`}
        >
          <div className="flex items-start gap-3">
            <DoctorAvatar name={doc.name} address={doc.address} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{doc.name}</p>
              <Badge
                variant="outline"
                className="text-[10px] mt-0.5 bg-primary/5 text-primary border-primary/20"
              >
                {doc.specialty}
              </Badge>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-medium">{doc.rating}</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({doc.reviews})
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {doc.yearsExp}y exp
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {doc.bio}
          </p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {formatJurisdiction(doc.jurisdiction)}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Clock className="h-3 w-3" />
                {doc.available}
              </span>
              <span className="text-xs font-medium">${doc.fee}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
