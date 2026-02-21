# CRE Bootcamp Day 2 - Complete Project Summary

## 1. Overview

**Workshop:** CRE Bootcamp Day 2 (Chainlink Runtime Environment)
**Series:** Part of a 2-day bootcamp series, prerequisite for the Convergence hackathon
**Presenters:**
- **Andre** (primary presenter) - Developer team, Chain Labs
- **Solange Gerros (Sol)** - Developer team, Chain Labs

**Duration:** ~2 hours
**Prerequisites:** Day 1 of the CRE Bootcamp (recording on Chainlink YouTube), plus a Link Lab session from January

**Day 1 Recap (what was already built):**
- Deployed a prediction market smart contract to Ethereum Sepolia testnet
- Covered CRE mental model: workflows, triggers, capabilities
- Learned HTTP trigger and EVM write capability
- Built: HTTP trigger fires CRE workflow with a prediction market question -> EVM write capability calls `createMarket()` on the smart contract

**Day 2 Covers:**
- Log trigger capability (event-driven workflows)
- EVM read capability (reading smart contract state)
- HTTP capability (calling external APIs - Gemini AI)
- Secrets management
- Consensus/aggregation strategies
- Wiring everything together into a complete end-to-end workflow

---

## 2. Project Built

An **AI-Powered Prediction Market** built end-to-end with CRE (Chainlink Runtime Environment).

**Complete flow:**
1. User calls `requestSettlement()` on the prediction market smart contract, which emits a `SettlementRequested` event
2. CRE **log trigger** catches the on-chain event
3. CRE **EVM read** capability reads the market data from the smart contract to verify it hasn't been settled already
4. CRE **HTTP capability** queries **Google Gemini AI** to determine the outcome of the prediction question ("Will Argentina win the 2022 World Cup?")
5. CRE **EVM write** capability calls `settleMarket()` on the smart contract with the AI-determined outcome
6. Winners can then call `claim()` to withdraw their share of the pool

**Smart contract functions used:**
- `createMarket()` - Day 1
- `requestSettlement(marketId)` - Emits `SettlementRequested` event
- `getMarket(marketId)` - View function returning market struct
- `getPrediction(marketId, predictor)` - View function returning prediction details
- `predict(marketId, prediction)` - Payable function (0 = yes, 1 = no)
- `settleMarket(marketId, outcome, confidence)` - Called via CRE workflow
- `claim(marketId)` - Withdraw winnings

---

## 3. Step-by-Step Walkthrough

### Environment Check
```bash
# Check CRE CLI version (must be >= 1.0)
cre --version

# Check logged-in account
cre whoami

# Load environment variables
source .env

# Verify smart contract deployment from Day 1
export MARKET_ADDRESS=<your-contract-address>
cast call $MARKET_ADDRESS "getMarket(uint256)" 0 --rpc-url <sepolia-rpc-url>
```

The `config.staging.json` must contain the deployed smart contract address from Day 1.

### Step 1: Log Trigger - Create `logCallback.ts`

Create a new file at `prediction-market/my-workflow/logCallback.ts`.

This file:
- Imports CRE SDK and Viem utilities
- Defines a config interface matching `config.staging.json`
- Parses the `SettlementRequested` event ABI
- Exports an `onLogTrigger` callback function that:
  - Receives `EVMLogPayload` (topics, data, address, blockNumber, txHash)
  - Filters topics and converts data to hex using `toHex()` helper from CRE SDK
  - Decodes the event log using the event ABI
  - Extracts `marketId` and `question` from the decoded log
  - Console logs the values for verification

### Step 2: Update `main.ts` to Wire Log Trigger

Update the main workflow file to include a second handler:
- Import the `onLogTrigger` callback
- Hash the `SettlementRequested` event signature using `keccak256`
- Get network details (same pattern as EVM write)
- Create an EVM client object
- Add a second handler to the returned array:
  - `evmClient.logTrigger()` with config (address, event hash, confidence level)
  - Paired with the `onLogTrigger` callback

The handlers array now contains TWO entries:
1. HTTP trigger + HTTP callback (from Day 1)
2. Log trigger + log callback (new)

### Step 3: Trigger the Event On-Chain

```bash
# Call requestSettlement to emit the SettlementRequested event
cast send $MARKET_ADDRESS "requestSettlement(uint256)" 0 \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --rpc-url <sepolia-rpc-url>
```

**Save the transaction hash** - it is needed for simulation.

### Step 4: Simulate the Log Trigger

```bash
cre workflow simulate my-workflow
```

Interactive prompts:
1. Select trigger type: choose **2** (log trigger on Ethereum Sepolia)
2. Paste the **transaction hash** from Step 3
3. Enter event index: **0** (first/only event in the transaction)

Expected output: Console logs showing `SettlementRequested` for market 0 with the question text.

### Step 5: Add EVM Read Capability

Update `logCallback.ts` to add Step 2 (reading smart contract state):
- Define a `Market` TypeScript interface
- Add `getMarket` ABI as a constant
- After decoding the event, use `encodeFunctionData` (Viem) to calculate call data for `getMarket(marketId)`
- Call `evmClient.callContract()` with:
  - `from`: zero address (read operation)
  - `to`: market contract address
  - `data`: encoded call data
  - `blockNumber`: `lastFinalizedBlockNumber` (safest option)
- Decode the result using `decodeFunctionResult`
- Check if `market.settled === true` and return early if so

### Step 6: Simulate Again (Verify EVM Read)

Run the same simulation command with the same transaction hash. Expected output now includes market details: creator address, settled status (false), yes/no pool values, and the question.

### Step 7: Set Up Secrets for Gemini API

**Update `secrets.yaml`** (project root):
```yaml
# Secret name used in workflow code -> env variable name
"GEMINI_API_KEY": "GEMINI_API_KEY_VAR"
```

**CRITICAL GOTCHA:** The secret name (left) and the env variable name (right) MUST NOT be the same string. If both are `GEMINI_API_KEY`, you get strange errors.

**Update `.env`:**
```
GEMINI_API_KEY_VAR=<your-actual-gemini-api-key>
```

**Update `my-workflow/workflow.yaml`:**
Under `staging_settings`, add the secrets path:
```yaml
staging_settings:
  secrets_path: "secrets.yaml"
```

### Step 8: Create `gemini.ts`

Create `prediction-market/my-workflow/gemini.ts` containing:
- A system prompt instructing Gemini to respond with a specific JSON format (`{ result: "yes"|"no", confidence: number }`)
- The user prompt template
- A `buildGeminiRequest()` helper that constructs the HTTP request (URL, method, base64-encoded body, headers)
- An `askGemini()` function that:
  - Creates an HTTP client: `cre.capabilities.HTTPClient`
  - Calls `httpClient.sendRequest(runtime, fetchFunction, consensusStrategy)`
  - Uses `consensus.identicalAggregation` (all nodes must return the same result)
  - Gets the API key via `runtime.getSecret("GEMINI_API_KEY")`

**Gemini endpoint used:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=<API_KEY>`

### Step 9: Complete `logCallback.ts` - Wire Everything Together

Final update to `logCallback.ts` adds:
- **Step 3:** Query Gemini AI
  - Call `askGemini()` helper
  - Parse JSON response, extract result (yes/no) and confidence
  - Map to smart contract values: 0 = yes, 1 = no
- **Step 4:** EVM Write (settle the market)
  - Encode `settleMarket(marketId, outcome, confidence)` call data
  - Append `0x01` prefix flag (signals settle vs create in the entry point)
  - Two-step pattern: sign the report cryptographically, then call `writeReport()` via the keystone forwarder contract
  - Log the transaction hash on success

### Step 10: Make Predictions (Before Settling)

```bash
# Predict "yes" (0) on market 0, betting 0.01 ETH
cast send $MARKET_ADDRESS "predict(uint256,uint256)" 0 0 \
  --value 0.01ether \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --rpc-url <sepolia-rpc-url>
```

### Step 11: Trigger Settlement Event Again

```bash
cast send $MARKET_ADDRESS "requestSettlement(uint256)" 0 \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --rpc-url <sepolia-rpc-url>
```

Save the new transaction hash.

### Step 12: Final Simulation with Broadcast

```bash
cre workflow simulate my-workflow --broadcast
```

The `--broadcast` flag is **required** when using EVM write capability to actually execute the on-chain transaction (not just dry run).

Interactive prompts: same as before (select log trigger, paste tx hash, event index 0).

**Expected output:**
1. Event decoded: SettlementRequested for market 0
2. Market data read: settled = false, pool values shown
3. Gemini AI queried: returns "yes" with confidence 100
4. Settlement report signed and written on-chain
5. Transaction hash for the settlement

### Step 13: Verify On-Chain

```bash
# Verify market is now settled
cast call $MARKET_ADDRESS "getMarket(uint256)" 0 --rpc-url <sepolia-rpc-url>
# settled field should now be true
```

### Step 14: Claim Winnings

```bash
cast send $MARKET_ADDRESS "claim(uint256)" 0 \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --rpc-url <sepolia-rpc-url>
```

---

## 4. Technical Details

### CRE SDK Imports

```typescript
import { cre, getNetwork } from "@cre/sdk";
```

### Network Configuration

```typescript
const network = getNetwork({
  chainFamily: "evm",
  chainSelectorName: "ethereum-testnet-sepolia",  // NOT camelCase
  isTestnet: true,
});
```

**Important:** Chain selector names use the format `ethereum-testnet-sepolia`, NOT `ethereumSepolia`. Find all names in the official CRE docs.

### EVM Client Creation

```typescript
const evmClient = cre.capabilities.EVMClient(network.chainSelector);
```

Used for all three EVM capabilities: `logTrigger()`, `callContract()`, `writeContract()`.

### Log Trigger Configuration

```typescript
evmClient.logTrigger({
  addresses: ["0x<contract-address>"],
  topics: ["0x<keccak256-event-signature-hash>"],
  confidence: "finalized",  // Options: "latest", "safe" (default), "finalized"
});
```

**Confidence levels:**
- `latest` - Latest block (least secure, fastest)
- `safe` - Default value if omitted
- `finalized` - Transaction must be finalized on-chain (most secure, slowest)

### EVM Read - `callContract()`

```typescript
const callData = encodeFunctionData({
  abi: getMarketABI,
  functionName: "getMarket",
  args: [marketId],
});

const result = await evmClient.callContract(runtime, {
  call: {
    from: "0x0000000000000000000000000000000000000000",  // Always zero address for reads
    to: marketAddress,
    data: callData,
  },
  blockNumber: lastFinalizedBlockNumber,  // from CRE SDK
});

const decoded = decodeFunctionResult({
  abi: getMarketABI,
  functionName: "getMarket",
  data: result,
}) as Market;
```

**Block number options for reads:**
- `lastFinalizedBlockNumber` - Safest, only reads finalized state
- `latestBlockNumber` - Reads latest state (may include unfinalized changes)
- Specific block number - For querying historical data

### EVM Write - Two-Step Pattern

```typescript
// Step 1: Sign the report
const signedReport = await cre.signReport(runtime, encodedData);

// Step 2: Write via keystone forwarder
const txHash = await evmClient.writeReport(runtime, signedReport);
```

This is the same pattern from Day 1. Data goes through the keystone forwarder proxy contract to reach your smart contract.

### HTTP Capability

```typescript
const httpClient = cre.capabilities.HTTPClient;

const response = await httpClient.sendRequest(
  runtime,
  fetchFunction,          // Your function that builds and returns the HTTP request
  aggregationStrategy,    // Consensus mechanism
);

const result = response.result;
```

### HTTP Request Format

```typescript
{
  url: "https://api.example.com/endpoint",
  method: "GET",  // or "POST", "PUT", "DELETE"
  body: btoa(JSON.stringify(bodyObject)),  // Must be base64 encoded
  headers: { "Content-Type": "application/json" },
  cacheSettings: {       // Required for POST/PUT/PATCH/DELETE
    store: true,
    maxAge: 60,          // Cache duration in seconds
  },
}
```

### Consensus Aggregation Options

| Strategy | Use Case | Description |
|----------|----------|-------------|
| `consensus.identicalAggregation` | Identical results expected | All nodes must return the same value |
| `consensus.medianAggregation` | Numbers/dates | Computes median across all node results |
| `consensus.commonPrefixAggregation` | Arrays of strings/numbers | Longest common prefix from arrays |
| `consensus.commonSuffixAggregation` | Arrays of strings/numbers | Longest common suffix from arrays |
| `consensus.aggregationByFields` | JSON objects | Per-field aggregation (each field can use a different strategy) |

**Field-level aggregation** (for complex objects):
```typescript
consensus.aggregationByFields({
  fieldName1: "identical",
  fieldName2: "median",
  fieldName3: "ignore",
})
```

### Cache Settings (Preventing Duplicate API Calls)

For POST/PUT/PATCH/DELETE requests, always use cache settings:
```typescript
cacheSettings: {
  store: true,    // Store response in shared DON cache
  maxAge: 60,     // Cache duration in seconds
}
```

**How it works:** First node makes the actual HTTP request and stores the response in a shared cache. Remaining nodes read from cache instead of making duplicate calls. All nodes still participate in consensus. This prevents sending 5+ duplicate emails, push notifications, etc.

### Secrets Management

**In simulations:** Secrets map from `secrets.yaml` to `.env` variables
**In production:** Secrets stored in a decentralized vault DON (no single node can access the full secret)

**Accessing secrets in code:**
```typescript
const apiKey = runtime.getSecret("GEMINI_API_KEY");
```

### Deployment Commands Reference

```bash
# Initialize project
cre init
cre init --workflow-name <name>  # Add additional workflow

# Simulate workflow
cre workflow simulate <workflow-name>
cre workflow simulate <workflow-name> --broadcast  # Execute on-chain transactions

# Target environment
# Set in config: cre target is "staging_settings" throughout bootcamp

# Go SDK: generate bindings
cre generate-bindings evm
```

---

## 5. Code Examples

### Project File Structure

```
prediction-market/
  .env                          # CRE_ETH_PRIVATE_KEY, GEMINI_API_KEY_VAR
  secrets.yaml                  # Maps secret names to env variables
  config.staging.json           # Market address, chain config, gas limit, Gemini model
  my-workflow/
    main.ts                     # Workflow definition with handlers array
    httpCallback.ts             # Day 1: HTTP trigger callback
    logCallback.ts              # Day 2: Log trigger callback (the big one)
    gemini.ts                   # Gemini AI integration helper
    workflow.yaml               # Workflow settings including secrets_path
```

### `config.staging.json`

```json
{
  "geminiModel": "gemini-2.0-flash",
  "evms": [
    {
      "marketAddress": "0x<your-deployed-contract>",
      "chainSelectorName": "ethereum-testnet-sepolia",
      "gasLimit": "1000000"
    }
  ]
}
```

### `secrets.yaml`

```yaml
"GEMINI_API_KEY": "GEMINI_API_KEY_VAR"
```

### `workflow.yaml` (staging_settings section)

```yaml
staging_settings:
  secrets_path: "secrets.yaml"
```

### `main.ts` (Final Version)

```typescript
import { cre, getNetwork } from "@cre/sdk";
import { keccak256, toHex } from "viem";
import { onHttpTrigger } from "./httpCallback";
import { onLogTrigger } from "./logCallback";

interface Config {
  geminiModel: string;
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
}

const EVENT_SIGNATURE = "SettlementRequested(uint256 indexed marketId, string question)";

export default function initWorkflow(config: Config) {
  const evmConfig = config.evms[0];

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });

  const evmClient = cre.capabilities.EVMClient(network.chainSelector);
  const eventHash = keccak256(toHex(EVENT_SIGNATURE));

  return [
    // Handler 1: HTTP trigger (Day 1 - create market)
    {
      trigger: cre.triggers.HTTPTrigger(),
      callback: onHttpTrigger,
    },
    // Handler 2: Log trigger (Day 2 - settle market)
    {
      trigger: evmClient.logTrigger({
        addresses: [evmConfig.marketAddress],
        topics: [eventHash],
        confidence: "finalized",
      }),
      callback: onLogTrigger,
    },
  ];
}
```

### `logCallback.ts` (Final Version - Key Sections)

```typescript
import { cre, getNetwork, toHex, lastFinalizedBlockNumber } from "@cre/sdk";
import { decodeEventLog, decodeFunctionResult, encodeFunctionData, parseAbi } from "viem";
import { askGemini } from "./gemini";

interface Config {
  geminiModel: string;
  evms: Array<{
    marketAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
}

interface Market {
  creator: string;
  settled: boolean;
  yesPool: bigint;
  noPool: bigint;
  question: string;
}

const eventAbi = parseAbi([
  "event SettlementRequested(uint256 indexed marketId, string question)",
]);

const getMarketABI = [
  {
    type: "function",
    name: "getMarket",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      // ... market struct fields
    ],
    stateMutability: "view",
  },
];

export async function onLogTrigger(runtime: any, payload: EVMLogPayload) {
  // Step 1: Decode event
  const topics = payload.topics.filter((t) => t !== null);
  const data = toHex(payload.data);

  const decodedLog = decodeEventLog({
    abi: eventAbi,
    data,
    topics,
  });

  const marketId = decodedLog.args.marketId;
  const question = decodedLog.args.question;
  console.log(`Settlement requested for market #${marketId}`);
  console.log(`Question: "${question}"`);

  // Step 2: EVM Read - check if market already settled
  const evmConfig = config.evms[0];
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });
  const evmClient = cre.capabilities.EVMClient(network.chainSelector);

  const callData = encodeFunctionData({
    abi: getMarketABI,
    functionName: "getMarket",
    args: [marketId],
  });

  const result = await evmClient.callContract(runtime, {
    call: {
      from: "0x0000000000000000000000000000000000000000",
      to: evmConfig.marketAddress,
      data: callData,
    },
    blockNumber: lastFinalizedBlockNumber,
  });

  const market = decodeFunctionResult({
    abi: getMarketABI,
    functionName: "getMarket",
    data: result,
  }) as Market;

  console.log(`Creator: ${market.creator}`);
  console.log(`Already settled: ${market.settled}`);

  if (market.settled) {
    return "Market already settled";
  }

  // Step 3: Query Gemini AI
  const geminiResult = await askGemini(runtime, question);
  // Parse JSON response: { result: "yes"|"no", confidence: number }
  const aiResult = geminiResult.result;    // "yes" or "no"
  const confidence = geminiResult.confidence; // e.g. 100
  console.log(`AI result: ${aiResult}, confidence: ${confidence}`);

  // Map to smart contract values
  const outcomeValue = aiResult === "yes" ? 0 : 1;

  // Step 4: EVM Write - settle the market
  const settleData = encodeFunctionData({
    abi: settleMarketABI,
    functionName: "settleMarket",
    args: [marketId, outcomeValue, confidence],
  });

  // Append 0x01 prefix to signal "settle" (vs "create")
  const reportData = "0x01" + settleData.slice(2);

  // Two-step pattern
  const signedReport = await cre.signReport(runtime, reportData);
  const txHash = await evmClient.writeReport(runtime, signedReport);

  console.log(`Settlement successful! TX: ${txHash}`);
  return `Settled with tx: ${txHash}`;
}
```

### `gemini.ts` (Key Sections)

```typescript
import { cre, consensus } from "@cre/sdk";

const SYSTEM_PROMPT = `You are a factual oracle. Answer prediction market questions.
Reply ONLY with JSON: { "result": "yes" or "no", "confidence": 0-100 }
No other text. Be strict.`;

function buildGeminiRequest(question: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "user", parts: [{ text: question }] },
    ],
  };

  return {
    url,
    method: "GET",  // Note: Google's API uses GET with body for this endpoint
    body: btoa(JSON.stringify(body)),
    headers: { "Content-Type": "application/json" },
  };
}

export async function askGemini(runtime: any, question: string) {
  const httpClient = cre.capabilities.HTTPClient;
  const apiKey = runtime.getSecret("GEMINI_API_KEY");

  console.log("Querying AI for market outcome...");

  const response = await httpClient.sendRequest(
    runtime,
    () => buildGeminiRequest(question, apiKey),
    consensus.identicalAggregation,
  );

  return response.result;
}
```

### Foundry Cast Commands Used

```bash
# Read market state
cast call $MARKET_ADDRESS "getMarket(uint256)" 0 --rpc-url $RPC_URL

# Trigger settlement event
cast send $MARKET_ADDRESS "requestSettlement(uint256)" 0 \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --rpc-url $RPC_URL

# Make a prediction (0 = yes, 1 = no)
cast send $MARKET_ADDRESS "predict(uint256,uint256)" 0 0 \
  --value 0.01ether \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --rpc-url $RPC_URL

# Check individual prediction
cast call $MARKET_ADDRESS "getPrediction(uint256,address)" 0 $PREDICTOR_ADDRESS \
  --rpc-url $RPC_URL

# Claim winnings after settlement
cast send $MARKET_ADDRESS "claim(uint256)" 0 \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --rpc-url $RPC_URL
```

---

## 6. Common Pitfalls

### Log Trigger Simulation
- **Must provide a real transaction hash** - simulations use actual on-chain events, not mocks. You must first trigger the event on-chain, then use that tx hash for simulation.
- **Event index starts at 0** - If your transaction emits multiple events, use Etherscan to find the correct index.
- **In production, log triggers fire automatically** - the tx hash prompt is only for simulation/development.

### Environment Variables
- **Forgetting `source .env`** - Common error. Must load env vars before running simulations.
- **`export MARKET_ADDRESS=...`** - Must be set before using Foundry cast commands.

### Secrets Configuration (Triple Setup Required)
1. `.env` file: `GEMINI_API_KEY_VAR=<actual-key>`
2. `secrets.yaml`: `"GEMINI_API_KEY": "GEMINI_API_KEY_VAR"`
3. `workflow.yaml` staging_settings: `secrets_path: "secrets.yaml"`

**Secret name vs env var name MUST differ.** If both are `GEMINI_API_KEY`, you get strange errors.

### Gemini API Key
- **Must enable billing** even for free tier. Go to AI Studio dashboard, click "Setup Billing" on the API key. Free tier, no charges, but requires credit card.
- Error `429` or "API key not activated" means billing is not set up.

### Chain Selector Names
- Use `ethereum-testnet-sepolia` NOT `ethereumSepolia` (camelCase will fail)
- Find all valid names in the official CRE docs

### EVM Write Capability
- **`--broadcast` flag required** for simulations that need to execute on-chain transactions
- Without `--broadcast`, `cre workflow simulate` only does a dry run
- **Check gas limit** in `config.staging.json` if transactions fail
- The two-step pattern (sign report, then write report) is mandatory

### EVM Read Capability
- **Always use zero address** for the `from` field in read operations
- **`lastFinalizedBlockNumber`** is the safest option but may not reflect very recent state changes
- If you need to read freshly-written state, use `latestBlockNumber`

### TypeScript Red Squiggly Marks
- Some TypeScript plugin warnings appear but are non-functional - code compiles and works. Can be ignored.

### Multiple Workflows
- Run `cre init --workflow-name <name>` to add additional workflows to the same project
- Each workflow gets its own folder under the project

---

## 7. Hackathon Relevance

### Convergence Hackathon
- **Chainlink hackathon specifically around CRE**
- Up to **$100K in prizes**
- Workshops during the first week of the hackathon covering specific use cases
- **Simulations are sufficient for judging** - no need to deploy to production (CRE is early access)
- **Must use `--broadcast` flag** with EVM write so judges can verify on-chain transactions

### Key Patterns to Reuse

**Multi-handler workflows:** A single workflow can have multiple trigger+callback pairs (HTTP trigger for one flow, log trigger for another). This is the architecture pattern from this bootcamp.

**Cross-chain workflows:** EVM read and write can target different smart contracts on different blockchains, all within one workflow. This is explicitly called out as a powerful hackathon feature.

**Event-driven architecture:** Log triggers let you build reactive systems - when X happens on-chain, do Y. Combine with EVM read to validate state before taking action.

**AI integration via HTTP capability:** Any API endpoint can be called - not just Gemini. FIFA results API, weather data, any REST API. The pattern is the same: HTTP client -> send request -> consensus -> use result.

### Hackathon Project Ideas (from the workshop)

1. **Stablecoin issuance with CRE** (separate workshop planned)
2. **Combining with CCIP** (Chainlink Cross-Chain Interoperability Protocol)
3. **Tokenized services**
4. **Custom proof of reserve feeds**
5. **AI-powered prediction markets** (exactly what was built)
6. **Event-driven market resolutions** (log trigger pattern)
7. **Automating risk monitors**
8. **Real-time reserve health checks**
9. **Protocol safeguard triggers** (event-driven safety mechanisms)
10. **Cross-chain workflow orchestration** (read/write across multiple chains)
11. **Fully decentralized backends** (CRE workflows as backend for web3 apps)
12. **Developer tooling** (visual builders, debugging tools for CRE)

### Production Deployment
- Request access at `cre.chain.link` dashboard
- Secrets stored in decentralized vault DON (not .env)
- Log triggers fire automatically (no manual tx hash)
- Refer to docs for deploying workflows and monitoring/debugging

---

## 8. Key Quotes and Insights

**On the two-step EVM write pattern:**
> "It's not enough to just call the function. First we need to cryptographically sign this report and then using the EVM client object call the writeReport which essentially will forward this report in a bytes value through the keystone forwarder contract to your smart contract."

**On log trigger vs cron trigger:**
> "Log trigger fires when there is an on-chain event emitted. Cron trigger fires on schedule - every hour, every 15 minutes, every first Monday. This [log trigger] is reactive. This [cron trigger] is pretty much proactive. It's a fixed time interval. [Log trigger] might never get triggered if the event never got fired."

**On cache settings and decentralization:**
> "All nodes will still participate in a consensus round because consensus happened first then the actual send. They will still communicate within themselves. They will still check what's in cache and compare to their calculated value before we actually send that email or push notification."

**On why they chose a past event for the prediction:**
> "One of the reasons why we chose an event in the past - like 2022 World Cup happened a long time ago - is because Gemini will return one winner and all of the nodes should get that one winner."

**On consensus with AI responses:**
> "If you ask different AI models, even the same AI model the same question but multiple times, there is a possibility that the answer will be differently phrased. Because of that, we specifically told Gemini in the code how to reply [strict JSON format] and then we use identical consensus aggregation."

**On simulation vs production for hackathon:**
> "Simulations for us to judge the projects are fine. You don't need to go to production because it's early access. But if you're using EVM write capability, you must use it with the --broadcast flag so we can see that your workflow code actually works."

**On console.log debugging:**
> "We have this good old console logging feature where you can literally log and see what's going on. This is just for local simulations. Obviously it won't be visible on public blockchains because they don't have that functionality."

**On the power of cross-chain CRE:**
> "You can EVM read and write from different smart contracts on different blockchains, all as part of one single workflow. All as part of one Go or TypeScript workflow. Leverage that - it's really powerful functionality."

**On secrets management:**
> "In production, secrets are stored in a decentralized vault DON meaning that not a single node can access the full secret. Secrets are shared. A malicious node cannot do something with your secret."
