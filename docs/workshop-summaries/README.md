# Chainlink Convergence Hackathon — Workshop Summaries

Transcripts and summaries from the Convergence hackathon workshops. Use these as reference material for building hackathon projects.

## CRE Bootcamp (PRIORITY — Read These First)

| # | Workshop | Summary | Transcript | Key Topics |
|---|----------|---------|------------|------------|
| 1 | **CRE Bootcamp Day 1 — Foundations** | [Summary](./01-cre-bootcamp-day1-summary.md) | [Transcript](./01-cre-bootcamp-day1.txt) | CRE architecture, workflows, triggers, capabilities, DON consensus, hello world, HTTP trigger + EVM write |
| 2 | **CRE Bootcamp Day 2 — Complete Project** | [Summary](./02-cre-bootcamp-day2-summary.md) | [Transcript](./02-cre-bootcamp-day2.txt) | AI prediction market end-to-end, log triggers, Gemini AI integration, secrets management, simulation with --broadcast |

## Application Workshops

| # | Workshop | Summary | Transcript | Key Topics |
|---|----------|---------|------------|------------|
| 3 | **Stablecoin Issuance With CRE** | [Summary](./03-stablecoin-issuance-cre-summary.md) | [Transcript](./03-stablecoin-issuance-cre.txt) | CRE + ACE compliance engine + CCIP cross-chain, CRUSD stablecoin, proof of reserve, blacklist/volume policies |
| 4 | **Custom Proof of Reserve Data Feed** | [Summary](./04-proof-of-reserve-summary.md) | [Transcript](./04-proof-of-reserve.txt) | 5-capability chain (cron + HTTP + EVM read + LLM + EVM write), multi-chain supply aggregation, AI risk scoring |
| 5 | **Tokenized Asset Servicing** | *Video removed by uploader* | — | — |

## Advanced CRE — Confidential Compute

| # | Workshop | Summary | Transcript | Key Topics |
|---|----------|---------|------------|------------|
| 6 | **Confidential HTTP Requests with CRE** | [Combined Summary](./summary-confidential-compute.md) | [Transcript](./06-confidential-http-requests.txt) | Vault DON, threshold encryption, encrypted API secrets, AES-GCM decryption |
| 7 | **Private Transactions with Confidential Compute** | [Combined Summary](./summary-confidential-compute.md) | [Transcript](./07-private-transactions.txt) | Shielded addresses, ticket-based withdrawals, private ERC-20 transfers, TEE enclaves |

## Partner Workshop

| # | Workshop | Summary | Transcript | Key Topics |
|---|----------|---------|------------|------------|
| 8 | **Build With Thirdweb** | [Summary](./08-build-with-thirdweb-summary.md) | [Transcript](./08-build-with-thirdweb.txt) | Connect button, server wallets, bridge widget, checkout, x402, Nebula AI, gas sponsorship |

---

## Key Patterns Across All Workshops

### CRE Workflow Structure (Every Workshop)
```
Trigger (cron/log/HTTP) → Capabilities (HTTP fetch, EVM read) → Consensus → EVM Write → Consumer Contract
```

### Common CRE Capabilities Used
| Capability | Workshops |
|-----------|-----------|
| Cron Trigger | Proof of Reserve |
| Log Trigger | CRE Day 2 (prediction market settlement) |
| HTTP Trigger | CRE Day 1, Stablecoin Issuance |
| HTTP Client | All CRE workshops (API calls, LLM queries) |
| EVM Read | Proof of Reserve, CRE Day 2 |
| EVM Write | All CRE workshops |
| Consensus | All CRE workshops (median, identical, byFields) |

### Hackathon Submission Requirements
- **Simulation with `--broadcast` is sufficient** — no deployment needed
- **3-5 minute demo** showing the workflow executing
- **CRE deployment requires early access** — contact hackathon@chainlinklabs.com if needed
- **Multi-track submissions** encouraged (DeFi + Compliance, AI + RWA, etc.)

### Critical Technical Gotchas
1. **Secrets closure pattern** — `runtime.getSecret()` not available inside fetcher functions, use closure
2. **Cache settings** — Prevent N DON nodes from each calling expensive APIs (LLM, paid APIs)
3. **Unified Extractor for ACE** — `setExtractor` is global per function selector, must discriminate workflow types
4. **Forwarder transactions** — EVM writes appear as internal txs, check `result` log field for actual success
5. **`--broadcast` flag** — Without it, EVM write tx hashes are all zeros
6. **Secrets naming** — Don't use identical names for CRE secret and env var (known bug)
