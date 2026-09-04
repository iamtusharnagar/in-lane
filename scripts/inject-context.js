#!/usr/bin/env node
"use strict";

/**
 * SessionStart hook: reads in-lane's ruleset from SKILL.md and returns it as
 * hookSpecificOutput.additionalContext, so it lands in context every session
 * whether or not the model would have chosen to invoke the skill on its own.
 *
 * This exists because of a documented finding (see README.md#why-a-hook):
 * shipping only a SKILL.md and letting the model decide when to use it
 * measured zero self-activations across ten sessions in a real benchmark of
 * a comparable plugin. A SessionStart hook that force-injects the ruleset is
 * the one install path that's actually been shown to produce any effect.
 *
 * Reads stdin (SessionStart's JSON input) but doesn't need any field from
 * it -- the ruleset is the same every session regardless of how it started.
 * Reading and discarding it, rather than ignoring stdin outright, avoids
 * leaving the pipe open if Claude Code is waiting on it to close.
 */

const fs = require("fs");
const path = require("path");

function readStdin() {
  try {
    fs.readFileSync(0, "utf-8");
  } catch {
    // No stdin, or nothing on it -- fine, SessionStart's input has nothing
    // this hook needs anyway.
  }
}

function stripFrontmatter(text) {
  const match = text.match(/^---\n[\s\S]*?\n---\n?/);
  return (match ? text.slice(match[0].length) : text).trim();
}

function loadRuleset(skillPath) {
  const raw = fs.readFileSync(skillPath, "utf-8");
  return stripFrontmatter(raw);
}

function resolveSkillPath() {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, "..");
  return path.join(pluginRoot, "skills", "in-lane", "SKILL.md");
}

function main() {
  readStdin();

  let ruleset;
  try {
    ruleset = loadRuleset(resolveSkillPath());
  } catch (error) {
    // Fail quiet, not loud: a SessionStart hook that errors shows the user
    // a "<hook name> hook error" notice but never blocks the session (see
    // the exit-code-2 table in Claude Code's hooks reference -- SessionStart
    // can't block). Missing content shouldn't be treated as a blocking
    // failure; it should just mean no context gets injected this session.
    process.stderr.write(`in-lane: could not load ruleset: ${error.message}\n`);
    process.exit(0);
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: ruleset,
      },
    })
  );
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { stripFrontmatter, loadRuleset, resolveSkillPath };
