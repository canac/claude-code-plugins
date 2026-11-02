---
name: contradict
description: Attack a plan with parallel adversarial subagents. Use when the user wants a plan stress-tested, holes poked in it, or contradicted before building.
---

Find the plan's fatal flaws before it gets built.

## 1. Target

From `$ARGUMENTS`, else the plan in this conversation, else ask. A non-mode argument is a path; if it does not resolve to a file, stop and say so. Never review a plan you guessed at.

## 2. Mode

`report` (findings only) or `revise` (findings, then edit). From `$ARGUMENTS`, else ask before spawning.

## 3. Spawn four lenses

One message, four read-only `general-purpose` agents ("do not edit any file"). Subagents cannot see this conversation: paste the full plan and the step 4 rules into every prompt.

| Lens | Attack |
| --- | --- |
| assumptions | What must be true for this plan to work that it never states or checks? |
| codebase | Grep the repo. Verify every claim the plan makes about existing code. |
| simpler | Argue it is overbuilt. Give the 20%-effort version and the one requirement it fails. |
| evidence | Disprove its claims with runtime data: run commands, query logs and metrics. |

## 4. Rules for every lens

- Tag each finding `fatal` (plan cannot work), `answer` (plan must resolve this), or `minor`.
- Code claims cite `file:line`. Behavior claims cite a command and its output. No evidence, no finding.
- "No fatal flaws" is a valid verdict.
- One line each: `<tag> — <objection>. Evidence: <proof>. Asks: <what the plan must answer>.`

## 5. Verify, then report

Confirm each finding yourself — reviewers invent plausible objections. Drop what you cannot confirm, merge duplicates, order by tag.

## 6. Revise (if mode is `revise`)

Edit the plan for every `fatal` and `answer`. Show the diff. Leave `minor` as a list for the user to accept or ignore.
