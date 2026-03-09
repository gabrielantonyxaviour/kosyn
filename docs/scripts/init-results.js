#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const DOCS_ROOT = path.resolve(__dirname, "..");

function findJsonFiles(dir, name) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      entry.name !== "scripts"
    ) {
      out.push(...findJsonFiles(full, name));
    } else if (entry.isFile() && entry.name === name) {
      out.push(full);
    }
  }
  return out;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function upgradeResult(entry) {
  if (!entry) return null;
  const upgraded = {
    id: entry.id,
    status: entry.status || "pending",
    notes: entry.notes || "",
  };
  if (entry.runAt && !entry.lastRun)
    upgraded.lastRun = { ranAt: entry.runAt, runner: "manual" };
  else if (entry.lastRun) upgraded.lastRun = entry.lastRun;
  if (entry.history) upgraded.history = entry.history;
  return upgraded;
}

function main() {
  let created = 0;
  let upgraded = 0;

  for (const specPath of findJsonFiles(DOCS_ROOT, "spec.json")) {
    const spec = readJson(specPath);
    if (!spec) continue;
    const dir = path.dirname(specPath);
    const resultsPath = path.join(dir, "results.json");

    if (!fs.existsSync(resultsPath)) {
      const fresh = {
        app: spec.app,
        section: spec.section,
        lastRun: null,
        runner: "manual",
        results: (spec.tests || []).map((test) => ({
          id: test.id,
          status: "pending",
          notes: "",
        })),
      };
      fs.writeFileSync(resultsPath, JSON.stringify(fresh, null, 2), "utf8");
      created += 1;
      continue;
    }

    const existing = readJson(resultsPath);
    if (!existing) continue;
    const byId = new Map(
      (existing.results || []).map((entry) => [entry.id, entry]),
    );
    const merged = (spec.tests || []).map((test) => {
      const current = byId.get(test.id);
      return current
        ? upgradeResult(current)
        : { id: test.id, status: "pending", notes: "" };
    });

    const changed =
      JSON.stringify(existing.results || []) !== JSON.stringify(merged);
    if (changed) {
      const next = {
        ...existing,
        app: spec.app,
        section: spec.section,
        results: merged,
      };
      fs.writeFileSync(resultsPath, JSON.stringify(next, null, 2), "utf8");
      upgraded += 1;
    }
  }

  console.log(`Created: ${created}, Upgraded: ${upgraded}`);
}

main();
