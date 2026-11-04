---
name: ui-testing
description: Use when testing, debugging, or verifying a web UI in a real browser with the playwright-cdp MCP tools.
---

# UI testing

The `playwright-cdp` MCP tools drive a dedicated Chrome over CDP. Run `${CLAUDE_SKILL_DIR}/scripts/launch-agent-chrome` in the background before using them. Other sessions may share that Chrome, so open your own tab with `browser_tabs` action `new` before navigating, and close it when done.

## Logging in

Log in with the `login-agent` tools if available instead of typing credentials. Never use `browser_evaluate` or `browser_run_code_unsafe` on a tab while logging in. If the site isn't in `list_logins`, ask the user to run `login-agent bw-import`.

## Proxy

To send this session's browser traffic through a proxy, run this in the background instead:

```sh
${CLAUDE_SKILL_DIR}/scripts/launch-agent-chrome --proxy <port>
```

This starts a Chrome that only this session uses, and the `playwright-cdp` tools switch to it on their next call.

- Chrome never proxies `localhost` or `127.0.0.1`.
- Subagents in this session share the same tools, so they share this browser and proxy too.
