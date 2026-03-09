#!/usr/bin/env bash
# Usage: bash scripts/update-tunnel-url.sh https://new-tunnel-url.trycloudflare.com
set -e

NEW_BASE="${1%/}"  # strip trailing slash
if [[ -z "$NEW_BASE" ]]; then
  echo "Usage: $0 <new-tunnel-base-url>"
  echo "Example: $0 https://xyz.trycloudflare.com"
  exit 1
fi

ENV_FILE="$(dirname "$0")/../frontend/.env.local"

echo "=== Updating .env.local ==="
sed -i '' "s|https://[^/]*\.trycloudflare\.com|$NEW_BASE|g" "$ENV_FILE"
echo "  Done"

echo ""
echo "=== Updating Vercel env vars ==="
VERCEL_TOKEN=$(python3 -c "import json; print(json.load(open('/Users/gabrielantonyxaviour/Library/Application Support/com.vercel.cli/auth.json'))['token'])")
PROJECT_ID="prj_Yu6MbzOIJ8QO2DBagtODIPy4KvfV"

python3 << PYEOF
import json, urllib.request

token = "$VERCEL_TOKEN"
project_id = "$PROJECT_ID"
base = "$NEW_BASE"

# Fetch all env vars to find the CRE_* ones
req = urllib.request.Request(
    f"https://api.vercel.com/v10/projects/{project_id}/env",
    headers={"Authorization": f"Bearer {token}"}
)
with urllib.request.urlopen(req) as resp:
    envs = json.loads(resp.read())["envs"]

cre_map = {
    "CRE_RECORD_UPLOAD_URL": f"{base}/record-upload",
    "CRE_CONSULTATION_PROCESSING_URL": f"{base}/consultation-processing",
    "CRE_PROVIDER_DECRYPTION_URL": f"{base}/provider-decryption",
    "CRE_PROVIDER_REGISTRATION_URL": f"{base}/provider-registration",
    "CRE_PAYMENT_MINT_URL": f"{base}/payment-mint",
    "CRE_DATA_MARKETPLACE_URL": f"{base}/data-marketplace",
    "CRE_PATIENT_AI_ATTEST_URL": f"{base}/patient-ai-attest",
}

for e in envs:
    if e["key"] in cre_map:
        new_val = cre_map[e["key"]]
        payload = json.dumps({
            "value": new_val,
            "type": "encrypted",
            "target": ["production", "preview", "development"]
        }).encode()
        req = urllib.request.Request(
            f"https://api.vercel.com/v10/projects/{project_id}/env/{e['id']}",
            data=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="PATCH"
        )
        with urllib.request.urlopen(req) as resp:
            print(f"  {e['key']} = {new_val}")
PYEOF

echo ""
echo "=== Done! Redeploy Vercel to apply ==="
echo "  vercel deploy --prod --yes"
