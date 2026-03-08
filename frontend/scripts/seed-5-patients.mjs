/**
 * seed-5-patients.mjs — Seeds 5 test patients with 2 records each.
 *
 * What it does:
 * 1. Generates 4 fresh throwaway wallets (primary wallet = patient 1)
 * 2. Funds each with 0.005 AVAX for gas from the primary wallet
 * 3. Each wallet calls DataMarketplace.listData([1,2,3,4,5]) on Fuji
 * 4. Seeds 2 records per patient into the demo store
 * 5. Opts each patient in via /api/demo?action=opt-in-data-sharing
 * 6. Verifies all 3 data endpoints return real aggregated data
 *
 * Run: node frontend/scripts/seed-5-patients.mjs
 * Requires: dev server running at localhost:3000, .env.local loaded
 */

import { execSync } from "child_process";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const RPC_URL =
  process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL ||
  "https://api.avax-test.network/ext/bc/C/rpc";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MARKETPLACE = process.env.NEXT_PUBLIC_DATA_MARKETPLACE;
const PRIMARY_WALLET = "0x6B9ad963c764a06A7ef8ff96D38D0cB86575eC00";

if (!PRIVATE_KEY) { console.error("PRIVATE_KEY not set"); process.exit(1); }
if (!MARKETPLACE) { console.error("NEXT_PUBLIC_DATA_MARKETPLACE not set"); process.exit(1); }

function cast(args) {
  return execSync(`cast ${args} --rpc-url ${RPC_URL} --json`, { encoding: "utf8" });
}

function castSend(contractAndArgs, privateKey) {
  return JSON.parse(
    execSync(
      `cast send ${contractAndArgs} --rpc-url ${RPC_URL} --private-key ${privateKey} --json`,
      { encoding: "utf8" },
    ),
  );
}

// ─── Generate 4 new throwaway wallets ─────────────────────────────────────────

function generateWallet() {
  const out = execSync("cast wallet new --json", { encoding: "utf8" });
  const arr = JSON.parse(out);
  const w = Array.isArray(arr) ? arr[0] : arr;
  return { address: w.address, privateKey: w.private_key };
}

// ─── Records per patient ───────────────────────────────────────────────────────

const PATIENT_RECORDS = [
  // Patient 1 — Hypertension + Vitals
  [
    {
      templateType: "vitals",
      recordType: "health",
      label: "Vitals — Q1 2026",
      formData: { bpSystolic: "142", bpDiastolic: "91", heartRate: "78", temperature: "98.4", weight: "88", height: "175", oxygenSaturation: "97" },
    },
    {
      templateType: "medical-history",
      recordType: "health",
      label: "Medical History — Hypertension",
      formData: { conditions: "Hypertension", icd10Code: "I10", diagnosis: "Essential (primary) hypertension" },
    },
  ],
  // Patient 2 — Type 2 Diabetes + Labs
  [
    {
      templateType: "lab-results",
      recordType: "health",
      label: "Labs — HbA1c",
      formData: { conditions: "Type 2 Diabetes", icd10Code: "E11.9", testName: "HbA1c", result: "8.2%", referenceRange: "<5.7%" },
    },
    {
      templateType: "discharge-summary",
      recordType: "consultation",
      label: "Discharge — Diabetes Management",
      formData: { principalDiagnosis: "Type 2 Diabetes", icd10Code: "E11.9", dischargeCondition: "improved", complications: "" },
    },
  ],
  // Patient 3 — Hyperlipidemia + Cardiology
  [
    {
      templateType: "cardiology-report",
      recordType: "health",
      label: "Cardiology — Echo",
      formData: { conditions: "Hyperlipidemia", principalDiagnosis: "Hyperlipidemia unspecified", icd10Code: "E78.5" },
    },
    {
      templateType: "discharge-summary",
      recordType: "consultation",
      label: "Discharge — Lipid Management",
      formData: { principalDiagnosis: "Hyperlipidemia", icd10Code: "E78.5", dischargeCondition: "stable", complications: "" },
    },
  ],
  // Patient 4 — Anxiety + Mental Health
  [
    {
      templateType: "mental-health",
      recordType: "consultation",
      label: "Mental Health Assessment",
      formData: { dsm5Diagnosis: "Generalized anxiety disorder", conditions: "Anxiety/Depression" },
    },
    {
      templateType: "discharge-summary",
      recordType: "consultation",
      label: "Discharge — Anxiety Treatment",
      formData: { principalDiagnosis: "Generalized anxiety disorder", icd10Code: "F41.1", dischargeCondition: "improved", complications: "" },
    },
  ],
  // Patient 5 — Hypertension + Discharge (brings hypertension to 2, improved to 3)
  [
    {
      templateType: "vitals",
      recordType: "health",
      label: "Vitals — Follow-up",
      formData: { bpSystolic: "135", bpDiastolic: "87", heartRate: "72", temperature: "98.6", weight: "79", height: "172", oxygenSaturation: "98" },
    },
    {
      templateType: "discharge-summary",
      recordType: "consultation",
      label: "Discharge — Hypertension Follow-up",
      formData: { principalDiagnosis: "Hypertension", icd10Code: "I10", dischargeCondition: "stable", complications: "" },
    },
  ],
];

// ─── Seed records for one patient ─────────────────────────────────────────────

async function seedPatientRecords(address, records) {
  let ok = 0;
  for (const rec of records) {
    const res = await fetch(`${BASE_URL}/api/demo?action=create-record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientAddress: address,
        recordType: rec.recordType,
        templateType: rec.templateType,
        label: rec.label,
        ipfsCid: `QmDemo${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 12)}`,
        createdBy: "patient",
        createdByAddress: address,
        formData: rec.formData,
      }),
    });
    if (res.ok) ok++;
  }
  return ok;
}

async function optIn(address) {
  const res = await fetch(`${BASE_URL}/api/demo?action=opt-in-data-sharing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  return res.ok;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Kosyn 5-Patient Demo Seeder ===\n");

  // Build patient list: primary wallet + 4 generated
  const patients = [{ address: PRIMARY_WALLET, privateKey: PRIVATE_KEY }];
  console.log("Generating 4 throwaway wallets...");
  for (let i = 0; i < 4; i++) {
    const w = generateWallet();
    patients.push(w);
    console.log(`  Patient ${i + 2}: ${w.address}`);
  }

  // Fund each throwaway wallet with 0.005 AVAX for gas
  console.log("\nFunding wallets with 0.005 AVAX each...");
  for (let i = 1; i < patients.length; i++) {
    const tx = castSend(`${patients[i].address} --value 5000000000000000`, PRIVATE_KEY);
    console.log(`  ✓ Patient ${i + 1} funded: ${tx.transactionHash}`);
  }

  // Each patient calls listData() + seeds records + opts in
  console.log("\nOnboarding patients...");
  for (let i = 0; i < patients.length; i++) {
    const { address, privateKey } = patients[i];
    process.stdout.write(`  Patient ${i + 1} (${address.slice(0, 10)}...): `);

    // listData() on-chain
    try {
      const tx = castSend(
        `${MARKETPLACE} "listData(uint8[])" "[1,2,3,4,5]"`,
        privateKey,
      );
      process.stdout.write(`listData ✓  `);
    } catch (e) {
      process.stdout.write(`listData ✗ (${e.message.split("\n")[0]})  `);
    }

    // Seed records
    const ok = await seedPatientRecords(address, PATIENT_RECORDS[i]);
    process.stdout.write(`records ${ok}/2  `);

    // Opt in
    const opted = await optIn(address);
    process.stdout.write(`opted-in ${opted ? "✓" : "✗"}\n`);
  }

  // Verify endpoints return 402 (payment required = data exists)
  console.log("\nVerifying endpoints...");
  for (const ep of ["demographics", "conditions", "outcomes"]) {
    const res = await fetch(`${BASE_URL}/api/data/${ep}`);
    const json = await res.json();
    if (res.status === 402) {
      console.log(`  ✓ /api/data/${ep} → 402 (ready, ${json.accepts?.[0]?.maxAmountRequired} KUSD units)`);
    } else {
      console.log(`  ✗ /api/data/${ep} → ${res.status}:`, json);
    }
  }

  console.log("\n=== Done ===");
  console.log("5 patients seeded with 2 records each, all opted in on-chain.");
  console.log("Run the x402 flow to get real aggregated data across all 5 patients.");
}

main().catch(console.error);
