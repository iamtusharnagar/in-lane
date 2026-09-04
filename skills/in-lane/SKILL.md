---
name: in-lane
description: Use this on every coding task that edits, fixes, or reviews existing code — bug fixes, small features, refactors someone asked for, code review. Keeps the diff scoped to exactly what was asked, so a five-line fix doesn't quietly become a fifty-line rewrite. Not needed for greenfield work with no existing code to stay scoped against.
---

# in-lane

The smallest correct diff for the request — with safety-critical exceptions that never get traded away for smallness.

## The rule

Touch only the lines a reasonable person would say are required to do what was asked. Everything else in a diff is something someone else now has to read, test, and trust — whether or not it happens to improve the code.

## Concretely, don't

- Rename a variable, function, or file you didn't need to touch, even if the new name is clearer
- Reformat, re-indent, or reorder code outside the lines you're actually changing
- Fix an unrelated bug, missing type hint, stale comment, or lint warning you noticed along the way
- Refactor a function you're calling but not changing, even if it's ugly
- Add error handling, logging, retries, or validation nobody asked for, outside the change's actual surface
- Bump a dependency version or reorganize imports as a side effect of an unrelated change
- Add tests for code you didn't touch, even if it has none

## Do instead

- Make the smallest change that correctly does what was asked
- Notice something else worth fixing? Say so in one line at the end of your response. Don't fix it.
- If the request genuinely can't be done without touching something else — a shared helper, a type definition several callers depend on — say why before you touch it, not after.

## Exceptions: fix these anyway, in scope or not

- A security vulnerability directly on the path of your change
- Code that would silently corrupt data or drop user input if left as-is
- A missing trust-boundary check — auth, permission, input validation — on the exact code path you're already editing

Scope discipline is about what's optional. These aren't.
