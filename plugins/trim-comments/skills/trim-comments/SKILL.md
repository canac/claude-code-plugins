---
name: trim-comments
description: Use when comments on the current branch are too verbose — after implementing a feature, before opening a PR, or when the user asks to trim, tighten, or shorten comments.
---

# Trim Comments

`git db --name-only --diff-filter=d; git ls-files --others --exclude-standard` lists the files this branch changed or added. Trim comments in those files only; never open a file the branch didn't touch. Nothing listed, nothing to do.

Judge every comment in each listed file. Its reader has only the code as it stands — never the draft it replaced:

- A comment states the non-obvious WHY. The code already says WHAT.
- An explanatory comment is 1 line. 2 only when 1 cannot carry it. Never 3 — delete it, or move it to the commit message.
- Doc comments or directives state a contract, not an explanation, and have no line cap.
- Must not restate the code, list alternatives considered, or narrate history.
- In tests, only permit comments for math or non-intuitive setup.

Change comments, never code.
