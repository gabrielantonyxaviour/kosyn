import { NextRequest, NextResponse } from "next/server";

const NPI_API = "https://npiregistry.cms.hhs.gov/api/";

interface NPIResult {
  valid: boolean;
  npi?: string;
  name?: string;
  credential?: string;
  specialty?: string;
  state?: string;
  status?: string;
}

export async function GET(req: NextRequest) {
  const npi = req.nextUrl.searchParams.get("npi");
  if (!npi || !/^\d{10}$/.test(npi)) {
    return NextResponse.json(
      { valid: false, error: "NPI must be a 10-digit number" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `${NPI_API}?version=2.1&number=${npi}&enumeration_type=NPI-1`,
    );
    const data = await res.json();

    if (!data.results || data.result_count === 0) {
      return NextResponse.json({ valid: false } satisfies NPIResult);
    }

    const r = data.results[0];
    const basic = r.basic;
    const primary = r.taxonomies?.find((t: { primary: boolean }) => t.primary);

    const result: NPIResult = {
      valid: basic.status === "A",
      npi: r.number,
      name: [basic.name_prefix, basic.first_name, basic.last_name]
        .filter(Boolean)
        .join(" ")
        .replace(/^--\s*/, ""),
      credential: basic.credential || undefined,
      specialty: primary?.desc || undefined,
      state: primary?.state || undefined,
      status: basic.status,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { valid: false, error: "NPI registry unreachable" },
      { status: 502 },
    );
  }
}
