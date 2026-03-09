# Frontend Core Surfaces

Smoke coverage for implemented page rendering and basic API liveness in the frontend package.

**Execution order:** 1

---

#### K-FE-1: Landing page and dashboard pages render without server errors. `[BROWSER]` `[SMOKE]`

This test verifies that the primary entry pages load successfully under deterministic local conditions. It catches route-level rendering crashes and invalid imports before deeper suites run.

**Preconditions:**
- frontend dev server is running on localhost
- deterministic fixture headers are enabled where supported

**Steps:**
1. Open / and assert HTTP 200
2. Open /patients/dashboard and assert no error boundary
3. Open /doctors/dashboard and assert no error boundary

**Pass when:** All three pages respond successfully and no server-side 500 occurs.

<small>Pages: `/`, `/patients/dashboard`, `/doctors/dashboard` | Fixtures: `frontend.baseUrl` | Roles: `patient`, `doctor`</small>

#### K-FE-2: Core frontend API endpoints respond with non-500 behavior. `[API]` `[SMOKE]`

This test validates that feature-support endpoints used by the frontend are reachable and return expected status classes. It is focused on crash detection and route presence rather than deep business assertions.

**Preconditions:**
- frontend server is running
- test client can call /api/demo and /api/data/[endpoint]

**Steps:**
1. Call GET /api/demo
2. Call GET /api/data/sample
3. Call POST /api/ai/chat with deterministic payload

**Pass when:** No endpoint returns HTTP 500 and each route returns a deterministic structured response or controlled validation error.

<small>Routes: `/api/demo`, `/api/data/[endpoint]`, `/api/ai/chat` | Fixtures: `api.deterministicHeaders` | Roles: `operator`</small>

#### K-FE-3: Doctor and patient consultation detail pages can be opened with dynamic IDs. `[BROWSER]` `[REGRESSION]`

This test verifies dynamic route handling for consultation detail pages. It is intended to catch route param regressions and component crashes caused by malformed loader assumptions.

**Depends on:** K-FE-1

**Preconditions:**
- at least one deterministic consultation fixture ID is available

**Steps:**
1. Open /patients/consultation/demo-consultation-id
2. Open /doctors/consultation/demo-consultation-id
3. Confirm both pages remain interactive after hydration

**Pass when:** Both dynamic pages render and hydrate without runtime errors.

<small>Pages: `/patients/consultation/[id]`, `/doctors/consultation/[id]` | Fixtures: `seedData.patientRecordId` | Roles: `doctor`, `patient`</small>
