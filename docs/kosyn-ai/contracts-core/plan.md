# Contracts Core

Deterministic contract test coverage mapped from Foundry suites to spec IDs.

**Execution order:** 5
**Section depends on:** kosyn-ai/frontend-core

---

#### K-CON-1: HealthRecordRegistry Foundry suite passes under deterministic forge execution. `[MANUAL]` `[REGRESSION]`

This test validates the primary registry contract behavior through the existing Foundry test suite. It catches storage and policy enforcement regressions at the contract layer.

**Preconditions:**
- contracts dependencies are installed
- forge is available in PATH

**Steps:**
1. Run forge test --json in contracts package
2. Filter outputs for HealthRecordRegistry suite
3. Map pass/fail to results artifact

**Pass when:** HealthRecordRegistry test suite passes and mapper writes deterministic result evidence.

<small>Tables: `health_records`, `consents` | Roles: `operator`</small>

#### K-CON-2: Policy engine and ACE policy contracts compile and execute referenced tests without errors. `[MANUAL]` `[DEEP]`

This test protects policy-related contract wiring by asserting the forge run does not contain compile/runtime failures for ACE contracts. It guards against accidental policy interface drift.

**Depends on:** K-CON-1

**Preconditions:**
- forge cache is clean or reproducible
- contracts/src/ace remains in sync with interfaces

**Steps:**
1. Run forge test --json
2. Inspect output for ace policy test failures or compilation errors
3. Persist failure details to contract evidence log if any

**Pass when:** No ACE policy compile or runtime failures are present in the forge output.

<small>Tables: `policy_rules` | Roles: `operator`</small>
