import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function parseArgs(argv) {
  const out = { workflow: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--workflow" && argv[i + 1]) out.workflow = argv[i + 1];
  }
  return out;
}

function findRepoRoot(startDir) {
  let current = startDir;
  for (let i = 0; i < 6; i += 1) {
    const fixturePath = path.join(current, "docs", "fixtures.json");
    if (fs.existsSync(fixturePath)) return current;
    current = path.resolve(current, "..");
  }
  throw new Error("Could not resolve repo root (docs/fixtures.json missing).");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function resolveResultsPath(repoRoot, section) {
  const docsRoot = path.join(repoRoot, "docs");
  const candidates = fs.readdirSync(docsRoot, { withFileTypes: true });
  for (const entry of candidates) {
    if (!entry.isDirectory()) continue;
    if (["scripts", "plan", "audit", "evidence", "fixtures"].includes(entry.name)) continue;
    const resultPath = path.join(docsRoot, entry.name, section, "results.json");
    if (fs.existsSync(resultPath)) return resultPath;
  }
  return null;
}

function getGitSha(repoRoot) {
  const out = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  return out.status === 0 ? out.stdout.trim() : "";
}

function updateSpecResults(repoRoot, section, specIds, status, notes, evidenceRelPath, ranAt) {
  const resultsPath = resolveResultsPath(repoRoot, section);
  if (!resultsPath) return;

  const payload = readJson(resultsPath);
  const gitSha = getGitSha(repoRoot);
  for (const specId of specIds) {
    const current = payload.results.find((entry) => entry.id === specId);
    if (!current) continue;
    const previous = {
      ranAt: current?.lastRun?.ranAt || null,
      status: current?.status || "pending",
      runner: current?.lastRun?.runner || payload.runner || "manual"
    };
    const history = Array.isArray(current.history) ? current.history : [];
    if (previous.ranAt) history.unshift(previous);
    current.history = history.slice(0, 5);
    current.status = status;
    current.notes = notes;
    current.lastRun = {
      ranAt,
      runner: "ctest",
      environment: {
        gitSha
      },
      evidence: [
        {
          type: "simulate-output",
          path: evidenceRelPath
        }
      ]
    };
  }
  payload.lastRun = ranAt;
  payload.runner = "ctest";
  writeJson(resultsPath, payload);
}

function main() {
  const { workflow } = parseArgs(process.argv.slice(2));
  const workflowRoot = process.cwd();
  const repoRoot = findRepoRoot(workflowRoot);
  const registryPath = path.join(workflowRoot, "cre-flow-registry.json");
  const registry = readJson(registryPath);
  const entries = (registry.workflows || []).filter((entry) => !workflow || entry.workflow === workflow);

  if (entries.length === 0) {
    console.log("No workflows matched requested filters.");
    return;
  }

  const evidenceDir = path.join(repoRoot, "docs", "evidence", "cre");
  ensureDir(evidenceDir);

  const creBin = process.env.CRE_BIN || "cre";
  let failCount = 0;
  let blockedCount = 0;
  let passCount = 0;
  let skipCount = 0;

  for (const entry of entries) {
    if (entry.skip) {
      skipCount += 1;
      const ranAt = new Date().toISOString();
      updateSpecResults(
        repoRoot,
        entry.section,
        entry.specIds,
        "skip",
        entry.skipReason || `Skipped workflow ${entry.workflow}`,
        "",
        ranAt
      );
      console.log(`⏭ ${entry.workflow}: skip (${entry.skipReason || "marked skip in registry"})`);
      continue;
    }
    const payloadPath = path.join(repoRoot, entry.fixture);
    const payload = readJson(payloadPath);
    const ranAt = new Date().toISOString();
    const stamp = ranAt.replace(/[:.]/g, "-");
    const evidencePath = path.join(evidenceDir, `${entry.workflow}-${stamp}.log`);
    const evidenceRelPath = path.relative(repoRoot, evidencePath);

    const run = spawnSync(creBin, ["workflow", "simulate", entry.workflow, "--non-interactive", "--trigger-index", "0", "--http-payload", JSON.stringify(payload)], {
      cwd: workflowRoot,
      encoding: "utf8"
    });

    const logOutput = [
      `workflow=${entry.workflow}`,
      `command=${creBin} workflow simulate ${entry.workflow} --http-payload '<json>'`,
      `status=${run.status}`,
      "",
      "stdout:",
      run.stdout || "",
      "",
      "stderr:",
      run.stderr || ""
    ].join("\n");
    fs.writeFileSync(evidencePath, logOutput, "utf8");

    if (run.error && run.error.code === "ENOENT") {
      blockedCount += 1;
      updateSpecResults(
        repoRoot,
        entry.section,
        entry.specIds,
        "blocked",
        `CRE CLI not found for workflow ${entry.workflow}`,
        evidenceRelPath,
        ranAt
      );
      console.log(`⚠ ${entry.workflow}: blocked (CRE CLI missing)`);
      continue;
    }

    if (run.status === 0) {
      passCount += 1;
      updateSpecResults(
        repoRoot,
        entry.section,
        entry.specIds,
        "pass",
        `CRE simulate passed for ${entry.workflow}`,
        evidenceRelPath,
        ranAt
      );
      console.log(`✅ ${entry.workflow}: pass`);
    } else {
      failCount += 1;
      updateSpecResults(
        repoRoot,
        entry.section,
        entry.specIds,
        "fail",
        `CRE simulate failed for ${entry.workflow} (exit ${run.status ?? "unknown"})`,
        evidenceRelPath,
        ranAt
      );
      console.log(`❌ ${entry.workflow}: fail`);
    }
  }

  console.log(`\nctest summary: pass=${passCount} fail=${failCount} blocked=${blockedCount} skip=${skipCount}`);
  if (failCount > 0) process.exitCode = 1;
}

main();
