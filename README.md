# in-lane

Keeps every code change scoped to exactly what was asked, with safety-critical
exceptions that are never traded away for a smaller diff.

## Install (Claude Code)

```
/plugin marketplace add tusharnagar2002/in-lane
/plugin install in-lane@in-lane
```

(Two separate prompts — Claude Code needs the marketplace added before it can
see the plugin to install.)

## What it actually does

A `SessionStart` hook reads the ruleset from `skills/in-lane/SKILL.md` and
injects it into context at the start of every session — not something you
have to remember to invoke.

## Why a hook, not just a skill

A skill that just sits there, waiting for the model to decide it's relevant,
is the obvious way to ship this — and it doesn't work. A real benchmark of a
comparable plugin found that installing it as a plain `SKILL.md` and letting
the model decide when to use it produced **zero self-activations across ten
sessions**, even though the skill's own description said to use it on every
coding task ([JetBrains AI blog, July 2026][benchmark]). It only measured any
effect once it ran as a plugin with a `SessionStart` hook forcing the ruleset
into context regardless of the model's own judgment about whether to reach
for it.

`in-lane` follows the same install shape for the same reason: the hook is the
part that's actually been shown to do anything.

[benchmark]: https://blog.jetbrains.com/ai/2026/07/ponytail-skill-claude-tested/

## The rule

Touch only the lines a reasonable person would say are required to do what
was asked. Don't rename things you didn't need to touch, don't fix unrelated
bugs you noticed along the way, don't refactor a function you're calling but
not changing, don't add validation or tests nobody asked for. Notice
something worth fixing outside scope? Say so in one line. Don't fix it.

Three things are never in scope for "smaller is better," on purpose: a
security vulnerability on the path of your change, code that would silently
corrupt data or drop input, and a missing trust-boundary check on the exact
line you're already editing. Full text in
[`skills/in-lane/SKILL.md`](skills/in-lane/SKILL.md).

## What's verified, and what isn't

Honestly, since this matters for something that changes how an agent
behaves:

**Verified for real:**
- `claude plugin validate . --strict` — the actual Claude Code CLI, not a
  guess at the schema — passes clean, in both marketplace mode and as a
  standalone plugin (checked separately; marketplace-mode validation alone
  doesn't inspect the plugin's own `hooks.json` or skill frontmatter, so both
  paths run in CI).
- The validator was confirmed to actually inspect file contents, not just
  parse JSON: an invalid hook type was deliberately introduced during
  development and correctly flagged before being reverted.
- The hook script (`scripts/inject-context.js`) is tested end-to-end by
  actually running it as a subprocess with real stdin and checking its real
  stdout — 9 tests, including the missing-file error path and the
  no-`CLAUDE_PLUGIN_ROOT` fallback.

**Not verified:**
- An actual interactive Claude Code session actually installing this plugin
  and firing the hook. This sandbox has no authenticated Claude Code session
  available, so that step couldn't be run here. If you install this and the
  ruleset doesn't show up in a fresh session, that's the thing to report —
  open an issue.

## Repository structure

```
.claude-plugin/
  plugin.json        # plugin manifest
  marketplace.json    # lets /plugin marketplace add find this repo
skills/in-lane/
  SKILL.md            # the ruleset itself, single source of truth
hooks/
  hooks.json          # SessionStart hook config
scripts/
  inject-context.js   # reads SKILL.md, strips frontmatter, emits it as context
tests/
  inject-context.test.js
```

## Contributing

```bash
git clone https://github.com/tusharnagar2002/in-lane.git
cd in-lane
npm test                          # hook script's own tests
claude plugin validate . --strict # real schema validation
```

## License

MIT
