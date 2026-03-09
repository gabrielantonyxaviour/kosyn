---
name: kosyn-data-api
description: >
  Complete reference for querying the Kosyn Health Analytics Data API using x402 micropayments on Avalanche Fuji.
  Use this skill whenever someone asks how to access Kosyn health data, query population health statistics,
  integrate the x402 payment flow for healthcare analytics, or use KUSD to pay for anonymized EHR data.
  Also use when anyone asks about the Kosyn data marketplace, how researchers access patient data, or
  how to build apps on top of the Kosyn platform. This skill covers endpoint catalog, payment flow,
  contract addresses, code examples in JS/Python/curl, and response schemas — everything an agent
  needs to make a working x402 payment and receive health analytics data.
---

# Kosyn Health Analytics Data API

Kosyn is a HIPAA-compliant Electronic Health Record platform on Avalanche Fuji (chain 43113).
Patients consent to share anonymized records. Researchers pay KUSD via the x402 micropayment
standard to query privacy-preserving population health statistics.

**No API keys. No accounts. No billing setup. Any wallet with KUSD on Fuji can query.**

---

## How It Works

1. Hit an endpoint → get a `402 Payment Required` with payment instructions
2. Approve KUSD spend on DataMarketplace contract
3. Call `submitQuery()` on DataMarketplace — KUSD is transferred, CRE workflow triggers to distribute revenue to patients
4. Retry the endpoint with the tx hash as `x-payment` header → receive data

The API verifies payment on-chain (checks receipt, recipient, and amount) before returning data.
After payment, patients automatically receive proportional KUSD shares via Chainlink CRE (async, ~10–30s).

---

## Contract Addresses (Avalanche Fuji, chain 43113)

| Contract | Address |
|---|---|
| DataMarketplace | `0xCAe1c804932AB07d3428774058eC14Fb4dfb2baB` |
| KosynUSD (KUSD) | `0xab11cda079c613eFA68C35dC46e4C05E0b1e1645` |

**RPC:** `https://api.avax-test.network/ext/bc/C/rpc`

**CRITICAL:** KUSD has **6 decimals** (like USDC). Always use `10^6`, never `10^18`.
- 10 KUSD = `10000000` (10 × 10⁶)
- 25 KUSD = `25000000`
- 50 KUSD = `50000000`

## Getting KUSD for Testing

KUSD is minted by the Kosyn platform when patients deposit via Stripe (on-chain: `KosynUSD.onReport()` called by CRE).

For testnet demos, the platform forwarder wallet holds test KUSD. To get test KUSD into your wallet:
1. Go to the Kosyn app `/patients/deposit` — use Stripe test card `4242 4242 4242 4242`, any future date/CVC
2. Or ask the platform team for a test transfer from the faucet wallet

**Testnet forwarder wallet** (for integration testing): `0x6B9ad963c764a06A7ef8ff96D38D0cB86575eC00` on Fuji.

---

## Endpoint Catalog

Base URL: `https://kosyn.app/api/data/{endpoint}`
> If running locally: `http://localhost:3000/api/data/{endpoint}`

All endpoints are `GET`. All require x402 payment via `x-payment` header (lowercase — Next.js normalizes headers).

### 1. `/demographics` — 10 KUSD

Age and gender distribution across all consenting patients.
Privacy: k-anonymity (k≥3) + Laplace noise.

**Response schema:**
```json
{
  "total_patients": 847,
  "age_distribution": {
    "18-30": 23,
    "31-45": 38,
    "46-60": 28,
    "60+": 11
  },
  "gender_split": {
    "male": 48,
    "female": 51,
    "other": 1
  },
  "last_updated": "2026-03-09T00:00:00Z",
  "privacy": "k-anonymity k>=3, differential privacy ε=1.0"
}
```

---

### 2. `/conditions` — 25 KUSD

Most prevalent diagnosed conditions from consultation records.
Privacy: k-anonymity (k≥3) + differential privacy (ε=0.1).

**Response schema:**
```json
{
  "total_consultations": 2341,
  "top_conditions": [
    { "condition": "Hypertension", "count": 312, "pct": 13.3 },
    { "condition": "Type 2 Diabetes", "count": 287, "pct": 12.3 },
    { "condition": "Anxiety/Depression", "count": 241, "pct": 10.3 },
    { "condition": "Hyperlipidemia", "count": 198, "pct": 8.5 },
    { "condition": "Osteoarthritis", "count": 156, "pct": 6.7 }
  ],
  "last_updated": "2026-03-09T00:00:00Z",
  "privacy": "k-anonymity k>=3, differential privacy ε=0.1"
}
```

---

### 3. `/outcomes` — 50 KUSD

Treatment outcome correlations grouped by medical category.
Privacy: k-anonymity (k≥3) + synthetic noise injection.

**Response schema:**
```json
{
  "total_treatment_episodes": 1893,
  "improvement_rates": [
    { "category": "Cardiovascular", "improved_pct": 71, "avg_weeks": 12 },
    { "category": "Metabolic", "improved_pct": 64, "avg_weeks": 24 },
    { "category": "Mental Health", "improved_pct": 68, "avg_weeks": 16 },
    { "category": "Musculoskeletal", "improved_pct": 79, "avg_weeks": 8 }
  ],
  "last_updated": "2026-03-09T00:00:00Z",
  "privacy": "k-anonymity k>=3, synthetic noise added"
}
```

---

## The 402 Response

When you hit an endpoint without payment you receive:

```json
{
  "x402Version": 1,
  "error": "Payment Required",
  "accepts": [{
    "scheme": "exact",
    "network": "eip155:43113",
    "maxAmountRequired": "10000000",
    "resource": "/api/data/demographics",
    "description": "Age/gender distribution across consenting patients",
    "payTo": "0xCAe1c804932AB07d3428774058eC14Fb4dfb2baB",
    "currency": "KUSD"
  }]
}
```

`maxAmountRequired` is already in 6-decimal units. `payTo` is always the DataMarketplace address.

---

## Code Examples

### JavaScript (thirdweb v5)

```javascript
import { createThirdwebClient, prepareContractCall, sendTransaction, getContract } from "thirdweb";
import { defineChain } from "thirdweb/chains";

const client = createThirdwebClient({ clientId: "YOUR_CLIENT_ID" });
const chain = defineChain(43113);

const KUSD_ADDRESS    = "0xab11cda079c613eFA68C35dC46e4C05E0b1e1645";
const MARKETPLACE     = "0xCAe1c804932AB07d3428774058eC14Fb4dfb2baB";

const kusd        = getContract({ client, chain, address: KUSD_ADDRESS });
const marketplace = getContract({ client, chain, address: MARKETPLACE });

// Step 1: Approve KUSD spend (10 KUSD = 10 * 10^6)
await sendTransaction({
  transaction: prepareContractCall({
    contract: kusd,
    method: "function approve(address, uint256) returns (bool)",
    params: [MARKETPLACE, 10n * 10n ** 6n],
  }),
  account, // your connected thirdweb account
});

// Step 2: Submit payment — triggers CRE workflow for patient revenue distribution
const receipt = await sendTransaction({
  transaction: prepareContractCall({
    contract: marketplace,
    method: "function submitQuery(string, uint256)",
    params: ["demographics", 10n * 10n ** 6n],
  }),
  account,
});

// Step 3: Fetch data with payment proof
const res = await fetch("https://kosyn.app/api/data/demographics", {
  headers: { "x-payment": receipt.transactionHash },
});
const data = await res.json();
console.log(data);
```

---

### Python (web3.py)

```python
from web3 import Web3
import requests

w3 = Web3(Web3.HTTPProvider("https://api.avax-test.network/ext/bc/C/rpc"))

KUSD_ADDRESS = "0xab11cda079c613eFA68C35dC46e4C05E0b1e1645"
MARKETPLACE  = "0xCAe1c804932AB07d3428774058eC14Fb4dfb2baB"
account      = "0xYOUR_WALLET_ADDRESS"

ERC20_ABI = [
    {"name": "approve", "type": "function",
     "inputs": [{"name":"spender","type":"address"}, {"name":"amount","type":"uint256"}],
     "outputs": [{"name":"","type":"bool"}]}
]
MARKETPLACE_ABI = [
    {"name": "submitQuery", "type": "function",
     "inputs": [{"name":"queryParams","type":"string"}, {"name":"payment","type":"uint256"}],
     "outputs": []}
]

kusd        = w3.eth.contract(address=KUSD_ADDRESS, abi=ERC20_ABI)
marketplace = w3.eth.contract(address=MARKETPLACE,  abi=MARKETPLACE_ABI)

# Step 1: Approve (10 KUSD = 10 * 10^6)
kusd.functions.approve(MARKETPLACE, 10 * 10**6).transact({"from": account})

# Step 2: Submit payment
tx_hash = marketplace.functions.submitQuery("demographics", 10 * 10**6).transact({"from": account})
w3.eth.wait_for_transaction_receipt(tx_hash)

# Step 3: Fetch data
res = requests.get(
    "https://kosyn.app/api/data/demographics",
    headers={"x-payment": tx_hash.hex()}
)
print(res.json())
```

---

### curl (with existing payment tx hash)

```bash
# First hit — get 402 with payment instructions
curl https://kosyn.app/api/data/demographics

# After paying on-chain, retry with tx hash
curl https://kosyn.app/api/data/demographics \
  -H "x-payment: 0xYOUR_TX_HASH_HERE"
```

---

## Pricing Quick Reference

| Endpoint | Price | In 6-decimal units | BigInt (JS) |
|---|---|---|---|
| demographics | 10 KUSD | 10000000 | `10n * 10n ** 6n` |
| conditions | 25 KUSD | 25000000 | `25n * 10n ** 6n` |
| outcomes | 50 KUSD | 50000000 | `50n * 10n ** 6n` |

---

## Key Rules

- **KUSD = 6 decimals.** The most common mistake is using `10^18` — never do this. KUSD is like USDC, not ETH.
- **Two transactions required:** approve (ERC-20) + submitQuery (DataMarketplace). Both must succeed before fetching.
- **x-payment header:** send the raw tx hash from the `submitQuery` call, not the approve tx.
- **Verification:** the API calls Fuji RPC to check the tx succeeded, recipient is DataMarketplace, and value ≥ price.
- **Patient revenue:** every query payment is automatically distributed to contributing patients by a Chainlink CRE TEE workflow. This happens asynchronously after your query — you don't need to do anything.
- **No API keys ever.** If you're being asked to set up an API key for Kosyn, something is wrong.
- **Network:** always Avalanche Fuji (chain ID 43113). Wrong chain = tx not found = 402 error.
