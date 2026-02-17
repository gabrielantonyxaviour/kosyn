---
name: cre-hackathon
description: Chainlink CRE hackathon-specific knowledge — gotchas, patterns, and workflows distilled from the Convergence bootcamps and support channel. Use when building CRE workflows, debugging simulation errors, or architecting multi-workflow systems for the Convergence hackathon.
allowed-tools: Read Write Edit Bash
---

# CRE Hackathon Knowledge

Distilled from CRE Bootcamp Day 1 & 2, Convergence support channel (434 messages), and workshop summaries.

---

## Critical Gotchas (Fix These First)

**WASM trap / engine creation failure** → Upgrade Bun to ≥ 1.2.21 (1.3.9 confirmed working). This is the #1 cause of cryptic errors.

**Module-level code crashes WASM** → ANY function call outside a handler (e.g., `parseAbiParameters`, `encodeAbiParameters` at top level) runs during WASM init and crashes. Move ALL logic inside handler callbacks.

**`project.yaml` does NOT support env variable substitution** → RPC URLs must be hardcoded. Use a script to generate from `.env` and gitignore `project.yaml`, or use public RPCs in git.

**Chain selector names are exact strings** → Use `ethereum-testnet-sepolia`, NOT `sepolia` or `ethereumSepolia`. Check the forwarder directory for exact names.

**HTTP call limit is 5 per workflow** → Counts all calls across ALL handlers in the workflow. Split into multiple composable workflows if you need more.

**`--broadcast` is required for demos** → `cre workflow simulate` without `--broadcast` never sends transactions. Hackathon requires on-chain state changes.

**Simulation status codes are unreliable** → `receiverContractExecutionStatus: 0` does NOT mean failure. Trust on-chain receipts and events, not the simulation status field.

**`encodedPayload` must stay hex** → Do NOT convert to base64 before passing to `runtime.report()`. Keep it as hex-encoded ABI data.

**`Buffer` may not be available** → Use `Uint8Array` + `TextDecoder` for hex/string conversions (see snippet below).

**Secret names MUST differ from env var names** → `secrets.yaml: "GEMINI_API_KEY": "GEMINI_API_KEY_VAR"` — left and right side must be different strings.

**Cron trigger only fires once in simulation** → Expected. Manually re-run for each cycle. Explain the schedule in demo video.

---

## Project Structure

```
my-cre-project/
  project.yaml              # Environments + RPC URLs (hardcoded, no env vars)
  secrets.yaml              # Secret name → env var name mapping
  .env                      # Actual key values (never commit)
  workflow1/
    main.ts                 # initWorkflow() + exports
    workflow.yaml           # Maps targets to files, declares secrets-path
    config.staging.json     # Addresses, chain selectors, gas limits
  workflow2/                # Multiple workflows per project = fine
    main.ts
    workflow.yaml
    config.staging.json
```

**`secrets.yaml`:**
```yaml
secretsNames:
  GEMINI_API_KEY:
    - GEMINI_API_KEY_VAR
```

**`.env`:**
```
GEMINI_API_KEY_VAR=your-actual-key
```

**`workflow.yaml` (staging_settings section):**
```yaml
staging_settings:
  secrets-path: "../secrets.yaml"
```

---

## Core Patterns

### Trigger + Callback (fundamental unit)
```typescript
import { Runner, handler, http, evmClient, cron } from "@chainlink/cre-sdk-javy-plugin";

type Config = { receiverAddress: string; gasLimit: string; chainSelector: string };

export async function main() {
  const runner = await Runner.newRunner<Config>();
  return runner.run(initWorkflow);
}

const initWorkflow = (config: Config) => [
  handler(http.trigger({}), onHttpTrigger),
  // Add more handlers as needed
];
```

### EVM Write (two-step — always)
```typescript
import { encodeAbiParameters, parseAbiParameters } from "viem";
import { TxStatus, bytesToHex } from "@chainlink/cre-sdk-javy-plugin";

// 1. Encode payload as ABI hex
const encodedPayload = encodeAbiParameters(
  parseAbiParameters("address patient, uint256 amount"),
  [patientAddress, amount]
);

// 2. Sign report (DO NOT convert to base64)
const reportResponse = runtime.report({
  encodedPayload,
  encoderName: "evm",
  signingAlgo: "ecdsa",
  hashingAlgo: "keccak256",
}).result();

// 3. Write via keystone forwarder
const writeResult = evmClient.writeReport(runtime, {
  receiver: runtime.config.receiverAddress,
  report: reportResponse,
  gasConfig: { gasLimit: runtime.config.gasLimit },
}).result();

// 4. Verify (but always check on-chain too — simulation status unreliable)
if (writeResult.txStatus === TxStatus.SUCCESS) {
  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
  runtime.log(`TX: ${txHash}`);
}
```

### EVM Read
```typescript
import { encodeFunctionData, decodeFunctionResult } from "viem";

const callData = encodeFunctionData({ abi: myABI, functionName: "getRecord", args: [id] });

const result = evmClient.callContract(runtime, {
  call: {
    from: "0x0000000000000000000000000000000000000000", // always zero address for reads
    to: runtime.config.contractAddress,
    data: callData,
  },
  blockNumber: "lastFinalizedBlockNumber",
}).result();

const decoded = decodeFunctionResult({ abi: myABI, functionName: "getRecord", data: result });
```

### Log Trigger
```typescript
import { keccak256, toHex } from "viem";

const eventHash = keccak256(toHex("RecordUploaded(address,uint256,string)"));

const initWorkflow = (config: Config) => [
  handler(
    evmClient.logTrigger({
      addresses: [config.contractAddress],
      topics: [eventHash],
      confidence: "finalized", // "latest" | "safe" | "finalized"
    }),
    onLogEvent
  ),
];
```

### HTTP Capability (with consensus)
```typescript
import { consensus } from "@chainlink/cre-sdk-javy-plugin";

const response = httpCapability.sendRequest(runtime, () => ({
  url: "https://api.example.com/endpoint",
  method: "POST",
  body: btoa(JSON.stringify(body)), // must be base64
  headers: { "Content-Type": "application/json" },
  cacheSettings: { store: true, maxAge: 60 }, // required for POST/PUT/PATCH/DELETE
}), consensus.identicalAggregation).result();
```

### Secrets Access
```typescript
const apiKey = runtime.getSecret("GEMINI_API_KEY");
```

### Hex ↔ String (Buffer-free, CRE-safe)
```typescript
// Hex to string
const hex = input.myHex.replace(/^0x/, "");
const bytes = Uint8Array.from(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
const decoded = new TextDecoder().decode(bytes);
```

---

## Smart Contract: ReceiverTemplate Pattern

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ReceiverTemplate.sol";

contract MyContract is ReceiverTemplate {
    constructor(address forwarder) ReceiverTemplate(forwarder) {}

    // Only implement this — ReceiverTemplate handles security checks
    function _processReport(bytes calldata report) internal override {
        uint8 opcode = uint8(report[0]);
        bytes memory payload = report[1:];

        if (opcode == 0x00) {
            _handleUpload(payload);
        } else if (opcode == 0x01) {
            _handleAccess(payload);
        }
    }
}
```

**Never implement `onReport` directly** — use `ReceiverTemplate` which handles forwarder validation.

---

## Simulation Commands

```bash
# Dry run (no chain writes)
cre workflow simulate <workflow-name>

# With on-chain writes (required for hackathon)
cre workflow simulate <workflow-name> --broadcast

# Target specific environment
cre workflow simulate <workflow-name> --target staging-settings --broadcast

# Check CLI version (must be ≥ 1.1.0)
cre version

# Fork Sepolia with Anvil (CRE-compatible)
anvil --fork-url https://rpc.sepolia.org --chain-id 11155111
```

---

## Consensus Strategies

| Strategy | Use when |
|----------|----------|
| `identicalAggregation` | All nodes must return same value (AI responses, exact matches) |
| `medianAggregation` | Numeric values — price feeds, timestamps |
| `commonPrefixAggregation` | Arrays where you want the longest common prefix |
| `aggregationByFields` | JSON objects — per-field strategies |

---

## Multi-Workflow Architecture

When you need >5 HTTP calls total, split into composable workflows:

```
Workflow 1 (HTTP Trigger) → encrypt + upload → emit on-chain event
Workflow 2 (Log Trigger on that event) → decrypt + AI analyze → write report
```

One CRE project = multiple workflow directories. Each can have its own triggers and configs.

---

## Key Resources

- CRE Docs: `https://docs.chain.link/cre`
- Forwarder Directory: `https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts`
- Supported Networks: `https://docs.chain.link/cre/supported-networks-ts`
- Confidential HTTP (TS): `https://docs.chain.link/cre/capabilities/confidential-http-ts`
- CRE Templates: `https://github.com/smartcontractkit/cre-templates`
- Tenderly coupon: `https://dashboard.tenderly.co/accept-coupon?promo_code=CRE-HACKATHON`
- LLMs full context (Go): `https://docs.chain.link/cre/llms-full-go.txt`

---

## Feature Status (Convergence Hackathon)

| Feature | Status |
|---------|--------|
| Simulation + `--broadcast` | ✅ Available |
| HTTP / EVM Read / EVM Write | ✅ Available |
| Cron / HTTP / Log Triggers | ✅ Available |
| Confidential HTTP | ⚠️ Simulation only (not deployable) |
| Workflow deployment to DON | 🔒 Early Access (DM Harry, mention hackathon) |
| Data Streams | 🔒 Gated (request + mention hackathon) |
| WebSocket | ❌ Not supported |
| Non-EVM chains | ❌ Not supported |
