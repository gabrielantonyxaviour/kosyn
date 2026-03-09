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
  } catch (error) {
    console.error(`Failed reading ${filePath}: ${error.message}`);
    return null;
  }
}

function modeBadge(mode) {
  return (
    {
      api: "[API]",
      browser: "[BROWSER]",
      hybrid: "[HYBRID]",
      manual: "[MANUAL]",
    }[mode] || ""
  );
}

function priorityBadge(priority) {
  return (
    { smoke: "[SMOKE]", regression: "[REGRESSION]", deep: "[DEEP]" }[
      priority
    ] || ""
  );
}

function testPlanBlock(test) {
  const header =
    `#### ${test.id}: ${test.title} ` +
    [modeBadge(test.mode), priorityBadge(test.priority)]
      .filter(Boolean)
      .map((x) => `\`${x}\``)
      .join(" ");
  const lines = [header.trim(), "", test.description, ""];

  if (Array.isArray(test.dependsOn) && test.dependsOn.length) {
    lines.push(`**Depends on:** ${test.dependsOn.join(", ")}`, "");
  }

  if (Array.isArray(test.preconditions) && test.preconditions.length) {
    lines.push("**Preconditions:**");
    for (const pre of test.preconditions) lines.push(`- ${pre}`);
    lines.push("");
  }

  if (Array.isArray(test.steps) && test.steps.length) {
    lines.push("**Steps:**");
    test.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
    lines.push("");
  }

  lines.push(`**Pass when:** ${test.successCriteria}`);

  const meta = [];
  if (test.routes?.length) meta.push(`Routes: \`${test.routes.join("`, `")}\``);
  if (test.pages?.length) meta.push(`Pages: \`${test.pages.join("`, `")}\``);
  if (test.tables?.length) meta.push(`Tables: \`${test.tables.join("`, `")}\``);
  if (test.fixtures?.length)
    meta.push(`Fixtures: \`${test.fixtures.join("`, `")}\``);
  if (test.roles?.length) meta.push(`Roles: \`${test.roles.join("`, `")}\``);
  if (meta.length) lines.push("", `<small>${meta.join(" | ")}</small>`);

  lines.push("");
  return lines.join("\n");
}

function statusSummary(spec, results) {
  if (results?.sectionSkip) {
    return {
      pass: 0,
      fail: 0,
      skip: spec.tests.length,
      blocked: 0,
      pending: 0,
      total: spec.tests.length,
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
  for (const test of spec.tests || []) {
    const status = byId.get(test.id)?.status || "pending";
    if (status === "pass") pass += 1;
    else if (status === "fail") fail += 1;
    else if (status === "skip") skip += 1;
    else if (status === "blocked") blocked += 1;
    else pending += 1;
  }
  return { pass, fail, skip, blocked, pending, total: spec.tests.length };
}

function rowStatus(summary) {
  if (summary.fail > 0) return `FAIL ${summary.pass}/${summary.total}`;
  if (summary.blocked > 0) return `BLOCKED ${summary.pass}/${summary.total}`;
  if (summary.pending > 0) return `PENDING ${summary.pass}/${summary.total}`;
  return `PASS ${summary.pass}/${summary.total}`;
}

function renderResultsTable(spec, results) {
  const byId = new Map(
    (results.results || []).map((entry) => [entry.id, entry]),
  );
  const rows = (spec.tests || []).map((test) => {
    const entry = byId.get(test.id);
    const ranAt = entry?.lastRun?.ranAt
      ? entry.lastRun.ranAt.substring(0, 10)
      : "";
    const runner = entry?.lastRun?.runner || "";
    const notes =
      entry?.notes || (entry?.status === "skip" ? entry.skipReason || "" : "");
    return `| ${test.id} | ${test.title.replace(/\|/g, "\\|")} | ${entry?.status || "pending"} | ${runner} | ${ranAt} | ${notes.replace(/\|/g, "\\|")} |`;
  });

  return [
    `# ${spec.title} — Results`,
    "",
    `**Last run:** ${results.lastRun || "never"}  `,
    `**Runner:** ${results.runner || "manual"}`,
    "",
    "| ID | Title | Status | Runner | Last Run | Notes |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function main() {
  const specFiles = findJsonFiles(DOCS_ROOT, "spec.json");
  const indexRows = [];

  for (const specPath of specFiles) {
    const dir = path.dirname(specPath);
    const spec = readJson(specPath);
    if (!spec) continue;

    const planLines = [`# ${spec.title}`, ""];
    if (spec.description) planLines.push(spec.description, "");
    planLines.push(`**Execution order:** ${spec.executionOrder}`);
    if (spec.sectionDependsOn?.length) {
      planLines.push(
        `**Section depends on:** ${spec.sectionDependsOn.join(", ")}`,
      );
    }
    planLines.push("", "---", "");
    for (const test of spec.tests || []) {
      planLines.push(testPlanBlock(test));
    }
    fs.writeFileSync(path.join(dir, "plan.md"), planLines.join("\n"), "utf8");

    const resultsPath = path.join(dir, "results.json");
    const results = fs.existsSync(resultsPath) ? readJson(resultsPath) : null;
    if (results) {
      fs.writeFileSync(
        path.join(dir, "results.md"),
        renderResultsTable(spec, results),
        "utf8",
      );
    }

    const summary = statusSummary(spec, results);
    indexRows.push({
      app: spec.app,
      section: spec.section,
      title: spec.title,
      order: spec.executionOrder ?? 999,
      rel: path.relative(DOCS_ROOT, dir),
      ...summary,
    });
  }

  indexRows.sort(
    (a, b) => a.order - b.order || a.section.localeCompare(b.section),
  );
  const lines = [
    "# Convergence Test Index — kosyn-ai",
    "",
    "Generated from `spec.json` and `results.json`.",
    "",
    "| Section | Order | Status | Pass | Fail | Blocked | Pending | Total |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...indexRows.map(
      (row) =>
        `| [${row.section}](${row.rel}/plan.md) | ${row.order} | ${rowStatus(row)} | ${row.pass} | ${row.fail} | ${row.blocked} | ${row.pending} | ${row.total} |`,
    ),
    "",
    "## Commands",
    "",
    "```bash",
    "node docs/scripts/init-results.js",
    "node docs/scripts/generate-docs.js",
    "node docs/scripts/status.js --human",
    "```",
    "",
  ];

  fs.writeFileSync(path.join(DOCS_ROOT, "INDEX.md"), lines.join("\n"), "utf8");
  console.log(`Generated markdown for ${specFiles.length} sections.`);
}

main();
