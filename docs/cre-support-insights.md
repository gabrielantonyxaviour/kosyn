# CRE Support Channel Insights (Feb 8-23, 2026)

Extracted from 434 messages across #discussion and #support channels during the Convergence hackathon.

---

## 1. Common Issues & Solutions

### Deployment & Access

| Issue | Solution |
|-------|----------|
| Workflow deployment blocked by review wall | Deployment is in Early Access. Fill out form at `cre.chain.link/workflows` specifying it's for the hackathon. Chainlink team will sponsor mainnet gas for valid use cases. |
| Long wait for CRE deploy access (days) | DM Harry directly with your email. Mention "hackathon" explicitly in the form. Response target is 24 hours. |
| Confused about simulation vs deployment requirement | **Simulation is sufficient for hackathon submission.** Use `cre workflow simulate <workflow> --broadcast` for on-chain writes. No need to deploy to the DON. |
| Deployment requires ETH on Ethereum Mainnet | Even for testnet workflows, the Workflow Registry contract lives on mainnet. Chainlink will sponsor gas for hackathon projects. |

### WASM Trap / Engine Creation Failure

| Issue | Solution |
|-------|----------|
| `wasm trap: wasm unreachable instruction executed` (most common error) | **Upgrade Bun to v1.2.21 or higher** (v1.3.9 confirmed working). This is the #1 cause. |
| Same WASM error on Mac M3 with Bun 1.3.9 + CRE CLI v1.1.0 | Known issue under investigation by Chainlink. **Workaround: build on Windows** or wait for fix. |
| `Expected file not found: tmp.js` | Older Bun version issue. Upgrade Bun. |
| Module-level function calls causing WASM trap | If you call viem functions (e.g., `parseAbiParameters`, `encodeAbiParameters`) at module level (outside handlers), they execute during WASM init and crash. **Move all such calls inside handler callbacks.** |

### Workflow Configuration

| Issue | Solution |
|-------|----------|
| `project.yaml` does not support env variables for RPC URLs | **Confirmed limitation.** RPC URLs must be hardcoded. Workarounds: (1) Use a script to generate `project.yaml` from `.env` and add `project.yaml` to `.gitignore`. (2) Use public RPCs when pushing to GitHub. |
| `secret not found` error | 1. Check `secrets-path` in `workflow.yaml` points to correct relative path (e.g., `"../secrets.yaml"`). 2. Ensure secret names in `secrets.yaml` match what's used in workflow code. 3. `.env` file must be at the same level as `secrets.yaml`. |
| YAML unmarshal error with `secrets.yaml` | Double-check indentation strictly. Format: top-level `secretsNames:`, then secret name (2-space indent), then array item (4-space indent with `- `). Reported as potentially buggy -- try stripping to minimal example. |
| `bunx cre-setup` returns 404 | Use `bun add @chainlink/cre-sdk-javy-plugin` first, then `bun x cre-setup` (not `bunx cre-setup`). |
| `.cre_build_tmp.js` file created on every simulate | Temporary JS bundle, safe to add to `.gitignore`. Recreated each run. |

### HTTP Capability Limits

| Issue | Solution |
|-------|----------|
| `PerWorkflow.HTTPAction.CallLimit limited: cannot use 6, limit is 5` | Hard limit of **5 HTTP calls per workflow**. Cannot be increased. **Split into multiple composable workflows** instead. |

### Chain & RPC Issues

| Issue | Solution |
|-------|----------|
| Experimental chains (Anvil / local RPC with chain ID 31337) not working | CRE requires a **supported Chain Selector**. Anvil's 31337 is not in the list. **Fork a supported network** with its chain ID (e.g., 11155111 for Sepolia) or use **Tenderly Virtual Testnet** with original chain IDs. |
| Base Sepolia sequencer issues / stuck transactions | Switch RPCs. Use Tenderly Virtual Testnet as alternative. Hackathon coupon: `https://dashboard.tenderly.co/accept-coupon?promo_code=CRE-HACKATHON` |
| Wrong chain name for Base Sepolia | Check the **forwarder directory** for exact chain names: `https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts` |
| `isTestnet` flag wrong in getEVM client | When querying mainnet data, ensure `isTestnet: false`. Easy to miss. |
| RPC URL with API key in `project.yaml` | Not gitignore-safe. Use public RPCs for git, private RPCs locally. |

### Simulation Behavior

| Issue | Solution |
|-------|----------|
| Cron trigger only fires once in simulation | **Expected behavior.** `simulate` runs the workflow once regardless of trigger type. For demos, manually trigger and explain the cron schedule. |
| `writeReport()` returns `receiverContractExecutionStatus: 0` (REVERTED) but tx succeeds on-chain | **Known simulation limitation.** The status field is optional and may not reflect the full execution chain (especially forwarder -> receiver -> nested calls). **Trust on-chain receipt events over simulation status.** |
| `onReport()` never called during `--broadcast` simulation | Simulation cannot fully replicate forwarder behavior. The forwarder -> receiver flow may be skipped. Check on-chain tx directly. |
| Simulation with `--broadcast` times out on write | Try a different/faster RPC endpoint. Network congestion can cause timeouts. |

### Confidential HTTP

| Issue | Solution |
|-------|----------|
| Confidential HTTP only available in simulation | **Correct.** It's experimental and not ready for live deployments (testnet or mainnet). Simulation with `--broadcast` still does real chain writes though. |
| Go vs TypeScript for Confidential HTTP | Both are supported. Go docs: `docs.chain.link/cre/guides/workflow/using-confidential-http-client/making-requests-go` |
| Converting Confidential HTTP response to write on-chain | Keep `encodedPayload` as hex (from `encodeAbiParameters`). Do NOT convert to base64. CRE's EVM encoder expects hex-encoded ABI data. |
| `_processReport` not being reached | Check forwarder address is correct. Verify the forwarder actually called your contract (check tx logs). Your contract may be rejecting the call. |

### Data Streams Access

| Issue | Solution |
|-------|----------|
| Data Streams API key request stuck in automated email loop | DM `woogieboogie.jl` or tag them in support channel. Mention it's for the hackathon. |
| Data Streams signup form requires website | Use GitHub link or put "N/A". Team will follow up if needed. |

---

## 2. Known Bugs / Limitations

| Bug/Limitation | Status | Details |
|----------------|--------|---------|
| WASM trap on Mac M3 (ARM64) with latest Bun + CRE CLI | **Under investigation** | Hello world workflow fails. Works on Windows. |
| `project.yaml` does not support env variable substitution | **Confirmed limitation** | RPC URLs must be hardcoded. No ETA for fix. |
| `receiverContractExecutionStatus` reports 0 when tx succeeds | **Known simulation limitation** | Status is optional/unreliable in simulation. Trust on-chain receipts. |
| Forwarder -> receiver flow incomplete in simulation | **Known limitation** | `onReport()` may not fire. Docs acknowledge simulation "cannot fully replicate forwarder behavior." |
| HTTP call limit: 5 per workflow | **By design** | Cannot be increased. Split workflows instead. |
| CRE docs search feature broken on some browsers | **Being fixed** | Use Firefox or VPN as workaround. |
| Confidential HTTP: simulation only | **Expected (experimental)** | No timeline for live deployment support during hackathon. |
| Anvil (chain 31337) not supported as experimental chain | **By design** | Must fork a supported chain with its original chain ID. |
| CRE workflows not visible on `cre.chain.link` after deployment | **Reported** | Under investigation. |

---

## 3. Best Practices

### Workflow Architecture
- **Split large workflows into composable smaller ones** to stay within the 5 HTTP call limit and keep logic manageable.
- **One CRE project can contain multiple workflows.** Each workflow can have multiple handlers (trigger + callback pairs).
- **Chain handlers via events:** Use cron/HTTP trigger for initial action, emit on-chain event, then use EVM Log Trigger to catch it and continue.
- **Microservice > monolith** for CRE workflows -- separate concerns across workflows.

### Simulation & Demo
- Use `--broadcast` flag for all demos -- it performs real on-chain writes and is required for hackathon validity.
- **Must show a state change on testnet** (just reading a price feed and logging it is not sufficient).
- For cron-triggered workflows, manually run simulate and explain the schedule in your demo video.
- Use **Tenderly Virtual Testnet** for reliable testing (free pro plan with hackathon coupon).

### Secrets Management
- Secrets go in `secrets.yaml` + `.env` file, referenced via `secrets-path` in `workflow.yaml`.
- Secret names in `secrets.yaml` map to `.env` variable names (two-level mapping).
- Never put API keys in `project.yaml` -- it's not gitignore-safe by default.

### Development Tooling
- Use **CRE Agent Skills** (`github.com/smartcontractkit/chainlink-agent-skills/tree/main/cre-skills`) with latest AI models for faster development and debugging.
- Use `cre update` to get latest CLI + SDK versions.
- Add `.cre_build_tmp.js` to `.gitignore`.

### Testing Strategy
- Deploy contracts to a supported testnet (Sepolia recommended).
- Run `cre workflow simulate <name> --target staging-settings --broadcast`.
- Verify tx on block explorer -- check `ReportProcessed` event and `result` bool.
- For local development, fork Sepolia via Anvil with chain ID 11155111.

---

## 4. Gotchas & Pitfalls

1. **Bun version matters critically.** Anything below 1.2.21 causes cryptic WASM trap errors. Always check Bun version first when debugging.

2. **Module-level code execution crashes WASM.** Any function calls at the top level of your workflow file (outside `initWorkflow`/handlers) run during WASM initialization and will cause trap errors. Move all logic inside handler callbacks.

3. **`simulate` only runs ONE trigger cycle.** It does not loop like a deployed cron workflow. You must manually re-run for each trigger.

4. **HTTP call limit is 5 per workflow, not per handler.** If you have 3 handlers each making 2 HTTP calls, that's 6 and it will fail.

5. **Chain names are specific.** Use the forwarder directory for exact names (e.g., `ethereum-testnet-sepolia`, not `sepolia` or `base-sepolia`). Wrong chain names silently skip RPCs.

6. **`--broadcast` is required for meaningful demos.** Without it, no on-chain state changes occur, which is insufficient for hackathon submission.

7. **Simulation status codes are unreliable.** `receiverContractExecutionStatus: 0` does NOT mean the tx failed. Always verify on-chain.

8. **Confidential HTTP simulation still does real chain writes.** The "simulation only" limitation means you can't deploy to the DON, but `--broadcast` still sends real transactions.

9. **Private token transfers use a single token + vault model.** You don't need a separate token per user. One token deposited to the vault contract can be sent/received by anyone in the private domain.

10. **CRE does NOT support WebSocket.** It uses HTTP capability only.

11. **CRE workflows compile to WASM via Javy for the DON runtime.** They cannot run in browsers -- they need consensus, EVM calls, and other DON infrastructure.

12. **`encodedPayload` must be hex-encoded ABI data.** Do NOT convert to base64 before passing to `runtime.report()`. This was a confirmed debugging trap.

13. **`Buffer` may not be available in CRE runtime.** For base64/hex conversions, use manual conversion with `Uint8Array` and `TextDecoder`.

14. **Multiple RPCs skipped silently.** If your `project.yaml` doesn't have an RPC for a chain, you'll see `"RPC not provided for X; skipping"` only in debug logs. Always provide RPCs for chains you use.

---

## 5. Useful Code Snippets

### Hex to String Conversion (CRE-safe, no Buffer)
```typescript
const hex = input.myHex.replace(/^0x/, "");
const bytes = Uint8Array.from(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
const decoded = new TextDecoder().decode(bytes);
return { decoded };
```

### Secrets Configuration

**`secrets.yaml`:**
```yaml
secretsNames:
  GEMINI_API_KEY:
    - GEMINI_API_KEY_VAR
```

**`.env`:**
```
GEMINI_API_KEY_VAR=your-actual-key-here
```

**`workflow.yaml`:**
```yaml
secrets-path: "../secrets.yaml"
```

**In workflow code:** Use `GEMINI_API_KEY` (the left-hand name).

### Writing Reports to Chain
```typescript
// Step 1: Encode your payload as ABI-encoded hex
const encodedPayload = encodeAbiParameters(
  parseAbiParameters("string data"),
  [yourData]
);

// Step 2: Create report (keep as hex, do NOT convert to base64)
const reportResponse = runtime.report({
  encodedPayload: encodedPayload,
  encoderName: "evm",
  signingAlgo: "ecdsa",
  hashingAlgo: "keccak256",
}).result();

// Step 3: Write to chain
const writeResult = evmClient.writeReport(runtime, {
  receiver: runtime.config.receiverAddress,
  report: reportResponse,
  gasConfig: { gasLimit: runtime.config.gasLimit },
}).result();

// Step 4: Check result (but verify on-chain too)
if (writeResult.txStatus === TxStatus.SUCCESS) {
  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
  runtime.log(`Transaction successful: ${txHash}`);
}
```

### Multi-Handler Workflow Pattern
```typescript
// Cron trigger -> API call -> write on-chain (emits event)
// Log trigger -> catches event -> does next action
const initWorkflow = (config: Config) => {
  const cron = new CronCapability();
  const logTrigger = new EVMLogTrigger();

  return [
    handler(cron.trigger({ schedule: config.schedule }), onCronCallback),
    handler(logTrigger.trigger({ address: config.contractAddr, event: "MyEvent" }), onEventCallback),
  ];
};
```

### Project Structure (Multiple Workflows)
```
CreProject/
  workflow1-encrypt/
    main.ts
    workflow.yaml
  workflow2-business-logic/
    main.ts
    workflow.yaml
  contracts/
  project.yaml
  secrets.yaml
  .env
```

### Forking Sepolia with Anvil (CRE-compatible)
```bash
# Fork with the REAL chain ID so CRE recognizes it
anvil --fork-url https://rpc.sepolia.org --chain-id 11155111
```

Then in `project.yaml`:
```yaml
staging-settings:
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: http://127.0.0.1:8545
```

---

## 6. CRE Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Workflow Simulation | **Available** | Full capability, real chain reads/writes with `--broadcast` |
| Workflow Deployment to DON | **Early Access** | Requires form + approval. Chainlink sponsors gas for hackathon. |
| Cron Trigger | **Available** | Works in simulation (single fire). Works in deployment (recurring). |
| EVM Log Trigger | **Available** | Catch on-chain events to trigger workflow logic. |
| HTTP Trigger | **Available** | Trigger workflows via HTTP POST to gateway endpoint. |
| HTTP Capability | **Available** | Up to 5 calls per workflow. |
| Confidential HTTP | **Experimental (Sim only)** | Works in simulation. Not deployable to DON yet. |
| EVM Read / Write | **Available** | Read contract state, write via forwarder + report pattern. |
| Data Streams | **Available (gated)** | Requires allowlisting. Request via form, mention hackathon. |
| Private Token Transfers | **Available (demo)** | Deposit to vault, transfer within private domain, withdraw on-chain. |
| Confidential Compute (CCC) | **Not available** | Full private execution of arbitrary logic coming later. |
| TypeScript SDK | **Available** | Primary SDK for hackathon. |
| Go SDK | **Available** | Alternative, full feature parity with TS for most capabilities. |
| ACE (Automated Compliance Engine) | **Available** | On-chain contracts, no access request needed. |
| Agent Skills (AI-assisted dev) | **Available** | `github.com/smartcontractkit/chainlink-agent-skills/tree/main/cre-skills` |
| WebSocket support | **Not available** | Uses HTTP only. |
| Browser-based WASM execution | **Not possible** | Requires DON runtime infrastructure. |
| Starknet / non-EVM chains | **Not supported in CRE** | CRE is EVM-focused. |

### Supported Chains

**Mainnets (9):** Arbitrum One, Avalanche, Base, BNB Chain, Ethereum, OP Mainnet, Polygon, World Chain, ZKSync Era

**Testnets (14+):** Apechain Curtis, Arc, Arbitrum Sepolia, Avalanche Fuji, Base Sepolia, BNB Chain Testnet, Ethereum Sepolia, Hyperliquid Testnet, Ink Sepolia, Jovay Testnet, Linea Sepolia, OP Sepolia, Plasma Testnet, Polygon Amoy, World Chain Sepolia, ZKSync Era Sepolia

---

## 7. FAQ

**Q: Do I need to deploy my workflow to CRE for the hackathon?**
A: No. Simulation with `--broadcast` flag showing on-chain state changes is sufficient. Deployment is optional.

**Q: Can I use a local Anvil node?**
A: Only if you fork a supported chain and use its real chain ID (e.g., `anvil --chain-id 11155111` for Sepolia). Raw Anvil with chain 31337 is not supported.

**Q: Can I submit to multiple hackathon tracks?**
A: Yes. Your project will be judged against each track independently. You can only win one track.

**Q: Can one person be on multiple projects?**
A: Yes. Register once, submit multiple projects.

**Q: How do I trigger a workflow from my frontend?**
A: For deployed workflows, POST to the CRE gateway (e.g., `https://01.gateway.zone-a.cre.chain.link`). For hackathon demos, just use `cre workflow simulate --broadcast`.

**Q: What's the HTTP call limit per workflow?**
A: 5. Split into multiple composable workflows if you need more.

**Q: Can I have multiple workflows in one project?**
A: Yes. A CRE project can contain multiple workflow directories, each with its own `main.ts` and `workflow.yaml`.

**Q: Can a single handler chain multiple capabilities?**
A: Yes. One handler = 1 trigger + 1 callback. The callback can chain as many capabilities as needed (within limits).

**Q: Is Confidential HTTP deployable?**
A: No. Simulation only. But simulation with `--broadcast` still writes real transactions on-chain.

**Q: How do I get Data Streams API access?**
A: Fill out the form at `chainlinkcommunity.typeform.com/datastreams`, mention it's for the hackathon. If stuck, tag `woogieboogie.jl` in the support channel.

**Q: What Bun version do I need?**
A: 1.2.21 or higher. 1.3.9 is confirmed working on most platforms.

**Q: How do I use secrets/API keys in my workflow?**
A: Define in `secrets.yaml`, set values in `.env`, reference via `secrets-path` in `workflow.yaml`. Cannot use env vars in `project.yaml` (RPC URLs must be hardcoded).

**Q: Does CRE support WebSocket?**
A: No. HTTP only.

**Q: Can CRE workflows run in the browser?**
A: No. They compile to WASM for the DON runtime which requires consensus and EVM capabilities that browsers can't provide.

**Q: What is the Tenderly hackathon coupon?**
A: `https://dashboard.tenderly.co/accept-coupon?promo_code=CRE-HACKATHON` -- gives free Pro plan for the hackathon duration.

---

## Key Resources

| Resource | URL |
|----------|-----|
| CRE Docs | `https://docs.chain.link/cre` |
| CRE Agent Skills | `https://github.com/smartcontractkit/chainlink-agent-skills/tree/main/cre-skills` |
| CRE Templates | `https://github.com/smartcontractkit/cre-templates` |
| Confidential HTTP Docs (TS) | `https://docs.chain.link/cre/capabilities/confidential-http-ts` |
| Confidential HTTP Demo Repo | `https://github.com/smartcontractkit/conf-http-demo` |
| Private Token Transfer Demo | `https://github.com/smartcontractkit/Compliant-Private-Transfer-Demo` |
| Prediction Market Demo | `https://github.com/smartcontractkit/cre-gcp-prediction-market-demo` |
| Supported Chains | `https://docs.chain.link/cre/supported-networks-ts` |
| Forwarder Directory | `https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts` |
| Chain Selector Reference | `https://docs.chain.link/cre/reference/sdk/evm-client-go#complete-chain-selector-reference` |
| Project Configuration | `https://docs.chain.link/cre/reference/project-configuration-ts` |
| Tenderly Workshop | `https://www.youtube.com/live/jTHrwXZdeVs` |
| Confidential HTTP Workshop | `https://www.youtube.com/watch?v=lbojKfsM-94` |
| Private Transfers Workshop | `https://www.youtube.com/watch?v=sfzY3iDJT5I` |
| Hackathon Schedule | `https://chain.link/hackathon/schedule` |
| LLMs Full Context (Go) | `https://docs.chain.link/cre/llms-full-go.txt` |
