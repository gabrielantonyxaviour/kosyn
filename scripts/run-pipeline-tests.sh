#!/usr/bin/env bash
# Pipeline test runner for Kosyn AI
# Generates JSON result files for /dev/tests dashboard
# Usage: ./scripts/run-pipeline-tests.sh [pipeline...]
#   No args = run all pipelines
#   contracts | frontend-typecheck | frontend-build | frontend-lint

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS_DIR="$ROOT_DIR/docs/plan/pipeline-results"
mkdir -p "$RESULTS_DIR"

ALL_PIPELINES=(contracts cre-workflows frontend-typecheck frontend-build frontend-lint)

# If args provided, filter to requested pipelines
if [ $# -gt 0 ]; then
  PIPELINES=()
  for arg in "$@"; do
    case "$arg" in
      contracts) PIPELINES+=(contracts) ;;
      cre-workflows) PIPELINES+=(cre-workflows) ;;
      frontend-typecheck) PIPELINES+=(frontend-typecheck) ;;
      frontend-build) PIPELINES+=(frontend-build) ;;
      frontend-lint) PIPELINES+=(frontend-lint) ;;
      frontend) PIPELINES+=(frontend-typecheck frontend-build frontend-lint) ;;
      *) echo "Unknown pipeline: $arg"; exit 1 ;;
    esac
  done
else
  PIPELINES=("${ALL_PIPELINES[@]}")
fi

# Helper: write JSON result file
write_result() {
  local pipeline="$1"
  local display_name="$2"
  local status="$3"
  local duration="$4"
  local summary="$5"
  local output="$6"
  local tests="$7"
  local last_run
  last_run="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"

  cat > "$RESULTS_DIR/${pipeline}.json" <<ENDJSON
{
  "pipeline": "$pipeline",
  "displayName": "$display_name",
  "status": "$status",
  "lastRun": "$last_run",
  "duration": $duration,
  "summary": "$summary",
  "output": $(echo "$output" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
  "tests": $tests
}
ENDJSON
}

# ─── Pipeline: contracts ───
run_contracts() {
  echo "Running: Smart Contract Tests (forge test)"
  local start_time end_time duration
  start_time=$(date +%s)

  local raw_output exit_code=0
  raw_output=$(cd "$ROOT_DIR/contracts" && forge test --json 2>&1) || exit_code=$?
  end_time=$(date +%s)
  duration=$((end_time - start_time))

  if [ $exit_code -ne 0 ] && ! echo "$raw_output" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    # Not valid JSON — forge failed before running tests
    write_result "contracts" "Smart Contracts" "fail" "$duration" \
      "Forge failed to run" "$raw_output" "[]"
    return
  fi

  # Parse forge test --json output to extract tests, merging with annotations
  local tests_json pass_count fail_count total_count status summary
  tests_json=$(echo "$raw_output" | python3 -c "
import json, sys, re, os

try:
    data = json.load(sys.stdin)
except:
    print('[]')
    sys.exit(0)

annotations_path = os.path.join(os.path.dirname(os.path.abspath('$ROOT_DIR')), 'docs/plan/test-annotations.json')
# Try relative from script root
for candidate in [
    '$ROOT_DIR/docs/plan/test-annotations.json',
]:
    if os.path.exists(candidate):
        annotations_path = candidate
        break

try:
    annotations = json.load(open(annotations_path))
except Exception:
    annotations = {}

def parse_duration_ms(dur_str):
    if not isinstance(dur_str, str):
        return 0
    total_ns = 0
    for val, unit in re.findall(r'(\d+)\s*([a-zµ]+)', dur_str):
        val = int(val)
        if unit == 's': total_ns += val * 1_000_000_000
        elif unit == 'ms': total_ns += val * 1_000_000
        elif unit in ('us', 'µs'): total_ns += val * 1_000
        elif unit == 'ns': total_ns += val
    return round(total_ns / 1_000_000)

tests = []
for contract_key, contract_data in data.items():
    if not isinstance(contract_data, dict):
        continue
    test_results = contract_data.get('test_results', {})
    if not isinstance(test_results, dict):
        continue
    for test_name, result in test_results.items():
        if not isinstance(result, dict):
            continue
        success = result.get('status', '') == 'Success'
        dur_ms = parse_duration_ms(result.get('duration', ''))
        reason = result.get('reason', '')
        clean_name = test_name.rstrip('()')
        test_entry = {
            'name': clean_name,
            'status': 'pass' if success else 'fail',
            'duration': dur_ms,
        }
        if reason:
            test_entry['message'] = reason
        ann = annotations.get(clean_name, {})
        if ann.get('steps'):
            test_entry['steps'] = ann['steps']
        if ann.get('tags'):
            test_entry['tags'] = ann['tags']
        tests.append(test_entry)

print(json.dumps(tests))
")

  pass_count=$(echo "$tests_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(1 for t in d if t['status']=='pass'))")
  fail_count=$(echo "$tests_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(1 for t in d if t['status']=='fail'))")
  total_count=$(echo "$tests_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d))")

  if [ "$fail_count" -gt 0 ]; then
    status="fail"
    summary="$fail_count/$total_count tests failed"
  else
    status="pass"
    summary="$pass_count/$total_count tests passed"
  fi

  write_result "contracts" "Smart Contracts" "$status" "$duration" \
    "$summary" "" "$tests_json"
}

# ─── Pipeline: cre-workflows ───
run_cre_workflows() {
  echo "Running: CRE Workflows (typecheck + export validation)"
  local start_time end_time duration
  start_time=$(date +%s)

  # Step 1: TypeScript compilation check
  local tsc_output tsc_exit=0
  if [ -d "$ROOT_DIR/workflows/node_modules" ]; then
    tsc_output=$(cd "$ROOT_DIR/workflows" && npx tsc --noEmit 2>&1) || tsc_exit=$?
  else
    # Install deps first if missing
    (cd "$ROOT_DIR/workflows" && npm install --silent 2>&1) || true
    tsc_output=$(cd "$ROOT_DIR/workflows" && npx tsc --noEmit 2>&1) || tsc_exit=$?
  fi

  # Step 2: Validate each workflow exports main() and uses correct CRE SDK patterns
  local tests_json
  tests_json=$(python3 -c "
import json, os, re

root = '$ROOT_DIR'
annotations_path = os.path.join(root, 'docs/plan/cre-workflow-annotations.json')
try:
    annotations = json.load(open(annotations_path))
except Exception:
    print('[]')
    exit(0)

tsc_exit = $tsc_exit
tsc_output = '''$tsc_output'''

tests = []
for name, ann in annotations.items():
    workflow_dir = os.path.join(root, 'workflows', name.replace('_', '-'))
    main_ts = os.path.join(workflow_dir, 'main.ts')
    errors = []

    # Check 1: File exists
    if not os.path.exists(main_ts):
        tests.append({
            'name': name,
            'status': 'fail',
            'message': 'main.ts not found at ' + main_ts,
            'steps': ann.get('steps', []),
            'tags': ann.get('tags', []),
        })
        continue

    source = open(main_ts).read()

    # Check 2: Exports async main()
    if not re.search(r'export\s+async\s+function\s+main', source):
        errors.append('missing export async function main()')

    # Check 3: Uses Runner from CRE SDK
    if 'Runner' not in source:
        errors.append('missing Runner from @chainlink/cre-sdk')

    # Check 4: Uses correct trigger type per annotation
    trigger = ann.get('trigger', '')
    if 'Log Trigger' in trigger and 'logTrigger' not in source:
        errors.append('annotation says Log Trigger but logTrigger() not found')
    if 'HTTP Trigger' in trigger and 'HTTPCapability' not in source and 'http' not in source.lower().split('trigger')[0]:
        errors.append('annotation says HTTP Trigger but HTTPCapability not found')

    # Check 5: Uses correct opcode per annotation
    opcode = ann.get('opcode', '')
    if opcode and opcode not in source:
        errors.append(f'opcode {opcode} from annotation not found in source')

    # Check 6: Any tsc errors for this workflow's files?
    workflow_rel = 'workflows/' + name.replace('_', '-') + '/'
    tsc_errors_for_file = [l for l in tsc_output.split('\n') if workflow_rel in l and 'error TS' in l]
    if tsc_errors_for_file:
        errors.append(f'{len(tsc_errors_for_file)} type error(s): ' + tsc_errors_for_file[0].strip())

    status = 'fail' if errors else 'pass'
    message = ann['displayName'] + ' — ' + ann['trigger'] + ' → ' + ann['contract'] + ' opcode ' + ann['opcode']
    if errors:
        message += ' | ERRORS: ' + '; '.join(errors)

    tests.append({
        'name': name,
        'status': status,
        'message': message,
        'steps': ann.get('steps', []),
        'tags': ann.get('tags', []),
    })

print(json.dumps(tests))
")

  end_time=$(date +%s)
  duration=$((end_time - start_time))

  local pass_count fail_count total_count status summary
  pass_count=$(echo "$tests_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(1 for t in d if t['status']=='pass'))")
  fail_count=$(echo "$tests_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(1 for t in d if t['status']=='fail'))")
  total_count=$(echo "$tests_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d))")

  if [ "$fail_count" -gt 0 ]; then
    status="fail"
    summary="$fail_count/$total_count workflows failed validation"
  else
    status="pass"
    summary="$pass_count/$total_count workflows passed (typecheck + export + pattern validation)"
  fi

  write_result "cre-workflows" "CRE Workflows" "$status" "$duration" \
    "$summary" "$tsc_output" "$tests_json"
}

# ─── Pipeline: frontend-typecheck ───
run_frontend_typecheck() {
  echo "Running: Frontend TypeCheck (tsc --noEmit)"
  local start_time end_time duration
  start_time=$(date +%s)

  local raw_output exit_code=0
  raw_output=$(cd "$ROOT_DIR/frontend" && npx tsc --noEmit 2>&1) || exit_code=$?
  end_time=$(date +%s)
  duration=$((end_time - start_time))

  local status summary tests_json
  if [ $exit_code -eq 0 ]; then
    status="pass"
    summary="No type errors"
    tests_json='[{"name":"tsc --noEmit","status":"pass","duration":'$duration'}]'
  else
    local error_count
    error_count=$(echo "$raw_output" | grep -c "error TS" || true)
    status="fail"
    summary="$error_count type error(s) found"
    # Extract first 10 errors as individual tests
    tests_json=$(echo "$raw_output" | python3 -c "
import json, sys, re
lines = sys.stdin.read()
errors = re.findall(r'(.+\.tsx?)\((\d+),(\d+)\): error (TS\d+): (.+)', lines)
tests = []
for f, line, col, code, msg in errors[:10]:
    tests.append({
        'name': f'{code}: {f}:{line}',
        'status': 'fail',
        'message': msg.strip()
    })
if not tests:
    tests.append({'name': 'tsc --noEmit', 'status': 'fail', 'message': lines[:500]})
print(json.dumps(tests))
")
  fi

  write_result "frontend-typecheck" "Frontend TypeCheck" "$status" "$duration" \
    "$summary" "$raw_output" "$tests_json"
}

# ─── Pipeline: frontend-build ───
run_frontend_build() {
  echo "Running: Frontend Build (next build)"
  local start_time end_time duration
  start_time=$(date +%s)

  local raw_output exit_code=0
  raw_output=$(cd "$ROOT_DIR/frontend" && npx next build 2>&1) || exit_code=$?
  end_time=$(date +%s)
  duration=$((end_time - start_time))

  local status summary tests_json
  if [ $exit_code -eq 0 ]; then
    status="pass"
    summary="Build succeeded"
    tests_json='[{"name":"next build","status":"pass","duration":'$duration'}]'
  else
    status="fail"
    # Extract error summary
    local error_msg
    error_msg=$(echo "$raw_output" | tail -20 | head -10)
    summary="Build failed"
    tests_json=$(python3 -c "
import json
print(json.dumps([{'name': 'next build', 'status': 'fail', 'message': '''Build failed. Check output for details.'''}]))
")
  fi

  write_result "frontend-build" "Frontend Build" "$status" "$duration" \
    "$summary" "$raw_output" "$tests_json"
}

# ─── Pipeline: frontend-lint ───
run_frontend_lint() {
  echo "Running: Frontend Lint (eslint)"
  local start_time end_time duration
  start_time=$(date +%s)

  local raw_output exit_code=0
  raw_output=$(cd "$ROOT_DIR/frontend" && npx eslint . 2>&1) || exit_code=$?
  end_time=$(date +%s)
  duration=$((end_time - start_time))

  local status summary tests_json
  if [ $exit_code -eq 0 ]; then
    status="pass"
    summary="No lint issues"
    tests_json='[{"name":"eslint","status":"pass","duration":'$duration'}]'
  else
    local error_count warning_count
    error_count=$(echo "$raw_output" | grep -Eo '[0-9]+ error' | head -1 | grep -Eo '[0-9]+' || echo "0")
    warning_count=$(echo "$raw_output" | grep -Eo '[0-9]+ warning' | head -1 | grep -Eo '[0-9]+' || echo "0")
    if [ "$error_count" -gt 0 ]; then
      status="fail"
      summary="$error_count error(s), $warning_count warning(s)"
    else
      status="pass"
      summary="$warning_count warning(s), 0 errors"
    fi

    tests_json=$(echo "$raw_output" | python3 -c "
import json, sys, re
lines = sys.stdin.read()
# Parse eslint output for individual file issues
file_pattern = re.findall(r'^(/[^\n]+)\n((?:  .+\n)+)', lines, re.MULTILINE)
tests = []
for filepath, issues in file_pattern[:10]:
    parts = filepath.split('/')
    try:
        src_idx = parts.index('src')
        short = '/'.join(parts[src_idx:])
    except ValueError:
        short = '/'.join(parts[-3:])
    issue_lines = [l.strip() for l in issues.strip().split('\n') if l.strip()]
    error_count = sum(1 for l in issue_lines if 'error' in l.lower())
    warn_count = sum(1 for l in issue_lines if 'warning' in l.lower())
    st = 'fail' if error_count > 0 else 'pass'
    tests.append({
        'name': short,
        'status': st,
        'message': f'{error_count} errors, {warn_count} warnings'
    })
if not tests:
    tests.append({'name': 'eslint', 'status': 'fail' if 'error' in lines.lower() else 'pass', 'message': lines[:300]})
print(json.dumps(tests))
")
  fi

  write_result "frontend-lint" "Frontend Lint" "$status" "$duration" \
    "$summary" "$raw_output" "$tests_json"
}

# ─── Run requested pipelines ───
echo "═══════════════════════════════════════"
echo "  Kosyn AI — Pipeline Tests"
echo "═══════════════════════════════════════"
echo ""

for p in "${PIPELINES[@]}"; do
  case "$p" in
    contracts) run_contracts ;;
    cre-workflows) run_cre_workflows ;;
    frontend-typecheck) run_frontend_typecheck ;;
    frontend-build) run_frontend_build ;;
    frontend-lint) run_frontend_lint ;;
  esac
  echo ""
done

# ─── Summary ───
echo "═══════════════════════════════════════"
echo "  Results"
echo "═══════════════════════════════════════"

all_pass=true
for p in "${PIPELINES[@]}"; do
  result_file="$RESULTS_DIR/${p}.json"
  if [ -f "$result_file" ]; then
    status=$(python3 -c "import json; print(json.load(open('$result_file'))['status'])")
    summary=$(python3 -c "import json; print(json.load(open('$result_file'))['summary'])")
    if [ "$status" = "pass" ]; then
      echo "  ✅ $p — $summary"
    else
      echo "  ❌ $p — $summary"
      all_pass=false
    fi
  fi
done

echo ""
if [ "$all_pass" = true ]; then
  echo "All pipelines green. Ready for /x2."
else
  echo "Some pipelines failed. Fix issues and re-run."
fi
echo ""
echo "Results written to: docs/plan/pipeline-results/"
echo "View at: /dev/tests"
