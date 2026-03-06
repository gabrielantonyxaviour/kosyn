/**
 * CRE Bridge — local HTTP server that wraps `cre workflow simulate --broadcast`
 *
 * Run: bun scripts/cre-bridge.ts
 *
 * HTTP trigger workflows receive a JSON body as payload.
 * EVM log trigger workflows (provider-decryption, data-marketplace) require:
 *   { txHash: "0x...", eventIndex: 0 }
 *   — emit the on-chain event first, then pass the tx hash here.
 *
 * Set in frontend/.env.local:
 *   CRE_RECORD_UPLOAD_URL=http://localhost:3100/record-upload
 *   CRE_CONSULTATION_PROCESSING_URL=http://localhost:3100/consultation-processing
 *   CRE_PROVIDER_DECRYPTION_URL=http://localhost:3100/provider-decryption
 *   CRE_PROVIDER_REGISTRATION_URL=http://localhost:3100/provider-registration
 *   CRE_PAYMENT_MINT_URL=http://localhost:3100/payment-mint
 *   CRE_DATA_MARKETPLACE_URL=http://localhost:3100/data-marketplace
 *   CRE_PATIENT_AI_ATTEST_URL=http://localhost:3100/patient-ai-attest
 */

import { spawn } from "child_process";
import path from "path";

const PORT = 3100;
const WORKFLOWS_DIR = path.join(import.meta.dir, "..", "workflows");

const ROUTE_TO_WORKFLOW: Record<string, string> = {
  "/record-upload": "record-upload",
  "/consultation-processing": "consultation-processing",
  "/provider-decryption": "provider-decryption",
  "/provider-registration": "provider-registration",
  "/payment-mint": "payment-mint",
  "/data-marketplace": "data-marketplace",
  "/patient-ai-attest": "patient-ai-attest",
};

// Workflows triggered by EVM log events (not HTTP)
const EVM_LOG_TRIGGER_WORKFLOWS = new Set([
  "provider-decryption",
  "data-marketplace",
]);

function log(msg: string) {
  console.log(`[cre-bridge] ${msg}`);
}

async function runHttpWorkflow(
  workflowName: string,
  payload: string,
): Promise<{
  success: boolean;
  txHash?: string;
  logs: string;
  error?: string;
  data?: Record<string, string>;
}> {
  return new Promise((resolve) => {
    log(`[HTTP] Simulating ${workflowName}: ${payload.slice(0, 120)}...`);

    const proc = spawn(
      "cre",
      [
        "workflow",
        "simulate",
        workflowName,
        "--target",
        "staging-settings",
        "--broadcast",
        "--trigger-index",
        "0",
        "--http-payload",
        payload,
        "--non-interactive",
      ],
      { cwd: WORKFLOWS_DIR, env: { ...process.env }, timeout: 120_000 },
    );

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      const t = chunk.toString();
      stdout += t;
      process.stdout.write(`  ${t}`);
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      const t = chunk.toString();
      stderr += t;
      process.stderr.write(`  ${t}`);
    });

    proc.on("close", (code) => {
      const output = stdout + stderr;
      const txHashMatch = output.match(/TX:\s*(0x[a-fA-F0-9]{64})/);
      const ipfsCidMatch = output.match(/IPFS.*?:\s*(Qm[a-zA-Z0-9]+)/);

      if (code !== 0) {
        log(`${workflowName} exited with code ${code}`);
        resolve({
          success: false,
          error: `cre workflow simulate exited with code ${code}`,
          logs: output,
        });
        return;
      }

      log(`${workflowName} done. TX: ${txHashMatch?.[1] ?? "none"}`);
      resolve({
        success: true,
        txHash: txHashMatch?.[1],
        logs: output,
        ...(ipfsCidMatch?.[1] ? { data: { ipfsCid: ipfsCidMatch[1] } } : {}),
      });
    });

    proc.on("error", (err) =>
      resolve({ success: false, error: err.message, logs: stderr }),
    );
  });
}

async function runEvmLogWorkflow(
  workflowName: string,
  txHash: string,
  eventIndex: number,
): Promise<{
  success: boolean;
  txHash?: string;
  logs: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    log(
      `[EVM LOG] Simulating ${workflowName} from tx ${txHash} event[${eventIndex}]`,
    );

    const proc = spawn(
      "cre",
      [
        "workflow",
        "simulate",
        workflowName,
        "--target",
        "staging-settings",
        "--broadcast",
        "--trigger-index",
        "0",
        "--evm-tx-hash",
        txHash,
        "--evm-event-index",
        String(eventIndex),
        "--non-interactive",
      ],
      { cwd: WORKFLOWS_DIR, env: { ...process.env }, timeout: 120_000 },
    );

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      const t = chunk.toString();
      stdout += t;
      process.stdout.write(`  ${t}`);
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      const t = chunk.toString();
      stderr += t;
      process.stderr.write(`  ${t}`);
    });

    proc.on("close", (code) => {
      const output = stdout + stderr;
      const resultTxMatch = output.match(/TX:\s*(0x[a-fA-F0-9]{64})/);

      if (code !== 0) {
        log(`${workflowName} exited with code ${code}`);
        resolve({
          success: false,
          error: `cre workflow simulate exited with code ${code}`,
          logs: output,
        });
        return;
      }

      log(`${workflowName} done. TX: ${resultTxMatch?.[1] ?? "none"}`);
      resolve({ success: true, txHash: resultTxMatch?.[1], logs: output });
    });

    proc.on("error", (err) =>
      resolve({ success: false, error: err.message, logs: stderr }),
    );
  });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/health") {
      return Response.json({
        ok: true,
        workflows: Object.keys(ROUTE_TO_WORKFLOW),
      });
    }

    if (req.method !== "POST") {
      return Response.json({ error: "POST only" }, { status: 405 });
    }

    const workflowName = ROUTE_TO_WORKFLOW[url.pathname];
    if (!workflowName) {
      return Response.json(
        { error: `Unknown workflow route: ${url.pathname}` },
        { status: 404 },
      );
    }

    let rawBody: Record<string, unknown>;
    try {
      rawBody = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    let result: {
      success: boolean;
      txHash?: string;
      logs: string;
      error?: string;
      data?: Record<string, string>;
    };

    if (EVM_LOG_TRIGGER_WORKFLOWS.has(workflowName)) {
      // EVM log trigger — expects { txHash, eventIndex }
      const { txHash, eventIndex = 0 } = rawBody as {
        txHash?: string;
        eventIndex?: number;
      };
      if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return Response.json(
          {
            error: `${workflowName} uses an EVM log trigger. Send { txHash: "0x...", eventIndex: 0 } — emit the on-chain event first, then pass the tx hash.`,
          },
          { status: 400 },
        );
      }
      result = await runEvmLogWorkflow(
        workflowName,
        txHash,
        Number(eventIndex),
      );
    } else {
      // HTTP trigger — pass body as payload
      result = await runHttpWorkflow(workflowName, JSON.stringify(rawBody));
    }

    return Response.json(result, { status: result.success ? 200 : 500 });
  },
});

log(`Listening on http://localhost:${PORT}`);
log(`Workflows dir: ${WORKFLOWS_DIR}`);
log("");
log("HTTP trigger routes (send any JSON payload):");
for (const [route, name] of Object.entries(ROUTE_TO_WORKFLOW)) {
  if (!EVM_LOG_TRIGGER_WORKFLOWS.has(name)) {
    log(`  POST http://localhost:${PORT}${route}`);
  }
}
log("");
log("EVM log trigger routes (send { txHash, eventIndex }):");
for (const name of EVM_LOG_TRIGGER_WORKFLOWS) {
  log(`  POST http://localhost:${PORT}/${name}`);
}
