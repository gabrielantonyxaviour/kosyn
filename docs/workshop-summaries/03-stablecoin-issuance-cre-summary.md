# Workshop 03: Regulatory Compliant Stablecoin Issuance with CRE + ACE + CCIP

## 1. Overview

- **Presenter:** Jay Lee, DevRel Engineer at Chainlink Labs
- **Event:** Convergence Hackathon - Workshop 1
- **Topic:** Building regulatory-compliant stablecoin mint/burn workflows using three Chainlink products:
  - **CRE** (Chainlink Runtime Environment) -- workflow orchestration platform
  - **ACE** (Compliance Engine) -- on-chain policy enforcement framework
  - **CCIP** (Cross-Chain Interoperability Protocol) -- cross-chain token transfers
- **Template name:** `bank-stable-coin-workflow` (basic) and `bank-stable-coin-por-ace-ccip-workflow` (full)
- **SDK:** TypeScript SDK v1.0.7
- **Token used in demo:** CRUSD (a custom stablecoin)

---

## 2. Problem Statement

Fiat-collateralized stablecoins require:

1. **Reserve verification** -- you must never mint more tokens than the off-chain bank reserves (reserve ratio >= 100%)
2. **Regulatory compliance** -- institutions need real-time enforcement of policies (OFAC sanctions, KYC, transfer limits, AML) rather than post-transaction detection
3. **Cross-chain portability** -- stablecoins need to move across chains while maintaining compliance checks
4. **Decentralized data integrity** -- single API endpoints can be spoofed; consensus across multiple oracle nodes prevents manipulation

Legislative drivers: MiCA, DIFS, Genius Act -- all mandate real-time enforcement rather than post-transaction detection. Blockchain smart contracts enable pre-execution compliance checks, which is the core advantage ACE provides.

---

## 3. Architecture

### 3.1 High-Level Flow

```
Bank Deposit ($1000)
    |
    v
HTTP Trigger --> CRE Workflow
    |
    v
HTTP Client --> Fetch Proof of Reserve from Bank API (mocked)
    |
    v
DON Consensus --> Multiple nodes verify reserve data, sign report
    |
    v
EVM Client Write --> Send report to Forwarder Contract
    |
    v
Forwarder --> Consumer Contract (onReport function)
    |
    v
ACE Policy Engine --> runPolicy modifier intercepts
    |
    +---> Extractor (parses call data to parameters)
    |       |
    |       v
    +---> Blacklist Policy (check beneficiary not sanctioned)
    |       |
    |       v
    +---> Volume Policy (check amount within range)
            |
            v
        If compliant --> Execute mint/burn
        If non-compliant --> Revert transaction
```

### 3.2 CRE Workflow Anatomy (main.ts structure)

```
1. Imports (capabilities, utilities)
2. Config Schema (defined with Zod)
3. Business Logic Functions
   - onHttpTrigger() -- entry handler
   - processBankInstruction() -- wraps submit
   - submitBankInstruction() -- heavy lifting (writeReport, etc.)
4. Trigger Binding
   - CRE handler binds HTTP trigger --> onHttpTrigger
5. Bootstrap & Run
   - Entry point touched by `cre simulate`
```

### 3.3 CRE Capabilities Used

| Capability | Purpose |
|------------|---------|
| **HTTP Trigger** | Receives mint/redeem request (SWIFT payload) |
| **HTTP Client** | Fetches Proof of Reserve data from bank API |
| **Consensus** | DON nodes verify data, produce signed report |
| **EVM Client Write** | Sends signed report to blockchain (forwarder -> consumer) |

### 3.4 ACE Stack Architecture

```
Consumer Contract
    |
    +-- onReport() with `runPolicy` modifier
            |
            v
        Policy Engine
            |
            +-- run() receives call data
            |
            +-- Extractor.extract() parses parameters
            |       (beneficiary address, amount, etc.)
            |
            +-- Policy[0]: Blacklist Policy
            |       - Check address not in sanctioned list
            |       - Revert if blacklisted
            |
            +-- Policy[1]: Volume Policy
            |       - Check amount within min/max range
            |       - Revert if out of bounds
            |
            +-- ... Policy[N]
            |
            v
        All pass --> Execute business logic
```

### 3.5 CCIP Integration Flow

When bridging tokens cross-chain (e.g., Sepolia -> Avalanche Fuji):

```
HTTP Trigger (transfer 500 tokens)
    |
    v
CRE Workflow --> submits CCIP send report
    |
    v
Consumer Contract onReport()
    |
    +-- ACE Volume Policy check (range: $100 - $10,000)
    |
    v
If compliant --> Burn tokens on source chain
    |
    v
Encode CCIP message --> Send to Router
    |
    v
CCIP Network --> Destination chain receives tokens
```

The CCIP message is packed inside the consumer contract logic. The report from the forwarder contains the CCIP packet which the consumer contract forwards to the CCIP router.

---

## 4. Technical Details

### 4.1 CLI Commands

```bash
# Login to CRE
cre login

# Check login status
cre my

# Simulate basic mint workflow (local simulation, broadcast to Sepolia)
cre workflow simulate \
  --workflow bank-stable-coin-workflow \
  --target local \
  --broadcast \
  --trigger-index 0 \
  --non-interactive \
  --http-payload ./http-trigger-payload.json

# Simulate full PoR + ACE + CCIP workflow
cre workflow simulate \
  --workflow bank-stable-coin-por-ace-ccip-workflow \
  --target local \
  --broadcast \
  --trigger-index 0 \
  --non-interactive \
  --http-payload ./payloads/test-volume-within-range.json
```

Key flags:
- `--target local` -- runs simulation locally
- `--broadcast` -- actually sends transaction to real blockchain (testnet)
- `--trigger-index 0` -- selects which trigger to fire
- `--non-interactive` -- no manual parameter input
- `--http-payload` -- path to JSON payload file

**Note:** Deployment to production DON is not required for hackathon submissions. Simulation with broadcast is sufficient for demos.

### 4.2 Workflow Definition Pattern (main.ts)

```typescript
// 1. Imports
import { CREHandler, HttpTrigger, EvmClient, HttpClient } from "@chainlink/cre-sdk";
import { z } from "zod";
import { byteToHex } from "./utils";

// 2. Config Schema (Zod)
const configSchema = z.object({
  // network config, contract addresses, etc.
});

// 3. Swift Payload Schema (Zod)
const swiftPayloadSchema = z.object({
  messageType: z.string(),     // e.g., "MT103"
  bankReference: z.string(),
  beneficiary: z.string(),     // name
  beneficiaryAddress: z.string(), // EVM address
  amount: z.number(),
  currency: z.string(),
  // ... other SWIFT fields
});

// 4. Instruction enum
enum Instruction {
  MINT = 0,
  REDEEM = 1,
}

// 5. Business Logic Functions
async function submitBankInstruction(evmClient, config, instruction, account, amount) {
  // Scale amount for blockchain (e.g., multiply by 10^18)
  const scaledAmount = scaleAmount(amount);

  // Encode for smart contract ABI parameters
  const reportData = encodeAbiParameters(
    [instruction, account, scaledAmount]
  );

  // Write report to chain via EVM client
  const response = await evmClient.writeReport({
    reportData,
    gasLimit: 500000,
    // ... other config
  });

  return response;
}

async function processBankInstruction(evmClient, config, payload) {
  const instruction = payload.messageType === "MT103"
    ? Instruction.MINT
    : Instruction.REDEEM;
  return submitBankInstruction(evmClient, config, instruction, payload.beneficiaryAddress, payload.amount);
}

async function onHttpTrigger(trigger, evmClient, httpClient, config) {
  // Parse SWIFT payload
  const payload = swiftPayloadSchema.parse(trigger.payload);

  // Fetch Proof of Reserve via HTTP client
  const reserveData = await httpClient.fetch(config.porApiUrl);

  // Verify reserve is sufficient
  if (reserveData.reserve < payload.amount) {
    throw new Error("Insufficient reserve");
  }

  // Process the bank instruction
  return processBankInstruction(evmClient, config, payload);
}

// 6. Trigger Binding
const handler = new CREHandler();
handler.onHttpTrigger(onHttpTrigger);

// 7. Bootstrap
handler.run();
```

### 4.3 HTTP Trigger Payload (SWIFT mock)

```json
{
  "messageType": "MT103",
  "bankReference": "REF-2024-001",
  "beneficiary": "Ellis Corb",
  "beneficiaryAddress": "0x...",
  "amount": 1000,
  "currency": "USD",
  "instructionCode": "mint"
}
```

For CCIP cross-chain transfer:

```json
{
  "messageType": "TRANSFER",
  "amount": 500,
  "currency": "USD",
  "beneficiaryAddress": "0x...",
  "destinationChain": "avalanche-fuji",
  "destinationBeneficiary": "0x..."
}
```

### 4.4 Smart Contracts

#### Consumer Contract (receives CRE reports)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPolicyEngine} from "./interfaces/IPolicyEngine.sol";

contract StablecoinConsumer {
    IPolicyEngine public policyEngine;

    // The `runPolicy` modifier intercepts and sends call data to ACE
    modifier runPolicy() {
        policyEngine.run(msg.data);
        _;
    }

    // Core function -- every CRE consumer contract MUST have onReport
    function onReport(bytes calldata report) external runPolicy {
        // Decode the report
        (uint256 instruction, address account, uint256 amount) = abi.decode(
            report, (uint256, address, uint256)
        );

        // Business logic
        if (instruction == 0) {
            // MINT
            _mint(account, amount);
        } else if (instruction == 1) {
            // REDEEM / BURN
            _burn(account, amount);
        }
    }
}
```

#### Policy Engine (core ACE contract)

```solidity
contract PolicyEngine is Ownable {
    mapping(bytes4 => address) public extractors;  // selector -> extractor
    mapping(bytes4 => address[]) public policies;  // selector -> policy list

    // Register extractor for a function signature (GLOBAL per engine instance)
    function setExtractor(bytes4 selector, address extractor) external onlyOwner {
        extractors[selector] = extractor;
    }

    // Attach a policy to a function
    function attachPolicy(
        bytes4 selector,
        address policy,
        string[] memory parameterNames
    ) external onlyOwner {
        policies[selector].push(policy);
    }

    // Run all policies for a given call
    function run(bytes calldata callData) external {
        bytes4 selector = bytes4(callData[:4]);
        address extractor = extractors[selector];

        // Extract parameters from call data
        bytes[] memory params = IExtractor(extractor).extract(callData);

        // Run through each attached policy sequentially
        address[] memory policyList = policies[selector];
        for (uint i = 0; i < policyList.length; i++) {
            IPolicy(policyList[i]).validate(params);
            // If validate reverts, entire transaction reverts
        }
    }
}
```

#### Unified Extractor (critical pattern for CRE + ACE)

```solidity
contract UnifiedExtractor is IExtractor {
    // IMPORTANT: Because onReport has the same function signature across
    // all CRE consumer contracts, the extractor must differentiate
    // between different workflow types.

    function extract(bytes calldata callData) external pure returns (bytes[] memory) {
        // Decode the first field to determine workflow type
        (uint256 workflowType, ) = abi.decode(callData[4:], (uint256, bytes));

        if (workflowType > 255) {
            // CCIP workflow -- extract CCIP-specific parameters
            return extractCcipReport(callData);
        } else {
            // Mint/burn workflow -- extract mint-specific parameters
            return extractMintReport(callData);
        }
    }

    function extractMintReport(bytes calldata callData) internal pure returns (bytes[] memory) {
        (, address beneficiary, uint256 amount) = abi.decode(
            callData[4:], (uint256, address, uint256)
        );
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(beneficiary);
        params[1] = abi.encode(amount);
        return params;
    }

    function extractCcipReport(bytes calldata callData) internal pure returns (bytes[] memory) {
        // Extract CCIP-specific fields (destination chain, amount, recipient, etc.)
        // ...
    }
}
```

**Critical insight:** The `setExtractor` mapping in the policy engine is GLOBAL. Since all CRE consumer contracts use `onReport` (same function signature / selector), you need a unified extractor that differentiates workflow types. The demo uses the first `uint256` field: values 0-255 for mint/burn, values >255 for CCIP workflows.

#### Blacklist Policy

```solidity
contract AddressBlacklistPolicy is IPolicy {
    // Uses a fixed storage slot for the blacklist
    bytes32 constant BLACKLIST_STORAGE_SLOT = keccak256("blacklist.policy.storage");

    function validate(bytes[] memory params) external view {
        address beneficiary = abi.decode(params[0], (address));

        if (_isBlacklisted(beneficiary)) {
            revert("Address is blacklisted");
        }
    }

    function addToBlacklist(address addr) external onlyOwner { /* ... */ }
    function removeFromBlacklist(address addr) external onlyOwner { /* ... */ }
    function isBlacklisted(address addr) external view returns (bool) { /* ... */ }
}
```

#### Volume Policy

```solidity
contract VolumePolicy is IPolicy {
    uint256 public minAmount;
    uint256 public maxAmount;

    function validate(bytes[] memory params) external view {
        uint256 amount = abi.decode(params[1], (uint256));

        if (amount < minAmount || amount > maxAmount) {
            revert("Amount outside allowed volume range");
        }
    }
}
```

Demo values: Volume range was $100 to $10,000 for CCIP transfers, and $500 to $15,000 mentioned for another test.

---

## 5. Code Examples Summary

### Project File Structure

```
bank-stable-coin-por-ace-ccip-workflow/
  |-- main.ts                          # CRE workflow definition
  |-- http-trigger-payload.json        # SWIFT mock for basic mint
  |-- payloads/
  |     |-- test-volume-within-range.json
  |     |-- test-volume-exceed.json    # (implied)
  |     +-- redeem-payload.json
  |-- contracts/
  |     |-- StablecoinConsumer.sol      # Consumer contract with onReport
  |     |-- extractors/
  |     |     +-- UnifiedExtractor.sol  # Differentiates workflow types
  |     +-- policies/
  |           |-- AddressBlacklistPolicy.sol
  |           +-- VolumePolicy.sol
  +-- package.json                     # @chainlink/cre-sdk v1.0.7
```

### Encoding Pattern for CRE Report

```typescript
// In main.ts -- encoding the report data for the consumer contract
const reportData = ethers.utils.defaultAbiCoder.encode(
  ["uint256", "address", "uint256"],
  [instruction, beneficiaryAddress, scaledAmount]
);

// For CCIP variant -- first uint256 > 255 to signal CCIP workflow
const ccipReportData = ethers.utils.defaultAbiCoder.encode(
  ["uint256", "address", "uint256", "uint64", "address"],
  [256, beneficiary, amount, destinationChainSelector, destinationBeneficiary]
);
```

---

## 6. Key Integrations

### CRE + Proof of Reserve

- CRE HTTP Client fetches bank reserve data from API
- DON consensus ensures multiple nodes verify the reserve amount (prevents spoofing)
- Reserve ratio must be >= 100% before minting proceeds
- Demo used a mock bank API; production would hit real bank endpoints through multiple nodes

### CRE + ACE

- CRE workflow sends the signed report to the consumer contract's `onReport` function
- The `runPolicy` modifier on `onReport` intercepts and routes to ACE policy engine
- Extractor parses the report bytes into typed parameters
- Policies validate sequentially; any failure reverts the entire transaction
- **Key pattern:** Use a unified extractor when multiple CRE workflows share the same `onReport` signature

### ACE + CCIP

- Volume policy is applied specifically to CCIP bridge transactions
- Ensures cross-chain transfers stay within defined limits
- Consumer contract packs the CCIP message and sends to the CCIP router after policy checks pass
- Tokens are burned on source chain, then CCIP delivers to destination chain
- CCIP Explorer can track cross-chain transaction status (finality takes ~5-10 minutes on testnet)

### CRE + CCIP (encoding)

- The CCIP message packet is encoded within the CRE report
- Consumer contract unpacks the report, runs ACE checks, then forwards the CCIP message to the router
- Same encoding pattern as standard CCIP usage, but wrapped inside the CRE consumer contract logic

---

## 7. Hackathon Ideas

Directly mentioned or implied from the workshop:

1. **Multi-chain DeFi stablecoin** -- stablecoin that serves multiple chains via CCIP, with CRE managing mint/burn and cross-chain operations
2. **Synthetic stablecoins with custom off-chain data** -- connect stablecoins to custom off-chain data sources (commodity prices, forex rates) via CRE HTTP client
3. **Custom Proof of Reserve oracle** -- source reserve data from multiple endpoints (not just one bank API) to reduce attack surface; DON consensus ensures integrity
4. **On-chain portfolio management** -- use CRE's on-chain read + compute capabilities to build portfolio calculation/rebalancing on top of stablecoins
5. **Institutional-grade compliance layer** -- build a comprehensive ACE policy suite for real institutions: blacklist, volume, whitelist, KYC verification, transfer limits, time-based restrictions
6. **Cross-chain compliant transfers** -- ACE + CCIP to enforce compliance on every cross-chain transfer, not just same-chain mints
7. **Compliance-as-a-Service** -- modular ACE policy marketplace where institutions can pick and attach policies to their token contracts
8. **AML monitoring dashboard** -- combine ACE event logs with a monitoring layer that reports to compliance officers

### Hackathon-Specific Notes

- **Deployment is NOT required** -- `cre simulate` with `--broadcast` to testnet is sufficient
- **Demo requirement:** 3-5 minute video showcasing portfolio/simulation
- **Compliance & Risk track** exists as a dedicated hackathon track -- ACE is ideal for this
- **ACE is public** on GitHub under BSL license
- **Support:** Discord hackathon channel, or email `hackathon@chainlinklabs.com`
- **ACE is EVM-only** -- no Solana support (architecture is not EVM-specific conceptually, but implementation is Solidity-based)

---

## 8. Key Insights

### Architecture Patterns

1. **Unified Extractor pattern is essential** -- when using ACE on top of CRE, all consumer contracts share the `onReport` function signature. The extractor's `setExtractor` mapping is GLOBAL in the policy engine. You MUST build a unified extractor that differentiates between workflow types (e.g., using the first `uint256` field as a discriminator: 0-255 for mint/burn, >255 for CCIP).

2. **runPolicy modifier pattern** -- ACE policies are enforced via a Solidity modifier on protected functions. The modifier sends `msg.data` to the policy engine before the function body executes. If any policy reverts, the entire transaction reverts. This is pre-execution enforcement, not post-transaction detection.

3. **CRE main.ts layering** -- business logic is nested: `onHttpTrigger` wraps `processBankInstruction` wraps `submitBankInstruction`. Keep this pattern for clean separation. For scalable projects, split business logic into separate TypeScript files.

4. **Report encoding must match consumer contract's ABI decode** -- the `encodeAbiParameters` call in CRE's TypeScript must exactly match the `abi.decode` call in the Solidity consumer contract.

### Operational Insights

5. **DON consensus provides real security value** -- multiple oracle nodes fetch from different bank API endpoints independently, reach consensus on a single value. This prevents single-point-of-failure attacks (API spoofing, server hacking, request manipulation). Most valuable when data sources update frequently or large sums are at stake.

6. **Policy engine is modular** -- you can attach 1 to N policies per function selector. Policies execute sequentially. Each policy has its own validation logic and can revert independently. Easy to add/remove policies via `attachPolicy`.

7. **CCIP integration inside consumer contract** -- when doing cross-chain transfers, the CCIP packet encoding happens inside the consumer contract (not in CRE). CRE sends the report; the consumer contract unpacks, validates via ACE, then forwards to the CCIP router.

8. **Simulation is production-equivalent** -- `cre simulate --broadcast` sends real transactions to testnet through the DON. The only difference from production is the target network. This means hackathon demos can show real on-chain transactions.

9. **ACE storage pattern** -- policies use fixed storage slots (e.g., `keccak256("blacklist.policy.storage")`) for their state. This is a diamond-storage-like pattern that avoids storage collisions when multiple policies are attached to the same engine.

10. **Reserve ratio is the fundamental invariant** -- `bank_reserves / token_supply >= 100%`. Every mint operation must verify this ratio via Proof of Reserve before proceeding. CRE's HTTP client + DON consensus provides the trusted reserve data.
