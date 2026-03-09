import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function findRepoRoot(startDir) {
  let current = startDir;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(current, "docs", "fixtures.json"))) return current;
    current = path.resolve(current, "..");
  }
  throw new Error("Could not find repo root");
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, v) {
  fs.writeFileSync(p, JSON.stringify(v, null, 2), "utf8");
}

function getGitSha(repoRoot) {
  const out = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  return out.status === 0 ? out.stdout.trim() : "";
}

function resolveResultsPath(repoRoot, section) {
  // Section may be "kosyn-ai/frontend-core" (full path) or just "frontend-core"
  const docsRoot = path.join(repoRoot, "docs");

  // Try direct path first (section includes namespace)
  const directPath = path.join(docsRoot, section, "results.json");
  if (fs.existsSync(directPath)) return directPath;

  // Fall back to searching namespace dirs
  for (const entry of fs.readdirSync(docsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (["scripts", "plan", "audit", "evidence", "fixtures"].includes(entry.name)) continue;
    const rp = path.join(docsRoot, entry.name, section, "results.json");
    if (fs.existsSync(rp)) return rp;
  }
  return null;
}

function main() {
  const frontendDir = process.cwd();
  const repoRoot = findRepoRoot(frontendDir);
  const reportPath = path.join(frontendDir, "e2e", "results", "report.json");

  if (!fs.existsSync(reportPath)) {
    console.log("No Playwright report found at", reportPath);
    process.exit(1);
  }

  const report = readJson(reportPath);
  const gitSha = getGitSha(repoRoot);
  const ranAt = new Date().toISOString();

  // Parse spec comments from test files to build spec-to-section mapping
  const specMap = []; // { specIds: string[], section: string, file: string }
  const e2eDir = path.join(frontendDir, "e2e");
  for (const file of fs.readdirSync(e2eDir)) {
    if (!file.endsWith(".spec.ts")) continue;
    const content = fs.readFileSync(path.join(e2eDir, file), "utf8");
    const specMatch = content.match(/\/\/\s*spec:\s*(.+)/);
    const sectionMatch = content.match(/\/\/\s*section:\s*(.+)/);
    if (specMatch && sectionMatch) {
      const specIds = specMatch[1].split(",").map((s) => s.trim());
      const sections = sectionMatch[1].split(",").map((s) => s.trim());
      specMap.push({ specIds, sections, file });
    }
  }

  // Check if all Playwright suites passed
  const allSuitesPassed = report.suites.every((suite) =>
    suite.specs.every((spec) => spec.ok === true)
  );

  // Update results for each spec mapping
  for (const mapping of specMap) {
    // Find corresponding suite
    const suite = report.suites.find((s) => s.file === mapping.file);
    const suitePassed = suite
      ? suite.specs.every((spec) => spec.ok === true)
      : false;

    const status = suitePassed ? "pass" : "fail";
    const notes = suitePassed
      ? `All Playwright tests in ${mapping.file} passed`
      : `Some Playwright tests in ${mapping.file} failed`;

    for (const section of mapping.sections) {
      const resultsPath = resolveResultsPath(repoRoot, section);
      if (!resultsPath) {
        console.log(`No results.json found for section ${section}`);
        continue;
      }

      const payload = readJson(resultsPath);
      for (const specId of mapping.specIds) {
        const current = payload.results.find((r) => r.id === specId);
        if (!current) continue;

        const previous = {
          ranAt: current?.lastRun?.ranAt || null,
          status: current?.status || "pending",
          runner: current?.lastRun?.runner || payload.runner || "manual",
        };
        const history = Array.isArray(current.history) ? current.history : [];
        if (previous.ranAt) history.unshift(previous);
        current.history = history.slice(0, 5);
        current.status = status;
        current.notes = notes;
        current.lastRun = {
          ranAt,
          runner: "btest",
          environment: { gitSha },
          evidence: [
            {
              type: "report",
              path: "frontend/e2e/results/report.json",
            },
          ],
        };
      }
      payload.lastRun = ranAt;
      payload.runner = "btest";
      writeJson(resultsPath, payload);
      console.log(`✅ ${section}: ${mapping.specIds.join(", ")} → ${status}`);
    }
  }

  // Handle K-FE-2 (API tests) — mark as skip if no API test file exists
  const apiSpecFiles = fs.readdirSync(e2eDir).filter((f) => f.includes("api"));
  if (apiSpecFiles.length === 0) {
    const resultsPath = resolveResultsPath(repoRoot, "frontend-core");
    if (resultsPath) {
      const payload = readJson(resultsPath);
      const fe2 = payload.results.find((r) => r.id === "K-FE-2");
      if (fe2 && fe2.status === "pending") {
        fe2.status = "skip";
        fe2.notes = "No API test spec file exists yet; browser-only coverage";
        fe2.lastRun = { ranAt, runner: "btest", environment: { gitSha }, evidence: [] };
        const history = Array.isArray(fe2.history) ? fe2.history : [];
        fe2.history = history.slice(0, 5);
        payload.lastRun = ranAt;
        writeJson(resultsPath, payload);
        console.log(`⏭ frontend-core: K-FE-2 → skip (no API test file)`);
      }
    }
  }

  // Handle remaining pending specs in patients-records and payments-webhooks
  for (const section of ["patients-records", "payments-webhooks"]) {
    const resultsPath = resolveResultsPath(repoRoot, section);
    if (!resultsPath) continue;
    const payload = readJson(resultsPath);
    for (const result of payload.results) {
      if (result.status === "pending") {
        result.status = "skip";
        result.notes = "No Playwright spec covers this test yet";
        result.lastRun = { ranAt, runner: "btest", environment: { gitSha }, evidence: [] };
      }
    }
    payload.lastRun = ranAt;
    writeJson(resultsPath, payload);
  }
}

main();
