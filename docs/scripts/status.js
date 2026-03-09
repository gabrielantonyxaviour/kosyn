#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const DOCS_ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

function getFlag(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : true;
}

const filterApp = getFlag("--app");
const filterSection = getFlag("--section");
const filterMode = getFlag("--mode");
const filterPriority = getFlag("--priority");
const onlyFailures = args.includes("--failures");
const onlyBlocked = args.includes("--blocked");
const onlyPending = args.includes("--pending");
const staleDays = getFlag("--stale") ? Number(getFlag("--stale")) : null;
const human = args.includes("--human");

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

function isStale(isoTime, days) {
  if (!isoTime) return true;
  return new Date(isoTime).getTime() < Date.now() - days * 24 * 60 * 60 * 1000;
}

function scopedTests(spec) {
  return (spec.tests || []).filter((test) => {
    if (filterMode && test.mode !== filterMode) return false;
    if (filterPriority && test.priority !== filterPriority) return false;
    return true;
  });
}

function summarize(spec, results) {
  const tests = scopedTests(spec);
  if (results?.sectionSkip) {
    return {
      pass: 0,
      fail: 0,
      skip: tests.length,
      blocked: 0,
      pending: 0,
      total: tests.length,
    };
  }

  const byId = new Map(
    (results?.results || []).map((entry) => [entry.id, entry]),
  );
  let pass = 0;
  let fail = 0;
  let skip = 0;
  let blocked = 0;
  let pending = 0;
  for (const test of tests) {
    const status = byId.get(test.id)?.status || "pending";
    if (status === "pass") pass += 1;
    else if (status === "fail") fail += 1;
    else if (status === "skip") skip += 1;
    else if (status === "blocked") blocked += 1;
    else pending += 1;
  }
  return { pass, fail, skip, blocked, pending, total: tests.length };
}

function failingTests(spec, results) {
  const byId = new Map(
    (results?.results || []).map((entry) => [entry.id, entry]),
  );
  return scopedTests(spec)
    .filter((test) => byId.get(test.id)?.status === "fail")
    .map((test) => ({
      id: test.id,
      title: test.title,
      notes: byId.get(test.id)?.notes || "",
      routes: test.routes || [],
      pages: test.pages || [],
      tables: test.tables || [],
    }));
}

function main() {
  const sections = [];
  for (const specPath of findJsonFiles(DOCS_ROOT, "spec.json")) {
    const spec = readJson(specPath);
    if (!spec) continue;
    if (filterApp && spec.app !== filterApp) continue;
    if (filterSection && spec.section !== filterSection) continue;

    const resultsPath = path.join(path.dirname(specPath), "results.json");
    const results = fs.existsSync(resultsPath) ? readJson(resultsPath) : null;
    if (staleDays && !isStale(results?.lastRun, staleDays)) continue;

    const stats = summarize(spec, results);
    if (onlyFailures && stats.fail === 0) continue;
    if (onlyBlocked && stats.blocked === 0) continue;
    if (onlyPending && stats.pending === 0) continue;

    sections.push({
      app: spec.app,
      section: spec.section,
      title: spec.title,
      executionOrder: spec.executionOrder ?? 999,
      sectionDependsOn: spec.sectionDependsOn || [],
      path: path.relative(DOCS_ROOT, path.dirname(specPath)),
      lastRun: results?.lastRun || null,
      runner: results?.runner || null,
      failingTests: failingTests(spec, results),
      ...stats,
    });
  }

  sections.sort(
    (a, b) =>
      a.executionOrder - b.executionOrder || a.section.localeCompare(b.section),
  );
  const summary = sections.reduce(
    (acc, section) => ({
      pass: acc.pass + section.pass,
      fail: acc.fail + section.fail,
      skip: acc.skip + section.skip,
      blocked: acc.blocked + section.blocked,
      pending: acc.pending + section.pending,
      total: acc.total + section.total,
    }),
    { pass: 0, fail: 0, skip: 0, blocked: 0, pending: 0, total: 0 },
  );

  const output = {
    generatedAt: new Date().toISOString(),
    filters: {
      app: filterApp || null,
      section: filterSection || null,
      mode: filterMode || null,
      priority: filterPriority || null,
    },
    sections,
    summary: {
      ...summary,
      allPass:
        summary.fail === 0 &&
        summary.pending === 0 &&
        summary.blocked === 0 &&
        summary.total > 0,
    },
  };

  if (!human) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log("\nTest Status — kosyn-ai");
  console.log("=======================");
  for (const section of sections) {
    const state =
      section.fail > 0
        ? "FAIL"
        : section.blocked > 0
          ? "BLOCKED"
          : section.pending > 0
            ? "PENDING"
            : "PASS";
    console.log(
      `${String(section.executionOrder).padStart(2, "0")} ${section.section.padEnd(22)} ${state.padEnd(8)} ${section.pass}/${section.total} (fail:${section.fail} blocked:${section.blocked} pending:${section.pending})`,
    );
    for (const failure of section.failingTests) {
      console.log(`   - ${failure.id}: ${failure.title}`);
    }
  }
  console.log("\nSummary");
  console.log("-------");
  console.log(`Total:   ${output.summary.total}`);
  console.log(`Pass:    ${output.summary.pass}`);
  console.log(`Fail:    ${output.summary.fail}`);
  console.log(`Blocked: ${output.summary.blocked}`);
  console.log(`Pending: ${output.summary.pending}`);
}

main();
