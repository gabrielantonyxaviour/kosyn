"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { countries, getCountryByCode, type Region } from "@/lib/locations";

interface LocationComboboxProps {
  selectedCountry: string;
  selectedRegion: string;
  onCountryChange: (code: string) => void;
  onRegionChange: (code: string) => void;
}

export function LocationCombobox({
  selectedCountry,
  selectedRegion,
  onCountryChange,
  onRegionChange,
}: LocationComboboxProps) {
  const [countryOpen, setCountryOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);

  const countryData = selectedCountry
    ? getCountryByCode(selectedCountry)
    : undefined;
  const regionData = countryData?.regions.find(
    (r) => r.code === selectedRegion,
  );

  return (
    <div className="flex items-end gap-3">
      {/* Country combobox */}
      <div className="flex-1">
        <span className="text-xs text-muted-foreground mb-1.5 block">
          Country
        </span>
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={countryOpen}
              className="w-full justify-between font-normal h-9"
            >
              <span className="flex items-center gap-2 truncate">
                <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {countryData ? countryData.name : "Any country"}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search countries..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="any"
                    onSelect={() => {
                      onCountryChange("");
                      onRegionChange("");
                      setCountryOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        !selectedCountry ? "opacity-100" : "opacity-0",
                      )}
                    />
                    Any country
                  </CommandItem>
                  {countries.map((c) => (
                    <CommandItem
                      key={c.code}
                      value={c.name}
                      onSelect={() => {
                        onCountryChange(c.code);
                        onRegionChange("");
                        setCountryOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          selectedCountry === c.code
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Region combobox */}
      <div className="flex-1">
        <span className="text-xs text-muted-foreground mb-1.5 block">
          State / Region
        </span>
        <Popover open={regionOpen} onOpenChange={setRegionOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={regionOpen}
              disabled={!selectedCountry}
              className="w-full justify-between font-normal h-9"
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {regionData
                  ? regionData.name
                  : selectedCountry
                    ? "Any region"
                    : "Select country first"}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search regions..." />
              <CommandList>
                <CommandEmpty>No region found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="any"
                    onSelect={() => {
                      onRegionChange("");
                      setRegionOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        !selectedRegion ? "opacity-100" : "opacity-0",
                      )}
                    />
                    Any region
                  </CommandItem>
                  {countryData?.regions.map((r) => (
                    <CommandItem
                      key={r.code}
                      value={r.name}
                      onSelect={() => {
                        onRegionChange(r.code);
                        setRegionOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          selectedRegion === r.code
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {r.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
