# Payments and Webhooks

Regression tests for checkout/deposit initiation and webhook ingestion surfaces.

**Execution order:** 3
**Section depends on:** kosyn-ai/frontend-core

---

#### K-PAY-1: Patient deposit page can initiate checkout flow without client crashes. `[BROWSER]` `[REGRESSION]`

This browser test validates that the deposit UI wiring can trigger checkout requests and handle pending states. It is designed to detect frontend integration regressions quickly.

**Depends on:** K-FE-1

**Preconditions:**
- frontend running
- payment environment variables are configured for local run

**Steps:**
1. Open /patients/deposit
2. Trigger deposit action with deterministic amount
3. Assert the UI transitions to expected pending or redirect state

**Pass when:** Deposit action does not crash the UI and emits one checkout/deposit API request.

<small>Routes: `/api/stripe/checkout`, `/api/stripe/deposit` | Pages: `/patients/deposit` | Tables: `payment_intents` | Roles: `patient`</small>

#### K-PAY-2: Stripe checkout and deposit endpoints handle deterministic requests with stable response contracts. `[API]` `[REGRESSION]`

This API test validates request/response behavior of checkout and deposit route handlers under deterministic payloads. It catches status and schema regressions that break frontend payment orchestration.

**Preconditions:**
- frontend server exposes /api/stripe/checkout and /api/stripe/deposit

**Steps:**
1. POST deterministic payload to /api/stripe/checkout
2. POST deterministic payload to /api/stripe/deposit
3. Assert non-500 status and stable JSON contracts

**Pass when:** Both routes respond with non-500 statuses and expected keys for downstream processing.

<small>Routes: `/api/stripe/checkout`, `/api/stripe/deposit` | Tables: `payment_intents` | Roles: `operator`</small>

#### K-PAY-3: Stripe webhook route rejects malformed payloads and accepts signed deterministic fixtures. `[API]` `[DEEP]`

This API test validates webhook guard behavior by sending malformed and deterministic signed payloads. It catches insecure acceptance logic and parser regressions in webhook processing.

**Depends on:** K-PAY-2

**Preconditions:**
- webhook route is reachable
- deterministic webhook fixtures are available

**Steps:**
1. POST malformed payload to /api/stripe/webhook and verify controlled rejection
2. POST deterministic valid-like payload and verify non-500 handling path

**Pass when:** Malformed payload is rejected without 500 and valid-like deterministic payload is processed by the expected branch.

<small>Routes: `/api/stripe/webhook` | Tables: `payment_events` | Roles: `operator`</small>
