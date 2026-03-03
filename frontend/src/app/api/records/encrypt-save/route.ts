import { NextRequest, NextResponse } from "next/server";
import { addRecord } from "@/app/api/demo/store";

/**
 * POST /api/records/encrypt-save
 *
 * Server-side AES-256-GCM encryption + IPFS upload + DemoRecord creation.
 * Simulates what the CRE TEE would do in production.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    data?: unknown;
    patientAddress?: string;
    label?: string;
    doctorAddress?: string;
    consultationId?: string;
  };

  const { data, patientAddress, label, doctorAddress, consultationId } = body;

  if (!data || !patientAddress || !doctorAddress) {
    return NextResponse.json(
      { error: "data, patientAddress, and doctorAddress are required" },
      { status: 400 },
    );
  }

  const secret =
    process.env.RECORD_ENCRYPTION_SECRET ?? "kosyn-demo-secret-key-32-bytes!!";

  // Derive AES-256-GCM key from secret + patientAddress using HKDF
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HKDF" },
    false,
    ["deriveKey"],
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode(patientAddress.toLowerCase()),
      info: new TextEncoder().encode("kosyn-record-encryption"),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  // Encrypt with AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    plaintext,
  );

  const encryptedBlob = {
    v: 1,
    alg: "AES-256-GCM",
    iv: Array.from(iv),
    ct: Array.from(new Uint8Array(ciphertext)),
  };

  // Upload to IPFS via Pinata
  const pinataKey = process.env.PINATA_API_KEY;
  const pinataSecret = process.env.PINATA_SECRET_API_KEY;

  let ipfsCid: string;

  if (pinataKey && pinataSecret) {
    const pinRes = await fetch(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: pinataKey,
          pinata_secret_api_key: pinataSecret,
        },
        body: JSON.stringify({
          pinataContent: encryptedBlob,
          pinataMetadata: {
            name: `kosyn-consultation-${consultationId ?? "unknown"}`,
          },
          pinataOptions: { cidVersion: 1 },
        }),
      },
    );

    const pinResult = (await pinRes.json()) as { IpfsHash?: string };
    if (!pinResult.IpfsHash) {
      return NextResponse.json(
        { error: "IPFS upload failed — no CID returned" },
        { status: 502 },
      );
    }
    ipfsCid = pinResult.IpfsHash;
  } else {
    return NextResponse.json(
      { error: "IPFS storage not configured" },
      { status: 500 },
    );
  }

  // Create DemoRecord in store
  const record = addRecord({
    patientAddress,
    recordType: "consultation",
    templateType: "consultation-summary",
    label: label ?? `Consultation — ${new Date().toLocaleDateString()}`,
    ipfsCid,
    txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
    createdBy: "doctor",
    createdByAddress: doctorAddress,
    formData: {
      consultationId: consultationId ?? "",
      encryptedCid: ipfsCid,
      encryptionAlg: "AES-256-GCM",
    },
  });

  return NextResponse.json({ cid: ipfsCid, recordId: record.id });
}
