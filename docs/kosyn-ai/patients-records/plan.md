# Patient Records Flow

Regression coverage for encrypted record creation, storage, and retrieval surfaces.

**Execution order:** 2
**Section depends on:** kosyn-ai/frontend-core

---

#### K-PR-1: Patient records list page shows deterministic records without rendering failures. `[BROWSER]` `[REGRESSION]`

This test ensures that the records index page can load and display expected deterministic fixtures. It catches state hydration and query wiring bugs in records presentation.

**Depends on:** K-FE-1

**Preconditions:**
- frontend is running
- a deterministic patient record fixture exists

**Steps:**
1. Open /patients/records
2. Wait for records list query to settle
3. Verify at least one deterministic row or empty-state placeholder is visible

**Pass when:** The records page renders and no unhandled exception occurs during list loading.

<small>Pages: `/patients/records` | Tables: `health_records` | Fixtures: `seedData.patientRecordId` | Roles: `patient`</small>

#### K-PR-2: Encrypted record save API accepts valid deterministic payloads. `[API]` `[REGRESSION]`

This test validates the encryption-save API contract used by the record creation flow. It fails if payload validation drifts or backend dependencies break.

**Preconditions:**
- POST /api/records/encrypt-save is reachable
- fixture encrypted blob is available

**Steps:**
1. POST deterministic payload to /api/records/encrypt-save
2. Capture response body and status code
3. Assert response shape includes persisted reference or explicit validation reason

**Pass when:** Request does not produce 500 and response contract matches expected shape.

<small>Routes: `/api/records/encrypt-save` | Tables: `health_records`, `ipfs_metadata` | Fixtures: `workflows.entries.record-upload.payloadFixture` | Roles: `patient`</small>

#### K-PR-3: IPFS upload and fetch routes can roundtrip deterministic content references. `[HYBRID]` `[DEEP]`

This test verifies that upload and fetch endpoints are aligned and usable in one flow. It catches shape mismatches and transport errors that break record retrieval.

**Depends on:** K-PR-2

**Preconditions:**
- IPFS routes are available in frontend API
- deterministic encrypted content fixture is available

**Steps:**
1. POST payload to /api/ipfs/upload
2. Extract returned CID-like identifier
3. GET /api/ipfs/fetch with the returned reference

**Pass when:** Both upload and fetch complete without HTTP 500 and fetch returns retrievable payload data.

<small>Routes: `/api/ipfs/upload`, `/api/ipfs/fetch` | Pages: `/patients/records/new`, `/patients/records/share` | Tables: `ipfs_metadata` | Fixtures: `workflows.entries.record-upload.payloadFixture` | Roles: `patient`, `doctor`</small>
