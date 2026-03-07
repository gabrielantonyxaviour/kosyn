export type EndpointReturn = { field: string; type: string; desc: string };

export type EndpointDef = {
  id: string;
  name: string;
  method: "GET";
  price: number;
  category: string;
  description: string;
  returns: EndpointReturn[];
  curl: string;
  js: string;
  python: string;
};

export const ENDPOINTS: EndpointDef[] = [
  {
    id: "demographics",
    name: "Demographics",
    method: "GET",
    price: 10,
    category: "Population",
    description:
      "Age and gender distribution across all consenting patients. Privacy-preserving aggregation using k-anonymity (k≥3) and Laplace noise — raw records never exposed.",
    returns: [
      {
        field: "total_patients",
        type: "number",
        desc: "Total consenting patients in dataset",
      },
      {
        field: "age_distribution",
        type: "object",
        desc: "% breakdown by group: 18-30, 31-45, 46-60, 60+",
      },
      {
        field: "gender_split",
        type: "object",
        desc: "% breakdown: male, female, other",
      },
      {
        field: "last_updated",
        type: "ISO 8601",
        desc: "Timestamp of last TEE aggregation",
      },
      { field: "privacy", type: "string", desc: "Privacy technique applied" },
    ],
    curl: `curl https://kosyn.app/api/data/demographics \\
  -H "X-Payment: <tx_hash>"`,
    js: `import { prepareContractCall } from "thirdweb";

// 1. Approve KUSD spend
await sendTx(prepareContractCall({
  contract: kosynUSD,
  method: "function approve(address, uint256) returns (bool)",
  params: [DATA_MARKETPLACE, 10n * 10n ** 6n],
}));

// 2. Submit payment — emits QuerySubmitted(queryId, caller, amount)
const receipt = await sendTx(prepareContractCall({
  contract: dataMarketplace,
  method: "function submitQuery(string, uint256)",
  params: ["demographics", 10n * 10n ** 6n],
}));

// 3. Fetch data with tx hash as proof
const res = await fetch("https://kosyn.app/api/data/demographics", {
  headers: { "X-Payment": receipt.transactionHash },
});
const data = await res.json();`,
    python: `from web3 import Web3
import requests

w3 = Web3(Web3.HTTPProvider("https://api.avax-test.network/ext/bc/C/rpc"))

# 1. Approve + submit payment
kusd.functions.approve(DATA_MARKETPLACE, 10 * 10**6).transact()
tx = marketplace.functions.submitQuery(
    "demographics", 10 * 10**6
).transact()

# 2. Fetch data with proof
res = requests.get(
    "https://kosyn.app/api/data/demographics",
    headers={"X-Payment": tx.hex()}
)
data = res.json()`,
  },
  {
    id: "conditions",
    name: "Conditions",
    method: "GET",
    price: 25,
    category: "Clinical",
    description:
      "Most prevalent diagnosed conditions derived from consultation records. Differential privacy (ε=0.1) is applied to prevent individual re-identification while preserving statistical accuracy.",
    returns: [
      {
        field: "total_consultations",
        type: "number",
        desc: "Total consultations in dataset",
      },
      {
        field: "top_conditions",
        type: "array",
        desc: "Top 5 conditions by prevalence",
      },
      {
        field: "top_conditions[].condition",
        type: "string",
        desc: "Condition name",
      },
      {
        field: "top_conditions[].count",
        type: "number",
        desc: "Noised occurrence count",
      },
      {
        field: "top_conditions[].pct",
        type: "number",
        desc: "% of total consultations",
      },
      { field: "privacy", type: "string", desc: "Privacy technique applied" },
    ],
    curl: `curl https://kosyn.app/api/data/conditions \\
  -H "X-Payment: <tx_hash>"`,
    js: `await sendTx(prepareContractCall({
  contract: kosynUSD,
  method: "function approve(address, uint256) returns (bool)",
  params: [DATA_MARKETPLACE, 25n * 10n ** 6n],
}));

const receipt = await sendTx(prepareContractCall({
  contract: dataMarketplace,
  method: "function submitQuery(string, uint256)",
  params: ["conditions", 25n * 10n ** 6n],
}));

const res = await fetch("https://kosyn.app/api/data/conditions", {
  headers: { "X-Payment": receipt.transactionHash },
});
const data = await res.json();`,
    python: `kusd.functions.approve(DATA_MARKETPLACE, 25 * 10**6).transact()
tx = marketplace.functions.submitQuery(
    "conditions", 25 * 10**6
).transact()

res = requests.get(
    "https://kosyn.app/api/data/conditions",
    headers={"X-Payment": tx.hex()}
)
data = res.json()`,
  },
  {
    id: "outcomes",
    name: "Outcomes",
    method: "GET",
    price: 50,
    category: "Research",
    description:
      "Treatment outcome correlations grouped by medical category. Derived from longitudinal patient records. Combines TEE aggregation with synthetic noise injection for the strongest re-identification resistance.",
    returns: [
      {
        field: "total_treatment_episodes",
        type: "number",
        desc: "Total tracked treatment periods",
      },
      {
        field: "improvement_rates",
        type: "array",
        desc: "Outcome data by category",
      },
      {
        field: "improvement_rates[].category",
        type: "string",
        desc: "Medical category",
      },
      {
        field: "improvement_rates[].improved_pct",
        type: "number",
        desc: "% of patients who improved",
      },
      {
        field: "improvement_rates[].avg_weeks",
        type: "number",
        desc: "Avg treatment duration in weeks",
      },
      { field: "privacy", type: "string", desc: "Privacy technique applied" },
    ],
    curl: `curl https://kosyn.app/api/data/outcomes \\
  -H "X-Payment: <tx_hash>"`,
    js: `await sendTx(prepareContractCall({
  contract: kosynUSD,
  method: "function approve(address, uint256) returns (bool)",
  params: [DATA_MARKETPLACE, 50n * 10n ** 6n],
}));

const receipt = await sendTx(prepareContractCall({
  contract: dataMarketplace,
  method: "function submitQuery(string, uint256)",
  params: ["outcomes", 50n * 10n ** 6n],
}));

const res = await fetch("https://kosyn.app/api/data/outcomes", {
  headers: { "X-Payment": receipt.transactionHash },
});
const data = await res.json();`,
    python: `kusd.functions.approve(DATA_MARKETPLACE, 50 * 10**6).transact()
tx = marketplace.functions.submitQuery(
    "outcomes", 50 * 10**6
).transact()

res = requests.get(
    "https://kosyn.app/api/data/outcomes",
    headers={"X-Payment": tx.hex()}
)
data = res.json()`,
  },
];
