# CRE Bootcamp Day 1 - Foundations: Comprehensive Summary

## 1. Overview

**Workshop:** CRE (Chainlink Runtime Environment) Bootcamp Day 1 - Foundations
**Series:** Part 1 of 2 (two-day bootcamp)
**Presenters:** Andre and Saul (Chainlink DevRel)
**Duration:** ~2 hours
**Format:** Live YouTube stream with interactive workbook and collaborative pad
**Project Built:** AI-Powered Prediction Markets using CRE

This session covered the theoretical foundations of CRE, project setup, smart contract deployment, HTTP triggers, and EVM write capability. Day 2 covers log triggers, EVM read, AI integration (Gemini), and wiring everything together.

**Prerequisites:**
- Bun (for TypeScript workflows)
- A private key with Sepolia ETH
- Gemini API key (free tier, but billing must be set up for Day 2)
- CRE CLI installed from `cre.chain.link`

**Repository:** A reference repo was shared containing the complete working example. Participants built everything from scratch.

---

## 2. Key Concepts

### What is CRE?

CRE (Chainlink Runtime Environment, referred to as "Siri" in the CLI/tooling) is an **orchestration layer** that lets you write institutional-grade smart contracts and run your own workflows in TypeScript or Go. It is powered by Chainlink's Decentralized Oracle Networks (DONs) and uses the same Chainlink node client that powers all other Chainlink products.

CRE bridges the fundamental limitation of blockchains: smart contracts can only see data on their own chain. With CRE you can:
- Fetch data from any API
- Read from multiple blockchains
- Write to multiple blockchains
- Call AI services
- Write verified results back on-chain
- All with cryptographic consensus built into every operation

### CRE vs Chainlink Functions

CRE is described as **much more powerful** than Chainlink Functions. Functions could execute JavaScript and make HTTP requests but required combining with other Chainlink services (e.g., Chainlink Automation). CRE has everything under one umbrella: HTTP, on-chain reads/writes, automation triggers, all in Go or TypeScript. **For the hackathon or future projects, if you need Chainlink Functions or Automation, switch to CRE instead.**

### Three Core Concepts

#### 1. Workflows
- **Off-chain code** you develop in TypeScript or Go
- CRE CLI compiles it to **WebAssembly (WASM)**
- The WASM runs across Decentralized Oracle Networks (DONs)
- Each project can contain **multiple workflows** (returned as an array of handlers)

#### 2. Triggers
Events that start your workflow. Three types currently supported:

| Trigger | Description | Example |
|---------|-------------|---------|
| **Cron Trigger** | Runs on a schedule | "Run this workflow every 10 minutes" |
| **HTTP Trigger** | Fires on HTTP request | "Create prediction market when API is called" |
| **Log Trigger** | Fires on smart contract event | "Settle when SettlementRequested event fires" |

#### 3. Capabilities
Microservices that define what your workflow can do (like Lego blocks):

| Capability | Description |
|------------|-------------|
| **HTTP** | Make HTTP requests (GET, POST, PUT, PATCH, DELETE) to external APIs |
| **EVM Read** | Read data from any smart contract on any EVM blockchain |
| **EVM Write** | Write data to any smart contract on any EVM blockchain |

**Each capability runs on its own specialized capability DON with built-in configurable consensus.**

### Trigger and Callback Pattern

The fundamental glue pattern in CRE:

- `initWorkflow()` returns an array of CRE handlers
- Each handler pairs a **trigger** (when to execute) with a **callback** (what to execute)
- When a trigger fires, the callback function runs

### DONs (Decentralized Oracle Networks)

A network of independent Chainlink nodes that:
1. Execute your workflow independently in isolated environments
2. Compare results by talking to each other (peer-to-peer protocol)
3. Reach consensus using **Byzantine Fault Tolerant (BFT)** protocols
4. Return a single verifiable result

### Execution Flow

1. **Trigger fires** (cron schedule, HTTP request, or on-chain event)
2. **Workflow DON** receives the trigger
3. **Each node** executes your callback function independently in isolated environments
4. If the callback uses a **capability** (HTTP, EVM read/write), the **capability DON** performs that operation
5. **Nodes compare results** via peer-to-peer protocol
6. **BFT consensus** is reached on the final result
7. **Single verified result** is returned to your callback
8. **Callback continues** with this data

### Keystone Forwarder

CRE does NOT call your smart contract directly. Instead:

1. CRE submits a **signed report** to the **Chainlink Keystone Forwarder** smart contract
2. The Forwarder **validates signatures** (ensuring the report came from a trusted DON)
3. The Forwarder calls the `onReport` function on your contract
4. Your contract decodes and uses the data

**Mock Keystone Forwarder address on Sepolia:** `0x15...` (used for simulation)

Forwarder addresses for other chains are available in the official Chainlink documentation.

---

## 3. Technical Details

### CLI Commands

| Command | Description |
|---------|-------------|
| `cre version` | Check installed CRE CLI version (v1.0.5 at time of bootcamp) |
| `cre init` | Create a new CRE project (interactive: name, language, template) |
| `cre workflow simulate <workflow-name>` | Compile and simulate workflow locally (dry run) |
| `cre workflow simulate <workflow-name> --broadcast` | Simulate AND broadcast on-chain transactions |
| `cre whoami` | Verify which account you're logged in with |

### Project Initialization

```bash
cre init
# Project name: prediction-market
# Language: TypeScript (or Go)
# Template: hello-world
# Workflow name: my-workflow (default)

cd prediction-market
bun install   # Only for TypeScript projects
```

### Project Structure

```
prediction-market/
  project.yaml              # Project-level config (environments, RPCs)
  secrets.yaml              # Secrets config (covered in Day 2)
  .env                      # Private key, API keys (NEVER commit)
  my-workflow/
    main.ts                 # Main workflow file (initWorkflow + handlers)
    http-callback.ts        # HTTP trigger callback logic
    workflow.yaml            # Maps targets to files/configs
    config.staging.json      # Staging environment config
    config.production.json   # Production environment config
  contracts/                # Foundry project for smart contracts
    src/
      PredictionMarket.sol
      interfaces/
        IReceiver.sol
        ReceiverTemplate.sol
    foundry.toml
    lib/
      openzeppelin-contracts/
```

### Environment Variables (.env)

```
CRE_ETH_PRIVATE_KEY=0x<your-sepolia-private-key>
CRE_TARGET=staging_settings
GEMINI_API_KEY=<your-gemini-api-key>
```

### Config Files

**project.yaml** - Defines environments and RPC URLs:
- Staging settings use the public Sepolia RPC
- You can add custom environments (local-testing, production, etc.)

**workflow.yaml** - Maps targets to workflow files:
- If target is `staging_settings`, main file is `main.ts`, config is `config.staging.json`

**config.staging.json** (final version for Day 1):
```json
{
  "marketAddress": "0x<your-deployed-contract-address>",
  "geminiModel": "<model-name>",
  "chainSelectorName": "ethereum-testnet-sepolia",
  "gasLimit": "500000",
  "evms": [
    {
      "chainSelectorName": "ethereum-testnet-sepolia",
      "marketAddress": "0x<your-deployed-contract-address>",
      "gasLimit": "500000"
    }
  ]
}
```

**Chain selector naming format:** `ethereum-testnet-sepolia` (lowercase, dashes). Check official docs for exact strings for other chains.

### Smart Contract Setup (Foundry)

```bash
# From prediction-market root
forge init contracts
cd contracts
mkdir src/interfaces

# Install OpenZeppelin (needed by ReceiverTemplate)
forge install openzeppelin/openzeppelin-contracts

# Add remappings to foundry.toml
# [remappings]
# "@openzeppelin/=lib/openzeppelin-contracts/"

# Build
forge build

# Deploy
source ../../.env
forge create --from-file src/PredictionMarket.sol:PredictionMarket \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $CRE_ETH_PRIVATE_KEY \
  --broadcast \
  --constructor-args 0x<keystone-forwarder-address>
```

### Simulation

```bash
# Dry run (no on-chain transactions)
cre workflow simulate my-workflow
# Prompts for input JSON: {"question": "Will Argentina win the 2022 World Cup?"}

# With broadcast (actually sends on-chain transactions)
cre workflow simulate my-workflow --broadcast
# Same input, but EVM write will execute real transactions
```

**Important distinction:**
- Without `--broadcast`: prepares transactions but never sends them
- With `--broadcast`: actually broadcasts transactions, you get a real tx hash
- For the hackathon: projects should use `--broadcast` so transactions can be verified on-chain

### Gas Limit Tips

- Default gas limit of 500,000 works for this example
- Too high = waste, too low = transaction fails
- **Hackathon tip:** If EVM write fails, check gas limit first during debugging
- Set gas limit appropriate to your use case's `onReport` function complexity

---

## 4. Code Examples

### Hello World (Default Cron Workflow)

```typescript
// main.ts - Default hello world template
import CRE from "@aspect-build/cre-sdk";

type Config = {
  schedule: string;
};

function initWorkflow(config: Config): CRE.Handler[] {
  const cronCapability = CRE.capabilities.cron;
  const cronTrigger = cronCapability.trigger({
    schedule: config.schedule,  // From config.staging.json
  });

  return [
    CRE.handler(cronTrigger, onCronTrigger),
  ];
}

function onCronTrigger(runtime: CRE.Runtime): string {
  runtime.log("Hello world workflow triggered");
  return "hello world";
}
```

**config.staging.json (hello world):**
```json
{
  "schedule": "*/30 * * * * *"
}
```
(Minimum for CRE is every 30 seconds)

### HTTP Trigger with EVM Write (Day 1 Final)

**main.ts:**
```typescript
import CRE from "@aspect-build/cre-sdk";
import { onHttpTrigger } from "./http-callback";

type Config = {
  geminiModel: string;
  evms: Array<{
    chainSelectorName: string;
    marketAddress: string;
    gasLimit: string;
  }>;
};

function initWorkflow(config: Config): CRE.Handler[] {
  const httpCapability = CRE.capabilities.http;
  const httpTrigger = httpCapability.trigger({});  // No auth for this example

  return [
    CRE.handler(httpTrigger, onHttpTrigger),
  ];
}
```

**http-callback.ts:**
```typescript
import CRE from "@aspect-build/cre-sdk";

type Config = {
  geminiModel: string;
  evms: Array<{
    chainSelectorName: string;
    marketAddress: string;
    gasLimit: string;
  }>;
};

// ABI parameters for createMarket function
const createMarketParams = {
  question: "string",
};

export async function onHttpTrigger(
  runtime: CRE.Runtime,
  payload: CRE.HTTPPayload
): Promise<string> {
  try {
    // Step 1: Decode JSON payload
    const data = CRE.decodeJSON(payload.input);
    const question = data.question as string;
    runtime.log(`Received market question: ${question}`);

    // Step 2: Get network and create EVM client
    const evmConfig = runtime.config.evms[0];
    const network = CRE.getNetwork({
      chainFamily: "evm",
      chainSelectorName: evmConfig.chainSelectorName,
      isTestnet: true,
    });

    runtime.log(`Target chain: ${evmConfig.chainSelectorName}`);
    runtime.log(`Contract address: ${evmConfig.marketAddress}`);

    const evmClient = CRE.capabilities.evmClient(
      network.chainSelector.selector
    );

    // Step 3: Encode market data (ABI encode the question)
    const marketData = CRE.abiEncode(createMarketParams, {
      question: question,
    });
    runtime.log("Successfully encoded market data");

    // Step 4: Generate signed report
    const reportData = CRE.hexToBase64(marketData);
    const reportResponse = await runtime.report({
      payload: reportData,
      hashAlgorithm: "keccak256",
      signingAlgorithm: "ecdsa",
    });
    runtime.log("Successfully generated signed report");

    // Step 5: Write to smart contract
    runtime.log("Writing to contract...");
    const writeResult = await evmClient.writeReport(runtime, {
      receiver: evmConfig.marketAddress,
      report: reportResponse,
      gasConfig: {
        gasLimit: evmConfig.gasLimit,
      },
    });

    // Step 6: Verify result
    const txStatus = writeResult.txStatus;
    if (txStatus === "success") {
      const txHash = writeResult.transactionHash;
      runtime.log(`Transaction successful! Hash: ${txHash}`);
      return txHash;
    } else {
      throw new Error(`Transaction failed with status: ${txStatus}`);
    }
  } catch (error) {
    runtime.log(`Error: ${error}`);
    throw error;
  }
}
```

### HTTP Trigger with Authorization (Production Pattern)

```typescript
const httpTrigger = httpCapability.trigger({
  authorizedKeys: [
    {
      type: "ecdsa_evm",
      publicKey: "0x<your-public-key>",
    },
  ],
});
```

### HTTP Payload Type

```typescript
type HTTPPayload = {
  input: Uint8Array;   // JSON body as raw bytes
  method: string;      // GET, POST, PUT, PATCH, DELETE
  headers?: Record<string, string>;  // Optional headers
};
```

### IReceiver Interface (Solidity)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IReceiver {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}
```

### Prediction Market Smart Contract (Simplified)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/ReceiverTemplate.sol";

contract PredictionMarket is ReceiverTemplate {
    enum Prediction { Yes, No }

    struct Market {
        string question;
        uint256 totalYesPool;
        uint256 totalNoPool;
        Prediction outcome;
        bool settled;
        address creator;
    }

    struct UserPrediction {
        uint256 amount;
        Prediction prediction;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => UserPrediction)) public predictions;
    uint256 public marketCount;

    constructor(address forwarder) ReceiverTemplate(forwarder) {}

    // Create a new market (called via CRE onReport or directly)
    function createMarket(string calldata question) external returns (uint256) {
        uint256 marketId = marketCount++;
        markets[marketId] = Market({
            question: question,
            totalYesPool: 0,
            totalNoPool: 0,
            outcome: Prediction.Yes,
            settled: false,
            creator: msg.sender
        });
        return marketId;
    }

    // Predict on a market (payable - stake ETH)
    function predict(uint256 marketId, bool isYes) external payable {
        // Increases totalYesPool or totalNoPool based on prediction
        // Stores user's prediction with msg.value as amount
    }

    // Request settlement - emits event for CRE log trigger
    event SettlementRequested(uint256 indexed marketId);

    function requestSettlement(uint256 marketId) external {
        emit SettlementRequested(marketId);
    }

    // Settle market (called by CRE via onReport on Day 2)
    function settleMarket(bytes calldata report) internal {
        (uint256 marketId, Prediction outcome, uint256 confidence) =
            abi.decode(report, (uint256, Prediction, uint256));
        // Requires 100% confidence, sets outcome, marks settled
    }

    // Process report from CRE (ReceiverTemplate override)
    function _processReport(bytes calldata report) internal override {
        // Routes to createMarket or settleMarket based on prefix
    }

    // Claim winnings after settlement
    function claimWinnings(uint256 marketId) external {
        // Formula: (userStake * totalPool) / winningPool
    }

    // Getters
    function getMarket(uint256 marketId) external view returns (Market memory);
    function getPrediction(uint256 marketId, address user) external view returns (UserPrediction memory);
}
```

### Verifying Market Creation (Foundry Cast)

```bash
cast call <contract-address> "getMarket(uint256)" 0 --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

---

## 5. Architecture

### High-Level Architecture

```
[External World]                    [CRE Layer]                     [Blockchain]
                                         |
  HTTP Request -----> HTTP Trigger ----> Workflow DON                    |
  Cron Schedule ----> Cron Trigger       |  (each node runs            |
  On-chain Event --> Log Trigger         |   callback independently)   |
                                         |                              |
                            Capabilities:                               |
                            - HTTP Cap DON ---> External APIs           |
                            - EVM Read DON ---> Read from chain --------+
                            - EVM Write DON --> Write to chain ---------+
                                         |                              |
                               BFT Consensus                            |
                                         |                              |
                            Signed Report                               |
                                         |                              |
                            Keystone Forwarder (on-chain) -----------> Your Contract
                              (validates signatures)                    (onReport)
```

### EVM Write Two-Step Process

1. **Generate Signed Report:**
   - ABI encode your data
   - Convert to Base64 string (`hexToBase64`)
   - Call `runtime.report()` with payload, hash algorithm (keccak256), signing algorithm (ecdsa)
   - DON nodes sign the report

2. **Submit Report:**
   - Call `evmClient.writeReport()` with receiver address, signed report, and gas config
   - Report goes to Keystone Forwarder contract
   - Forwarder validates DON signatures
   - Forwarder calls `onReport()` on your contract
   - Your contract decodes and processes the data

### CRE-Compatible Smart Contracts

Two approaches:
1. **Manual:** Implement `IReceiver` interface directly (implement `onReport`)
2. **ReceiverTemplate (recommended):** Abstract contract that handles:
   - ERC-165 support
   - Metadata decoding
   - Security checks (forwarder validation)
   - You only implement `_processReport(bytes calldata report)`

### Data Flow for Day 1

```
1. HTTP Request with JSON {"question": "Will Argentina win the 2022 World Cup?"}
2. HTTP Trigger fires -> onHttpTrigger callback
3. Decode JSON payload -> extract question string
4. ABI encode question -> hex data
5. Convert to Base64 -> generate signed report via runtime.report()
6. evmClient.writeReport() -> Keystone Forwarder -> PredictionMarket.onReport()
7. PredictionMarket._processReport() -> createMarket(question)
8. Market ID 0 created on Sepolia
```

### Data Flow for Full App (Day 1 + Day 2)

```
1. HTTP Trigger -> Create market via EVM Write
2. Users predict (direct contract calls via forge/cast)
3. Users request settlement -> emit SettlementRequested event
4. Log Trigger picks up event -> workflow starts
5. EVM Read -> read market data from contract
6. HTTP Capability -> call Gemini AI API with question
7. Gemini returns answer + confidence score
8. EVM Write -> settle market on-chain via onReport
9. Users claim winnings
```

---

## 6. Hackathon Relevance

### Convergence Hackathon

- **Name:** Convergence
- **Prizes:** 100k+ USD
- **Duration:** Throughout February 2025
- **Prerequisites:** Everything taught in this bootcamp
- **Week 1:** Additional workshops (including stablecoins + CRE, agent compliance)

### Submission Requirements

- Projects should use `--broadcast` flag so transactions can be verified on-chain
- Local simulations are accepted but on-chain verification is preferred
- Transaction hashes should be demonstrable

### Buildable Patterns from Day 1

1. **HTTP-Triggered On-Chain Actions:** Any external system can trigger smart contract state changes through CRE HTTP triggers
2. **API-to-Smart-Contract Bridges:** Connect any REST API to any EVM smart contract
3. **Multi-Chain Writes:** EVM write capability works with any EVM chain (Base Sepolia, Optimism Sepolia, etc.)
4. **AI + On-Chain:** Combine AI model calls (Gemini, etc.) with on-chain settlement
5. **Prediction Markets:** The exact pattern taught - create/predict/settle with AI resolution
6. **Stablecoin Integration:** Mentioned as an upcoming workshop topic, CRE works with stablecoins
7. **Cross-Chain Orchestration:** Read from one chain, write to another in the same workflow

### Hackathon Tips from Presenters

- **Gas limit debugging:** If EVM write fails, check gas limit first
- **Use config files:** Don't hardcode chain selectors or addresses; use config.staging.json
- **AI confidence scores:** When using AI models, always ask for a confidence level and don't blindly trust responses. Add an "unclear" outcome if confidence is below threshold.
- **Authorized keys:** Empty for development, but use them for production
- **Secrets:** Will be covered in Day 2 - important for production deployments
- **TypeScript or Go:** Both supported, workflows compile to WASM regardless

### What's Covered in Day 2 (for complete hackathon preparation)

- Log Trigger (listening for on-chain events)
- EVM Read capability
- HTTP capability for AI integration (Gemini API)
- Secrets management
- Full end-to-end wiring
- Production deployment (early access)

---

## 7. Key Quotes and Insights

### On CRE's Purpose
> "The problem with the current blockchains is a fundamental limitation that smart contracts can see and access data only from that blockchain. Smart contracts cannot fetch weather data, cannot fetch data from external APIs, cannot call AI models, cannot read data from other blockchains. With CRE, we bridge that gap by providing a verifiable runtime where you can do all of that."

### On CRE vs Chainlink Functions
> "It's much more powerful than Chainlink Functions... here you have everything under the same umbrella. Technically for the hackathon or any future projects, if you need Chainlink Functions or Chainlink Automation, I will strongly advise you to just switch to CRE because it's much much better and much more powerful."

### On the Mental Model
> "Workflow is the code you're writing. Triggers are events that fire your workflow to execute. Capabilities are these Lego blocks or microservices - something that your workflow can do."

### On AI Integration Best Practice
> "When you interact with AI agents, when you ask a question, ask for a confidence level back. Usually all of these models will reply with that. So you just don't blindly trust what GPT or Gemini generate back."

### On Gas Limits (Hackathon Debugging Tip)
> "A tip for the hackathon: make sure to set up gas limit to the value that you in fact need. If for some reason EVM write capability fails, this might be a good suspect for you to check during the debugging process."

### On Report Data Format
> "Does report bytes have predefined format? No, it's just bytes. Solidity bytes can be whatever you want. The key part is that however you encode that report on the CRE side, your smart contract must be aware because your smart contract needs to decode that data later."

### On Production Readiness
> "For production, highly advisable to use authorized keys [for HTTP triggers]. For now keep it empty, that's fine."

---

## Appendix: Quick Reference

### SDK Imports

```typescript
import CRE from "@aspect-build/cre-sdk";

// Key functions:
CRE.capabilities.http        // HTTP capability
CRE.capabilities.cron        // Cron capability
CRE.capabilities.evmClient() // EVM client
CRE.handler()                // Create trigger+callback pair
CRE.decodeJSON()             // Decode Uint8Array to JSON
CRE.abiEncode()              // ABI encode parameters
CRE.hexToBase64()            // Convert hex to Base64
CRE.getNetwork()             // Get network config

// Runtime methods:
runtime.log()                // Console log (simulation only)
runtime.report()             // Generate signed report
runtime.config               // Access config values
```

### Chain Selector Names

| Chain | Selector Name |
|-------|---------------|
| Ethereum Sepolia | `ethereum-testnet-sepolia` |
| Other chains | Check docs.chain.link/cre |

### URLs

- CRE Platform: `cre.chain.link`
- Documentation: `docs.chain.link/cre`
- Gemini API Key: Google AI Studio (free tier with billing setup)
