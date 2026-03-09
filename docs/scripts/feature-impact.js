#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const CONFIG = {
  appNamespace: "kosyn-ai",
  frontendDir: "frontend",
  workflowDir: "workflows",
  contractsDir: "contracts",
};

function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: "utf8" });
}

function listChangedFiles(repoRoot) {
  const diff = run("git", ["diff", "--name-only", "HEAD"], repoRoot);
  const lines = (diff.stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 0) return lines;
  const status = run("git", ["status", "--porcelain"], repoRoot);
  return (status.stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findSpecFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findSpecFiles(full));
    if (entry.isFile() && entry.name === "spec.json") out.push(full);
  }
  return out;
}

function routeOrPageTokens(value) {
  return String(value)
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !s.startsWith("["))
    .map((s) => s.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase());
}

function shouldImpactByFile(filePath, spec) {
  const normalizedFile = filePath.toLowerCase();
  if (
    normalizedFile.includes(`${CONFIG.workflowDir}/`) &&
    spec.section.includes("cre")
  )
    return true;
  if (
    normalizedFile.includes(`${CONFIG.contractsDir}/`) &&
    spec.section.includes("contracts")
  )
    return true;
  if (
    normalizedFile.includes(`${CONFIG.frontendDir}/e2e/`) &&
    spec.tests.some((t) => t.mode === "browser" || t.mode === "hybrid")
  )
    return true;

  for (const test of spec.tests || []) {
    for (const page of test.pages || []) {
      const tokens = routeOrPageTokens(page);
      if (tokens.some((t) => t && normalizedFile.includes(t))) return true;
    }
    for (const route of test.routes || []) {
      const tokens = routeOrPageTokens(route);
      if (tokens.some((t) => t && normalizedFile.includes(t))) return true;
    }
  }
  return false;
}

function sectionModes(spec) {
  const modes = new Set((spec.tests || []).map((t) => t.mode));
  return {
    hasBrowser: modes.has("browser") || modes.has("hybrid"),
    hasApi: modes.has("api") || modes.has("hybrid"),
    hasCre: spec.section.includes("cre"),
    hasContracts: spec.section.includes("contracts"),
  };
}

function execChecked(command, args, cwd) {
  const res = run(command, args, cwd);
  process.stdout.write(res.stdout || "");
  process.stderr.write(res.stderr || "");
  return res.status === 0;
}

function main() {
  const args = process.argv.slice(2);
  const shouldRun = args.includes("--run");
  const repoRoot = process.cwd();
  const specsRoot = path.join(repoRoot, "docs", CONFIG.appNamespace);
  const changedFiles = listChangedFiles(repoRoot);
  const specFiles = findSpecFiles(specsRoot);
  const specs = specFiles.map((file) => readJson(file));

  const impacted = [];
  for (const spec of specs) {
    const matchedBy = changedFiles.filter((file) =>
      shouldImpactByFile(file, spec),
    );
    if (matchedBy.length > 0)
      impacted.push({ spec, matchedBy, modes: sectionModes(spec) });
  }

  const payload = {
    changedFiles,
    impactedSections: impacted.map((entry) => ({
      section: entry.spec.section,
      title: entry.spec.title,
      matchedBy: entry.matchedBy,
      modes: entry.modes,
    })),
  };

  console.log(JSON.stringify(payload, null, 2));
  if (!shouldRun) return;

  let ok = true;
  const runBrowser = impacted.some((entry) => entry.modes.hasBrowser);
  const runCre = impacted.some((entry) => entry.modes.hasCre);
  const runContracts = impacted.some((entry) => entry.modes.hasContracts);

  if (runBrowser) {
    console.log("\nRunning impacted browser tests...");
    ok =
      execChecked(
        "npm",
        ["run", "test:e2e"],
        path.join(repoRoot, CONFIG.frontendDir),
      ) && ok;
  }
  if (runCre) {
    console.log("\nRunning impacted CRE simulations...");
    ok =
      execChecked(
        "node",
        ["scripts/run-ctest.mjs"],
        path.join(repoRoot, CONFIG.workflowDir),
      ) && ok;
  }
  if (runContracts) {
    console.log("\nRunning impacted contract mapper...");
    ok =
      execChecked(
        "node",
        ["scripts/run-contract-tests.mjs"],
        path.join(repoRoot, CONFIG.contractsDir),
      ) && ok;
  }

  console.log("\nRegenerating docs...");
  ok = execChecked("node", ["docs/scripts/generate-docs.js"], repoRoot) && ok;
  if (!ok) process.exitCode = 1;
}

main();
