import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function findRepoRoot(startDir) {
  let current = startDir;
  for (let i = 0; i < 6; i += 1) {
    if (fs.existsSync(path.join(current, "docs", "fixtures.json"))) return current;
    current = path.resolve(current, "..");
  }
  throw new Error("Could not resolve repo root.");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
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

function updateResults(repoRoot, mapping, status, note, evidenceRelPath, ranAt) {
  const resultsPath = resolveResultsPath(repoRoot, mapping.section);
  if (!resultsPath) return;
  const payload = readJson(resultsPath);
  const gitSha = getGitSha(repoRoot);
  for (const specId of mapping.specIds) {
    const current = payload.results.find((entry) => entry.id === specId);
    if (!current) continue;
    const history = Array.isArray(current.history) ? current.history : [];
    if (current?.lastRun?.ranAt) {
      history.unshift({
        ranAt: current.lastRun.ranAt,
        status: current.status || "pending",
        runner: current.lastRun.runner || payload.runner || "manual"
      });
    }
    current.history = history.slice(0, 5);
    current.status = status;
    current.notes = note;
    current.lastRun = {
      ranAt,
      runner: "contract",
      environment: { gitSha },
      evidence: [{ type: "forge-output", path: evidenceRelPath }]
    };
  }
  payload.lastRun = ranAt;
  payload.runner = "contract";
  writeJson(resultsPath, payload);
}

function main() {
  const contractRoot = process.cwd();
  const repoRoot = findRepoRoot(contractRoot);
  const map = readJson(path.join(contractRoot, "contract-spec-map.json"));
  const mappings = map.mappings || [];

  const ranAt = new Date().toISOString();
  const stamp = ranAt.replace(/[:.]/g, "-");
  const evidenceDir = path.join(repoRoot, "docs", "evidence", "contracts");
  ensureDir(evidenceDir);
  const evidencePath = path.join(evidenceDir, `forge-${stamp}.json`);
  const evidenceRelPath = path.relative(repoRoot, evidencePath);

  const run = spawnSync("forge", ["test", "--json"], { cwd: contractRoot, encoding: "utf8" });
  fs.writeFileSync(
    evidencePath,
    JSON.stringify(
      {
        status: run.status,
        stdout: run.stdout || "",
        stderr: run.stderr || ""
      },
      null,
      2
    ),
    "utf8"
  );

  if (run.error && run.error.code === "ENOENT") {
    for (const mapping of mappings) {
      updateResults(repoRoot, mapping, "blocked", `forge CLI missing for ${mapping.suite}`, evidenceRelPath, ranAt);
    }
    console.log("⚠ contract mapper blocked: forge CLI missing");
    return;
  }

  const status = run.status === 0 ? "pass" : "fail";
  for (const mapping of mappings) {
    const note =
      status === "pass"
        ? `forge suite passed: ${mapping.suite}`
        : `forge suite failed or not verifiable: ${mapping.suite} (exit ${run.status ?? "unknown"})`;
    updateResults(repoRoot, mapping, status, note, evidenceRelPath, ranAt);
  }

  if (status === "pass") {
    console.log(`✅ contract mapper: ${mappings.length} suites marked pass`);
  } else {
    console.log(`❌ contract mapper: ${mappings.length} suites marked fail`);
    process.exitCode = 1;
  }
}

main();
