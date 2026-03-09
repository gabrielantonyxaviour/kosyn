# CRE Workflow Simulation

Deterministic CRE simulation coverage. All workflow validation in this section must run via `cre workflow simulate` only.

**Execution order:** 4
**Section depends on:** kosyn-ai/frontend-core

---

#### K-CRE-1: record-upload workflow simulation succeeds with deterministic encrypted payload fixture. `[MANUAL]` `[SMOKE]`

This test ensures record-upload can execute in CRE simulation with fixed payload and deterministic runtime configuration. It catches runtime import/config regressions in the workflow package.

**Preconditions:**
- cre CLI is available
- workflows package dependencies are installed
- record-upload fixture exists

**Steps:**
1. Run cre workflow simulate record-upload with docs/fixtures/workflows/record-upload.json
2. Capture simulation output log
3. Assert simulation exits successfully

**Pass when:** Simulation command exits with success and produces expected execution log structure.

<small>Tables: `health_records` | Fixtures: `workflows.entries.record-upload.payloadFixture` | Roles: `operator`</small>

#### K-CRE-2: consultation-processing and data-aggregation workflows simulate successfully with fixed fixtures. `[MANUAL]` `[REGRESSION]`

This test validates two workflow paths with deterministic fixtures to catch runtime drift and broken imports across workflow modules. It ensures both workflows remain executable in local deterministic environments.

**Depends on:** K-CRE-1

**Preconditions:**
- consultation-processing fixture exists
- data-aggregation fixture exists

**Steps:**
1. Run cre workflow simulate consultation-processing with its fixture
2. Run cre workflow simulate data-aggregation with its fixture
3. Verify both commands exit successfully

**Pass when:** Both workflow simulations exit successfully and emit expected execution traces.

<small>Tables: `consultations` | Fixtures: `workflows.entries.consultation-processing.payloadFixture`, `workflows.entries.data-aggregation.payloadFixture` | Roles: `operator`</small>

#### K-CRE-3: payment-mint workflow simulation completes and output can be mapped to deterministic result artifact. `[MANUAL]` `[DEEP]`

This test verifies the payment-mint workflow simulation and checks that output is captured to a deterministic artifact path for history. It prevents silent run success without persisted evidence.

**Depends on:** K-CRE-1

**Preconditions:**
- payment-mint fixture exists
- ctest result writer script is configured

**Steps:**
1. Run cre workflow simulate payment-mint with fixture
2. Write simulation output to docs/evidence/cre/
3. Validate evidence file path is included in results metadata

**Pass when:** Simulation succeeds and evidence artifact is written and linkable from results.json.

<small>Tables: `payments` | Fixtures: `workflows.entries.payment-mint.payloadFixture` | Roles: `operator`</small>
