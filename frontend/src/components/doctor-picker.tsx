"use client";

import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Info } from "lucide-react";
import { useDoctorsList } from "@/hooks/use-doctors-list";
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

type MatchLevel =
  | "region"
  | "country"
  | "specialty-global"
  | "all"
  | "no-filter";

const matchLevelLabels: Record<MatchLevel, string> = {
  region: "",
  country: "Showing doctors in your country — none found in your region",
  "specialty-global":
    "Showing doctors worldwide for this specialty — none found in your country",
  all: "Showing all available doctors — none found for this specialty",
  "no-filter": "",
};

const specialtyMap: Record<string, string[]> = {
  "general-checkup": ["Internal Medicine"],
  "heart-cardiovascular": ["Cardiology"],
  "skin-hair": ["Dermatology"],
  "brain-nerves": ["Neurology"],
  "mental-health": ["Psychiatry"],
  "bones-joints": ["Orthopedics"],
};

function matchesSpecialty(doc: Doctor, query?: string): boolean {
  if (!query || query === "all") return true;
  const matching = specialtyMap[query] || [];
  return matching.length === 0 || matching.includes(doc.specialty);
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

function useRelevanceSearch(
  doctors: Doctor[],
  query?: string,
  location?: string,
): { results: Doctor[]; matchLevel: MatchLevel } {
  if (!location || location.trim() === "") {
    const bySpecialty = doctors.filter((d) => matchesSpecialty(d, query));
    if (bySpecialty.length > 0)
      return { results: bySpecialty, matchLevel: "no-filter" };
    return { results: doctors, matchLevel: "all" };
  }

  const parts = location.split("-");
  const countryCode = parts[0];
  const regionCode = parts[1];

  // Level 1: exact region match + specialty
  if (regionCode) {
    const regionMatch = doctors.filter(
      (d) =>
        d.jurisdiction.toUpperCase() === location.toUpperCase() &&
        matchesSpecialty(d, query),
    );
    if (regionMatch.length > 0)
      return { results: regionMatch, matchLevel: "region" };
  }

  // Level 2: same country + specialty
  const countryMatch = doctors.filter(
    (d) =>
      d.jurisdiction.toUpperCase().startsWith(countryCode.toUpperCase()) &&
      matchesSpecialty(d, query),
  );
  if (countryMatch.length > 0)
    return { results: countryMatch, matchLevel: "country" };

  // Level 3: worldwide + specialty
  const specialtyMatch = doctors.filter((d) => matchesSpecialty(d, query));
  if (specialtyMatch.length > 0)
    return { results: specialtyMatch, matchLevel: "specialty-global" };

  // Level 4: all doctors
  return { results: doctors, matchLevel: "all" };
}

interface DoctorPickerProps {
  onSelect: (doctor: Doctor) => void;
  selectedAddress?: string;
  query?: string;
  location?: string;
  activeDoctorAddresses?: string[];
}

export function DoctorPicker({
  onSelect,
  selectedAddress,
  query,
  location,
  activeDoctorAddresses = [],
}: DoctorPickerProps) {
  const { doctors: chainDoctors, isLoading: doctorsLoading } = useDoctorsList();

  const registeredDoctors: Doctor[] = chainDoctors.map((d) => ({
    address: d.address,
    name: d.name,
    specialty: d.specialty,
    fee: 50,
    jurisdiction: d.jurisdiction,
    rating: 4.9,
    reviews: 0,
    yearsExp: 10,
    bio: `${d.specialty} specialist. Verified on-chain via CRE.`,
    available: "Today",
  }));

  const { results: filtered, matchLevel } = useRelevanceSearch(
    registeredDoctors,
    query,
    location,
  );

  if (doctorsLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border p-4 animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-muted mt-3" />
            <div className="h-3 w-2/3 rounded bg-muted mt-1.5" />
          </div>
        ))}
      </div>
    );
  }

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

  const notice = matchLevelLabels[matchLevel];

  return (
    <div className="space-y-3">
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <Info className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300/90">{notice}</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map((doc) => {
          const hasActive = activeDoctorAddresses.some(
            (a) => a.toLowerCase() === doc.address.toLowerCase(),
          );
          return (
            <button
              key={doc.address}
              onClick={() => onSelect(doc)}
              className={`text-left rounded-xl border p-5 transition-all ${
                hasActive
                  ? "opacity-60 cursor-not-allowed border-amber-500/30"
                  : "hover:bg-muted/30"
              } ${
                selectedAddress === doc.address
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : hasActive
                    ? ""
                    : "border-border"
              }`}
            >
              <div className="flex items-start gap-4">
                <DoctorAvatar name={doc.name} address={doc.address} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base truncate">
                      {doc.name}
                    </p>
                    {hasActive && (
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0 bg-amber-500/10 text-amber-400 border-amber-500/20"
                      >
                        Active booking
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {doc.address.slice(0, 6)}...{doc.address.slice(-4)}
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[11px] mt-1.5 bg-primary/5 text-primary border-primary/20 max-w-full truncate"
                  >
                    {doc.specialty}
                  </Badge>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium">{doc.rating}</span>
                      <span className="text-xs text-muted-foreground">
                        ({doc.reviews})
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {doc.yearsExp}y exp
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                {doc.bio}
              </p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {formatJurisdiction(doc.jurisdiction)}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sm text-emerald-400">
                    <Clock className="h-3.5 w-3.5" />
                    {doc.available}
                  </span>
                  <span className="text-sm font-semibold">${doc.fee}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
