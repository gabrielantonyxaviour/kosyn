# Workshop 04: Proof of Reserve with CRE + AI Risk Scoring

**Presenter:** Nolan (DevRel Engineer, Chainlink)
**Topic:** Building a custom Proof of Reserve (PoR) data feed using the Chainlink Runtime Environment (CRE), extended with LLM-based risk scoring via Gemini.
**Prerequisites:** Bun, CRE CLI, ETH on Sepolia (for broadcast), Gemini API key (Google AI Studio)

---

## 1. Problem Statement

Proof of Reserve answers the question: "Does the issuer of a token actually hold enough backing assets to cover the minted supply?"

A traditional PoR data feed is a smart contract with storage values that get updated on a **heartbeat** (timed cadence, e.g., every 24 hours). The system periodically fetches off-chain reserve data, reads on-chain token supply, compares the two, and writes the results on-chain. This demo extends the pattern with an **LLM risk score** -- sending reserve and supply data to Gemini to compute a 0-100 risk assessment.

---

## 2. Architecture Overview

The workflow chains **5 capabilities** in sequence:

```
[Cron Trigger] --> [HTTP: Fetch Off-chain Reserves]
                --> [EVM Read: Get On-chain Total Supply (multi-chain)]
                --> [HTTP: Call Gemini LLM for Risk Score]
                --> [EVM Write: Store results on-chain via Forwarder]
```

### Data Flow

1. **Cron trigger** fires on schedule (e.g., midnight UTC daily)
2. **HTTP GET** to reserve API -- returns total USD reserves and last-updated timestamp
3. **EVM Read** calls `totalSupply()` on an ERC-20 contract (loops over multiple chains, sums supply)
4. **HTTP POST** to Gemini API -- sends reserve + supply values, receives a risk score (0-100)
5. **EVM Write** encodes all three values (totalReserve, totalSupply, riskScore), generates a signed report, writes to the on-chain receiver contract via the forwarder

### CRE Execution Model

- Each workflow is orchestrated by a **Workflow DON**
- Each capability invocation is executed by a **Capability DON** (specialized per task)
- Every node in the DON performs the task independently; results are **cryptographically verified and aggregated** via Byzantine fault-tolerant consensus
- This means HTTP fetches, EVM reads, and even LLM calls all get consensus guarantees

---

## 3. CRE Capabilities Reference

| Capability | Purpose | DON Type |
|---|---|---|
| **Cron Trigger** | Scheduled execution (cron string) | Trigger |
| **Log Trigger** | React to on-chain events | Trigger |
| **HTTP Trigger** | External system POSTs to workflow endpoint | Trigger |
| **HTTP** | Fetch/post data to external APIs | Capability |
| **EVM Read** | Read smart contract state on any EVM chain | Capability |
| **EVM Write** | Write to smart contracts via forwarder pattern | Capability |

A single workflow can have **multiple handlers** (trigger + callback pairs). A single project can have **multiple workflows**.

---

## 4. Technical Details

### 4.1 Project Structure

```
cre-project/
  project.yaml          # Project-wide settings (RPC endpoints, setting profiles)
  secrets.yaml          # Secret variable name mappings (NOT actual values)
  .env                  # Actual secret values (local simulation only)
  workflow-name/
    main.ts             # Workflow entry point
    workflow.yaml       # Entry point path, config path, secrets path
    config/
      staging.json      # Config values for "staging" profile
      production.json   # Config values for "production" profile
    package.json        # Per-workflow dependencies
```

**Key:** Setting profile names are **completely arbitrary** ("staging", "production", "pizza" -- whatever you want). Switch profiles via `CRE_TARGET` env var or `--target` CLI flag.

### 4.2 Config Structure (config JSON)

```json
{
  "schedule": "0 0 * * *",
  "porUrl": "https://api.example.com/reserves",
  "geminiModel": "gemini-pro",
  "evms": [
    {
      "tokenAddress": "0x...",
      "porAddress": "0x...",
      "chainSelectorName": "ethereum-testnet-sepolia",
      "gasLimit": 500000
    }
  ]
}
```

The `evms` array enables **multi-chain operations** -- add another entry for Base Sepolia, Arbitrum, etc. The workflow loops over this array for EVM reads (summing supply across chains).

### 4.3 Secrets Management

**Local simulation:** secrets come from `.env` file in the project root.

**Production:** secrets are uploaded via CRE CLI to an encrypted secret store. Access in code via `runtime.getSecret("SECRET_NAME")`.

**secrets.yaml** maps workflow secret names to environment variable names:
```yaml
secrets:
  - name: GEMINI_API_KEY        # Name in workflow
    env: GEMINI_API_KEY_VAR     # Name in .env
```

**Known gotcha:** If the workflow secret name and env var name are identical, there can be a bug in local simulation. Append `_VAR` to the env name to differentiate. The team may have patched this.

**Critical pattern:** `runtime.getSecret()` is NOT available inside the fetcher function of the send-request pattern. Use a **closure** to capture the secret value before entering the fetcher (see Section 5.2).

### 4.4 Forwarder Pattern (EVM Write)

EVM Write does **not** write directly to your contract. The flow is:

```
CRE Workflow --> Forwarder Contract --> Your Receiver Contract
```

**Forwarder addresses differ by environment:**
- **Simulation forwarders** -- used during local `cre workflow simulate` (no workflow metadata)
- **Production forwarders** -- used on testnet/mainnet deployments (includes workflow metadata)

**Debugging implications:**
- Transactions to your contract appear as **internal transactions** on block explorers
- On Etherscan, enable "Advanced View" to see internal transactions
- The outer transaction (to forwarder) may show "success" even if your contract reverts -- check the `result` field in the emitted log event
- **Tenderly** provides detailed trace views for debugging failed internal calls

**Broadcast flag:** During local simulation, `cre workflow simulate por` does NOT submit on-chain transactions (tx hash will be all zeros). Add `--broadcast` to actually send: `cre workflow simulate por --broadcast`

**Private key in local sim:** EVM writes during simulation come from YOUR wallet (private key in `.env`). In production, nodes in the EVM Write DON sign transactions -- no private key needed from you.

### 4.5 Receiver Template (Solidity)

Any contract receiving EVM Write reports must inherit `ReceiverTemplate`:

1. Set the **forwarder address** in the constructor (access control -- only forwarder can call)
2. Optionally set **metadata fields** for additional access control:
   - `expectedAuthor` -- only this author's workflows can write
   - `expectedWorkflowName`
   - `expectedWorkflowId`
3. Override `processReport(bytes calldata report)` to decode and handle the data

**Important:** Do NOT set metadata fields during local simulation (simulation forwarder doesn't supply them). Deploy your workflow first, get the metadata, then call setter functions on the contract.

---

## 5. Code Examples

### 5.1 Workflow Runner and Cron Trigger (TypeScript)

```typescript
// main.ts
import { CronCapability } from "@aspect-build/cre-sdk";

const initWorkflow = (runtime: Runtime, config: Config): Handler[] => {
  const cronTrigger = new CronCapability("cron-trigger");

  return [
    {
      trigger: cronTrigger.schedule(config.schedule),
      callback: onCronTrigger,
    },
  ];
};

const onCronTrigger = async (
  runtime: Runtime,
  config: Config,
  payload: CronPayload
) => {
  if (!payload.scheduledExecutionTime) {
    throw new Error("No scheduled execution time");
  }

  // Step 1: Fetch off-chain reserves
  const { totalReserves, lastUpdated } = await getOffchainReserves(config);

  // Step 2: Read on-chain supply (multi-chain)
  const totalSupply = await getOnchainSupply(runtime, config);

  // Step 3: Get LLM risk score
  const riskScore = await getRiskScore(runtime, config, totalReserves, totalSupply);

  // Step 4: Write results on-chain
  const txHash = await updateReserves(runtime, config, totalReserves, totalSupply, riskScore);

  return `Reserves: ${totalReserves}, Supply: ${totalSupply}, Risk: ${riskScore}, Tx: ${txHash}`;
};
```

### 5.2 HTTP Capability -- Send Request Pattern with Closure for Secrets

```typescript
const getRiskScore = async (
  runtime: Runtime,
  config: Config,
  totalReserveScaled: bigint,
  totalSupply: bigint
): Promise<number> => {
  const httpClient = new HTTPCapability("http-client");

  // Get secret OUTSIDE the fetcher (runtime.getSecret not available inside)
  const geminiApiKey = runtime.getSecret("GEMINI_API_KEY");

  // Closure captures geminiApiKey
  const fetchRiskAnalysis = (
    sendRequest: SendRequestor,
    // additional args accessible via closure
  ) => {
    return async (req: SendRequestObject) => {
      const body = JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `Reserve: ${totalReserveScaled}, Supply: ${totalSupply}` }] }
        ],
        systemInstruction: {
          parts: [{ text: "You are a risk analyst. Return a risk score 0-100." }]
        },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { type: "object", properties: { riskScore: { type: "integer" } } }
        }
      });

      const result = await sendRequest({
        method: "POST",
        url: `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${geminiApiKey}`,
        body: body,
        // CRITICAL: Cache settings prevent N nodes from each calling the LLM
        cacheSettings: {
          maxAge: 60, // TTL in seconds
        },
      });

      if (result.statusCode !== 200) throw new Error("Gemini request failed");
      const parsed = JSON.parse(result.body);
      return { riskScore: parsed.candidates[0].content.parts[0].text };
    };
  };

  const result = await httpClient.sendRequest(
    fetchRiskAnalysis,
    {
      consensus: {
        aggregation: "byFields",
        fields: {
          riskScore: { type: "median" },
        },
      },
    }
  );

  return result.riskScore;
};
```

### 5.3 EVM Read -- Multi-Chain Total Supply

```typescript
const getOnchainSupply = async (runtime: Runtime, config: Config): Promise<bigint> => {
  let totalSupply = 0n;

  for (const evm of config.evms) {
    const network = getNetworkDetailsByChainSelectorName(evm.chainSelectorName);
    if (!network) throw new Error(`Invalid network: ${evm.chainSelectorName}`);

    const evmClient = new EVMClient(network.chainSelector);

    const callData = encodeContractCallData({
      abi: IERC20_ABI,   // Can be inline or imported
      functionName: "totalSupply",
    });

    const result = await evmClient.call({
      from: "0x0000000000000000000000000000000000000000",
      to: evm.tokenAddress,
      data: callData,
    });

    const decoded = decodeContractCallResult({
      abi: IERC20_ABI,
      functionName: "totalSupply",
      data: result,
    });

    totalSupply += decoded[0] as bigint;
  }

  return totalSupply;
};
```

### 5.4 EVM Write -- Generate Report and Write On-Chain

```typescript
const updateReserves = async (
  runtime: Runtime,
  config: Config,
  totalReserves: bigint,
  totalSupply: bigint,
  riskScore: number
): Promise<string> => {
  const evm = config.evms[0]; // Target first chain
  const network = getNetworkDetailsByChainSelectorName(evm.chainSelectorName);
  if (!network) throw new Error(`Invalid network`);

  const evmClient = new EVMClient(network.chainSelector);

  // Encode the report payload
  const encodedData = encodeAbiParameters(
    [
      { name: "totalMinted", type: "uint256" },
      { name: "totalReserve", type: "uint256" },
      { name: "riskScore", type: "uint256" },
    ],
    [totalSupply, totalReserves, BigInt(riskScore)]
  );

  // Generate a signed report
  const report = await runtime.report({
    receiver: evm.porAddress,
    data: encodedData,
    gasLimit: evm.gasLimit,
  });

  // Write to chain (goes through forwarder -> your contract)
  const result = await evmClient.write(report);

  return result.transactionHash;
};
```

### 5.5 Solidity Receiver Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReceiverTemplate} from "@aspect-build/cre-contracts/ReceiverTemplate.sol";

contract MinimalReserve is ReceiverTemplate {
    uint256 public lastTotalMinted;
    uint256 public lastTotalReserve;
    uint256 public lastRiskScore;
    uint256 public requestIdCounter;

    // Metadata for production access control
    bytes32 public expectedAuthor;
    bytes32 public expectedWorkflowName;
    bytes32 public expectedWorkflowId;

    constructor(address forwarder) ReceiverTemplate(forwarder) {}

    // Override to handle incoming CRE reports
    function processReport(bytes calldata report) internal override {
        (uint256 totalMinted, uint256 totalReserve, uint256 riskScore) =
            abi.decode(report, (uint256, uint256, uint256));
        _updateReserves(totalMinted, totalReserve, riskScore);
    }

    function _updateReserves(
        uint256 totalMinted,
        uint256 totalReserve,
        uint256 riskScore
    ) private {
        lastTotalMinted = totalMinted;
        lastTotalReserve = totalReserve;
        lastRiskScore = riskScore;
        requestIdCounter++;
    }

    // Setter functions for metadata (call after deploying workflow)
    function setExpectedAuthor(bytes32 _author) external onlyOwner {
        expectedAuthor = _author;
    }

    function setExpectedWorkflowName(bytes32 _name) external onlyOwner {
        expectedWorkflowName = _name;
    }

    function setExpectedWorkflowId(bytes32 _id) external onlyOwner {
        expectedWorkflowId = _id;
    }
}
```

---

## 6. Key Patterns

### Closure Pattern for Secrets
`runtime.getSecret()` is unavailable inside fetcher functions. Capture secrets in the outer scope and let the closure carry them into the fetcher. This is the most common gotcha when first using secrets with the send-request pattern.

### Cache Settings for Non-Idempotent / Expensive Calls
Since every DON node executes independently, an N-node DON would make N API calls. Use `cacheSettings.maxAge` so one node makes the real call and others read from cache. Consensus still runs on the cached values. Essential for:
- LLM calls (cost + non-determinism)
- POST requests with side effects
- Rate-limited APIs

### Multi-Chain EVM Reads via Config Array
Define an `evms[]` array in config with per-chain addresses and chain selector names. Loop over it in your workflow to aggregate data across chains. Adding a new chain is a config change, not a code change.

### Forwarder Pattern for EVM Writes
All EVM writes go through a forwarder contract. Your contract must inherit `ReceiverTemplate` and override `processReport()`. Use simulation forwarders locally, production forwarders on testnet/mainnet. Deploy metadata restrictions after getting workflow ID from production deployment.

### Send Request Pattern
The recommended HTTP pattern separates the **fetcher function** (core request logic) from the **handler** (calling `sendRequest` with consensus config). The fetcher receives a `SendRequestor` object and returns structured data. The handler specifies consensus type per field (`median`, `strict`, `skip`).

### Config Profiles with Target
Use arbitrary setting profile names in `project.yaml`. Switch between them via `CRE_TARGET` env var or `--target` CLI flag. Useful for local/staging/production configs without code changes.

---

## 7. Hackathon Ideas

The presenter emphasized that the PoR pattern is **generalizable** -- not limited to stablecoin reserves:

- **Weather data feed** -- Query weather API, write temperature/conditions on-chain on a schedule
- **Sports scores** -- Live game scores as an on-chain data feed (query sports API, write to chain)
- **Player stats aggregation** -- Pull stats from multiple endpoints, aggregate, write on-chain
- **Cross-chain token analytics** -- Sum supply/liquidity across multiple chains, compute metrics, store on-chain
- **AI-enhanced data feeds** -- Any data feed + LLM analysis (sentiment scoring, anomaly detection, risk assessment)
- **E-commerce payment bridge** -- HTTP trigger from payment processor, update on-chain state
- **NFT-triggered automation** -- Log trigger on mint events, perform off-chain actions, write results back

The key insight: plan your system as if building a traditional app, then map each step to a CRE capability.

---

## 8. Key Insights

1. **Think in capabilities, not in CRE.** Plan your workflow as a normal system flow first (HTTP calls, chain reads, chain writes), then map each step to the corresponding CRE capability. CRE slots in seamlessly.

2. **Consensus is automatic and universal.** Every capability execution gets Byzantine fault-tolerant consensus -- not just on-chain parts. Off-chain API fetches and LLM calls are also validated across DON nodes.

3. **Local simulation makes real calls.** HTTP requests and EVM reads during `cre workflow simulate` hit real endpoints from your machine. Build a mock Express server for development to avoid rate limits and token burn.

4. **Multi-chain is a config change.** Adding a new chain to your workflow is as simple as adding an entry to the `evms[]` config array. No code changes needed.

5. **Secrets require the closure pattern.** This is the #1 gotcha. `runtime.getSecret()` is not available inside fetcher functions -- always capture secrets in the outer scope.

6. **Cache settings prevent DON cost explosion.** Without caching, N nodes = N LLM calls = N times the cost. One node fetches, others use cache, consensus still runs.

7. **EVM Write transactions are internal.** They go through a forwarder contract, so they appear as internal transactions on explorers. A "successful" outer transaction can still have a failed inner call to your contract -- check the `result` log field.

8. **Use the complete CRE docs for LLM assistance.** The docs site offers a downloadable complete TS/Go docs text file specifically for feeding to AI coding assistants. Combined with the Chainlink MCP server, this dramatically improves agent accuracy for CRE workflows.

9. **Request deployment access early.** Production deployment (testnet/mainnet) requires requesting access through the CRE dashboard. Local simulation works without this, but plan ahead.

10. **Reference demos for advanced patterns:** The GCP Prediction Market demo and the CRE x402 Price demo are substantially larger and demonstrate multiple handlers, advanced capability chaining, and production patterns.

---

## CLI Quick Reference

```bash
# Setup
cre login                              # Authenticate CLI
cre whoami                             # Verify login
cre -v                                 # Check version
cre update                             # Update CLI

# Project
cre init                               # Initialize new project + workflow

# Development
cre workflow simulate <name>           # Local simulation (no on-chain tx)
cre workflow simulate <name> --broadcast  # Local sim WITH real on-chain tx
cre workflow simulate <name> --target staging  # Use specific config profile

# Secrets (production)
cre secrets upload                     # Upload secrets to CRE encrypted store
```
