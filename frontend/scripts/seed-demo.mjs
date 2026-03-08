/**
 * seed-demo.mjs — Seeds the demo store with realistic patient records
 * and opts the test wallet into DataMarketplace on-chain.
 *
 * Run AFTER starting the dev server:
 *   node frontend/scripts/seed-demo.mjs
 *
 * What it does:
 * 1. Calls DataMarketplace.listData([1,2,3,4,5]) on-chain from the test wallet
 * 2. POSTs 15 realistic health records to /api/demo/create-record
 * 3. Calls /api/demo/opt-in-data-sharing for the test wallet address
 *
 * After this runs, the full x402 flow returns real aggregated health data.
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const RPC_URL =
  process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL ||
  "https://api.avax-test.network/ext/bc/C/rpc";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MARKETPLACE = process.env.NEXT_PUBLIC_DATA_MARKETPLACE;
const WALLET = "0x6B9ad963c764a06A7ef8ff96D38D0cB86575eC00";

if (!PRIVATE_KEY) {
  console.error("PRIVATE_KEY not set in environment");
  process.exit(1);
}
if (!MARKETPLACE) {
  console.error("NEXT_PUBLIC_DATA_MARKETPLACE not set in environment");
  process.exit(1);
}

// ─── Step 1: Call DataMarketplace.listData([1,2,3,4,5]) on-chain ─────────────

async function rpcRequest(method, params) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json();
}

async function callListData() {
  console.log("Step 1: Calling DataMarketplace.listData() on Fuji...");

  const { execSync } = await import("child_process");

  try {
    const output = execSync(
      `cast send ${MARKETPLACE} "listData(uint8[])" "[1,2,3,4,5]" ` +
        `--rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY} --json`,
      { encoding: "utf8" },
    );
    const receipt = JSON.parse(output);
    if (receipt.status === "0x1" || receipt.status === 1) {
      console.log(`  ✓ listData() tx: ${receipt.transactionHash}`);
      return true;
    } else {
      console.error("  ✗ listData() failed:", receipt);
      return false;
    }
  } catch (e) {
    console.error("  ✗ Error calling listData():", e.message);
    return false;
  }
}

// ─── Step 2: Seed demo store with realistic records ───────────────────────────

const RECORDS = [
  // Vitals records — 3x to pass k-anonymity on recordType
  {
    templateType: "vitals",
    recordType: "health",
    label: "Vitals — Jan 2026",
    formData: {
      bpSystolic: "128",
      bpDiastolic: "82",
      heartRate: "74",
      temperature: "98.4",
      weight: "82",
      height: "178",
      oxygenSaturation: "98",
    },
  },
  {
    templateType: "vitals",
    recordType: "health",
    label: "Vitals — Feb 2026",
    formData: {
      bpSystolic: "132",
      bpDiastolic: "86",
      heartRate: "76",
      temperature: "98.6",
      weight: "81",
      height: "178",
      oxygenSaturation: "97",
    },
  },
  {
    templateType: "vitals",
    recordType: "health",
    label: "Vitals — Mar 2026",
    formData: {
      bpSystolic: "125",
      bpDiastolic: "80",
      heartRate: "72",
      temperature: "98.2",
      weight: "80",
      height: "178",
      oxygenSaturation: "99",
    },
  },
  // Medical history — conditions data (Hypertension appears 4x → passes k=3)
  {
    templateType: "medical-history",
    recordType: "health",
    label: "Medical History — Hypertension",
    formData: {
      conditions: "Hypertension",
      icd10Code: "I10",
      diagnosis: "Essential (primary) hypertension",
    },
  },
  {
    templateType: "medical-history",
    recordType: "health",
    label: "Medical History — Diabetes",
    formData: {
      conditions: "Type 2 Diabetes",
      icd10Code: "E11.9",
      diagnosis: "Type 2 diabetes mellitus without complications",
    },
  },
  {
    templateType: "medical-history",
    recordType: "health",
    label: "Medical History — Lipids",
    formData: {
      conditions: "Hyperlipidemia",
      icd10Code: "E78.5",
      diagnosis: "Hyperlipidemia, unspecified",
    },
  },
  // Lab results — more condition mentions
  {
    templateType: "lab-results",
    recordType: "health",
    label: "Labs — Metabolic Panel",
    formData: {
      conditions: "Hypertension",
      icd10Code: "I10",
    },
  },
  {
    templateType: "lab-results",
    recordType: "health",
    label: "Labs — HbA1c",
    formData: {
      conditions: "Type 2 Diabetes",
      icd10Code: "E11.9",
    },
  },
  {
    templateType: "lab-results",
    recordType: "health",
    label: "Labs — Lipid Panel",
    formData: {
      conditions: "Hyperlipidemia",
      icd10Code: "E78.5",
    },
  },
  // Cardiology — conditions
  {
    templateType: "cardiology-report",
    recordType: "health",
    label: "Cardiology — Echo",
    formData: {
      conditions: "Hypertension",
      principalDiagnosis: "Hypertensive heart disease",
      icd10Code: "I11.9",
    },
  },
  // Discharge summaries — outcomes data (dischargeCondition)
  {
    templateType: "discharge-summary",
    recordType: "consultation",
    label: "Discharge — Hypertension Management",
    formData: {
      principalDiagnosis: "Hypertension",
      icd10Code: "I10",
      dischargeCondition: "improved",
      complications: "",
    },
  },
  {
    templateType: "discharge-summary",
    recordType: "consultation",
    label: "Discharge — Diabetes Stabilization",
    formData: {
      principalDiagnosis: "Type 2 Diabetes",
      icd10Code: "E11.9",
      dischargeCondition: "stable",
      complications: "",
    },
  },
  {
    templateType: "discharge-summary",
    recordType: "consultation",
    label: "Discharge — Lipid Management",
    formData: {
      principalDiagnosis: "Hyperlipidemia",
      icd10Code: "E78.5",
      dischargeCondition: "improved",
      complications: "",
    },
  },
  // Additional discharge summaries — bring "improved" to 4x, "stable" to 3x (passes k=3)
  {
    templateType: "discharge-summary",
    recordType: "consultation",
    label: "Discharge — Cardiac Care",
    formData: {
      principalDiagnosis: "Hypertensive heart disease",
      icd10Code: "I11.9",
      dischargeCondition: "improved",
      complications: "",
    },
  },
  {
    templateType: "discharge-summary",
    recordType: "consultation",
    label: "Discharge — Glucose Control",
    formData: {
      principalDiagnosis: "Type 2 Diabetes",
      icd10Code: "E11.9",
      dischargeCondition: "stable",
      complications: "",
    },
  },
  {
    templateType: "discharge-summary",
    recordType: "consultation",
    label: "Discharge — Cholesterol Management",
    formData: {
      principalDiagnosis: "Hyperlipidemia",
      icd10Code: "E78.5",
      dischargeCondition: "stable",
      complications: "",
    },
  },
  // Mental health — more conditions
  {
    templateType: "mental-health",
    recordType: "consultation",
    label: "Mental Health Assessment",
    formData: {
      dsm5Diagnosis: "Generalized anxiety disorder",
      conditions: "Anxiety/Depression",
    },
  },
  {
    templateType: "mental-health",
    recordType: "consultation",
    label: "Mental Health Follow-up",
    formData: {
      dsm5Diagnosis: "Major depressive disorder",
      conditions: "Anxiety/Depression",
    },
  },
];

async function seedRecords() {
  console.log(`\nStep 2: Seeding ${RECORDS.length} records into demo store...`);

  let ok = 0;
  for (const rec of RECORDS) {
    const res = await fetch(`${BASE_URL}/api/demo?action=create-record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientAddress: WALLET,
        recordType: rec.recordType,
        templateType: rec.templateType,
        label: rec.label,
        ipfsCid: `QmSeed${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 12)}`,
        createdBy: "patient",
        createdByAddress: WALLET,
        formData: rec.formData,
      }),
    });
    if (res.ok) {
      ok++;
      process.stdout.write(".");
    } else {
      process.stdout.write("x");
    }
  }
  console.log(`\n  ✓ ${ok}/${RECORDS.length} records seeded`);
}

// ─── Step 3: Opt the wallet into demo store ───────────────────────────────────

async function optInDemoStore() {
  console.log("\nStep 3: Registering opt-in in demo store...");

  const res = await fetch(`${BASE_URL}/api/demo?action=opt-in-data-sharing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: WALLET }),
  });

  if (res.ok) {
    console.log(`  ✓ ${WALLET} opted in`);
  } else {
    console.error("  ✗ Demo opt-in failed:", await res.text());
  }
}

// ─── Step 4: Verify the API returns real data ─────────────────────────────────

async function verify() {
  console.log("\nStep 4: Verifying /api/data/demographics (without payment)...");

  const res = await fetch(`${BASE_URL}/api/data/demographics`);
  const json = await res.json();

  if (res.status === 402) {
    console.log("  ✓ Got 402 Payment Required — endpoint ready for x402 flow");
    console.log(
      `    payTo: ${json.accepts?.[0]?.payTo} (${json.accepts?.[0]?.maxAmountRequired} KUSD units)`,
    );
  } else if (res.status === 503) {
    console.log("  ✗ 503 — no opted-in records found. Check that:");
    console.log("    a) listData() tx succeeded on-chain");
    console.log("    b) demo store seeding completed");
    console.log("  Response:", json);
  } else {
    console.log("  Response:", json);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Kosyn Demo Seeder ===");
  console.log(`Wallet: ${WALLET}`);
  console.log(`DataMarketplace: ${MARKETPLACE}`);
  console.log(`App: ${BASE_URL}\n`);

  const onChainOk = await callListData();
  if (!onChainOk) {
    console.log(
      "  (Continuing anyway — on-chain state might already be set)\n",
    );
  }

  await seedRecords();
  await optInDemoStore();
  await verify();

  console.log("\n=== Done ===");
  console.log(
    "Now run the full x402 flow — the API will return real aggregated data.",
  );
}

main().catch(console.error);
