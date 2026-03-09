# Payments and Webhooks — Results

**Last run:** 2026-03-09T14:15:13.442Z  
**Runner:** btest

| ID | Title | Status | Runner | Last Run | Notes |
| --- | --- | --- | --- | --- | --- |
| K-PAY-1 | Patient deposit page can initiate checkout flow without client crashes. | pass | btest | 2026-03-09 | All Playwright tests in patient-records.spec.ts passed |
| K-PAY-2 | Stripe checkout and deposit endpoints handle deterministic requests with stable response contracts. | skip | btest | 2026-03-09 | No Playwright spec covers this test yet |
| K-PAY-3 | Stripe webhook route rejects malformed payloads and accepts signed deterministic fixtures. | skip | btest | 2026-03-09 | No Playwright spec covers this test yet |
