"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { stripFrontmatter, loadRuleset, resolveSkillPath } = require("../scripts/inject-context.js");

test("stripFrontmatter removes the YAML block and leaves the body", () => {
  const input = "---\nname: x\ndescription: y\n---\n# Title\n\nBody text.\n";
  assert.equal(stripFrontmatter(input), "# Title\n\nBody text.");
});

test("stripFrontmatter is a no-op when there is no frontmatter", () => {
  const input = "# Just a title\n\nNo frontmatter here.";
  assert.equal(stripFrontmatter(input), input);
});

test("stripFrontmatter handles frontmatter with no trailing newline after the closing ---", () => {
  const input = "---\nname: x\n---";
  assert.equal(stripFrontmatter(input), "");
});

test("loadRuleset reads a file and strips its frontmatter", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "in-lane-test-"));
  const skillPath = path.join(tmpDir, "SKILL.md");
  fs.writeFileSync(skillPath, "---\nname: in-lane\n---\n# in-lane\n\nThe rule.\n");

  assert.equal(loadRuleset(skillPath), "# in-lane\n\nThe rule.");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("resolveSkillPath uses CLAUDE_PLUGIN_ROOT when set", () => {
  const original = process.env.CLAUDE_PLUGIN_ROOT;
  process.env.CLAUDE_PLUGIN_ROOT = "/some/plugin/root";

  assert.equal(
    resolveSkillPath(),
    path.join("/some/plugin/root", "skills", "in-lane", "SKILL.md")
  );

  if (original === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = original;
});

test("resolveSkillPath falls back to the script's own directory when unset", () => {
  const original = process.env.CLAUDE_PLUGIN_ROOT;
  delete process.env.CLAUDE_PLUGIN_ROOT;

  const resolved = resolveSkillPath();
  assert.ok(resolved.endsWith(path.join("skills", "in-lane", "SKILL.md")));
  // Should resolve to the real repo's SKILL.md, since __dirname is scripts/.
  assert.ok(fs.existsSync(resolved), `expected ${resolved} to exist`);

  if (original !== undefined) process.env.CLAUDE_PLUGIN_ROOT = original;
});

test("running the script end to end prints valid SessionStart hookSpecificOutput JSON", () => {
  const scriptPath = path.join(__dirname, "..", "scripts", "inject-context.js");

  const stdout = execFileSync("node", [scriptPath], {
    input: JSON.stringify({ session_id: "test", hook_event_name: "SessionStart" }),
    encoding: "utf-8",
  });

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.hookSpecificOutput.hookEventName, "SessionStart");
  assert.ok(typeof parsed.hookSpecificOutput.additionalContext === "string");
  assert.ok(parsed.hookSpecificOutput.additionalContext.includes("in-lane"));
  assert.ok(!parsed.hookSpecificOutput.additionalContext.startsWith("---"));
});

test("running the script with no stdin at all still succeeds", () => {
  const scriptPath = path.join(__dirname, "..", "scripts", "inject-context.js");

  const stdout = execFileSync("node", [scriptPath], {
    input: "",
    encoding: "utf-8",
  });

  const parsed = JSON.parse(stdout);
  assert.ok(parsed.hookSpecificOutput.additionalContext.length > 0);
});

test("the script exits 0 and reports an error to stderr, not stdout, when the skill file is missing", () => {
  const scriptPath = path.join(__dirname, "..", "scripts", "inject-context.js");

  const result = require("node:child_process").spawnSync("node", [scriptPath], {
    input: "{}",
    encoding: "utf-8",
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: "/nonexistent/plugin/root" },
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /in-lane: could not load ruleset/);
});
