---
name: ui-testing
description: Use when testing, debugging, or verifying a web UI in a real browser with the playwright-cdp MCP tools.
---

# UI testing

The `playwright-cdp` MCP tools drive a dedicated Chrome over CDP. Run `${CLAUDE_SKILL_DIR}/scripts/launch-agent-chrome` in the background before using them. It exits right away if that Chrome is already up. The Chrome uses its own profile in `~/.chrome-agent`, so logins and storage persist. Every Claude Code session shares it, so open your own tab with `browser_tabs` action `new` before navigating, and close it when done.

## Through a proxy

To send this session's browser traffic through a proxy like roxy without touching other sessions, run this in the background instead:

```sh
${CLAUDE_SKILL_DIR}/scripts/launch-agent-chrome --proxy <port>
```

It opens a separate Chrome with a copy of the shared profile, and this session's `playwright-cdp` tools switch to it on their next call.

- Run it again with a new port to switch proxies. Stop the background task to go back to the shared Chrome.
- Logins made in the proxied Chrome are not saved to the shared profile.
- Chrome never proxies `localhost` or `127.0.0.1`.
- Subagents in this session share the same tools, so they share this browser and proxy too.
