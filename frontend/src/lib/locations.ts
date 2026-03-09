export interface Country {
  code: string;
  name: string;
  regions: Region[];
}

export interface Region {
  code: string;
  name: string;
}

export const countries: Country[] = [
  {
    code: "US",
    name: "United States",
    regions: [
      { code: "CA", name: "California" },
      { code: "NY", name: "New York" },
      { code: "TX", name: "Texas" },
      { code: "FL", name: "Florida" },
      { code: "IL", name: "Illinois" },
      { code: "PA", name: "Pennsylvania" },
      { code: "OH", name: "Ohio" },
      { code: "MA", name: "Massachusetts" },
      { code: "WA", name: "Washington" },
      { code: "CO", name: "Colorado" },
      { code: "GA", name: "Georgia" },
      { code: "NC", name: "North Carolina" },
      { code: "MI", name: "Michigan" },
      { code: "AZ", name: "Arizona" },
      { code: "MN", name: "Minnesota" },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    regions: [
      { code: "ON", name: "Ontario" },
      { code: "BC", name: "British Columbia" },
      { code: "QC", name: "Quebec" },
      { code: "AB", name: "Alberta" },
      { code: "MB", name: "Manitoba" },
      { code: "NS", name: "Nova Scotia" },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    regions: [
      { code: "ENG", name: "England" },
      { code: "SCT", name: "Scotland" },
      { code: "WLS", name: "Wales" },
      { code: "NIR", name: "Northern Ireland" },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    regions: [
      { code: "BY", name: "Bavaria" },
      { code: "BE", name: "Berlin" },
      { code: "HH", name: "Hamburg" },
      { code: "HE", name: "Hesse" },
      { code: "NW", name: "North Rhine-Westphalia" },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    regions: [
      { code: "NSW", name: "New South Wales" },
      { code: "VIC", name: "Victoria" },
      { code: "QLD", name: "Queensland" },
      { code: "WA", name: "Western Australia" },
      { code: "SA", name: "South Australia" },
    ],
  },
  {
    code: "IN",
    name: "India",
    regions: [
      { code: "MH", name: "Maharashtra" },
      { code: "KA", name: "Karnataka" },
      { code: "DL", name: "Delhi" },
      { code: "TN", name: "Tamil Nadu" },
      { code: "TG", name: "Telangana" },
      { code: "GJ", name: "Gujarat" },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    regions: [{ code: "SG", name: "Singapore" }],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    regions: [
      { code: "DXB", name: "Dubai" },
      { code: "AUH", name: "Abu Dhabi" },
      { code: "SHJ", name: "Sharjah" },
    ],
  },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code);
}

export function buildJurisdiction(
  countryCode: string,
  regionCode: string,
): string {
  return `${countryCode}-${regionCode}`;
}
