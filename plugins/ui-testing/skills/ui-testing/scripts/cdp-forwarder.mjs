// A per-session CDP forwarder, so `launch-agent-chrome --proxy` can point this Claude Code session's tools at its
// own Chrome without touching other sessions. Each MCP server that drives Chrome connects through one.

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const SHARED_CDP_PORT = 9222;
const LAUNCH_TIMEOUT_MS = 30_000;
const launcher = fileURLToPath(
  new URL("./launch-agent-chrome", import.meta.url),
);
// Claude Code spawns the MCP servers directly, so the parent pid matches $CLAUDE_PID in its Bash tool.
export const stateFile = path.join(
  os.homedir(),
  ".chrome-agent-sessions",
  `${process.ppid}.json`,
);

export function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch {
    return {};
  }
}

function targetPort() {
  const { cdpPort, chromePid } = readState();
  try {
    process.kill(chromePid, 0);
    return cdpPort;
  } catch {
    return SHARED_CDP_PORT;
  }
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function launchSharedChrome() {
  // Without CLAUDE_PID the launcher leaves any per-session Chrome state alone.
  const { CLAUDE_PID, ...env } = process.env;
  // Detached so the shared Chrome outlives this session for the others using it.
  const child = spawn(launcher, [], { detached: true, stdio: "ignore", env });
  child.unref();
  let exitCode;
  child.on("exit", (code) => (exitCode = code));
  const deadline = Date.now() + LAUNCH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await canConnect(SHARED_CDP_PORT)) return;
    if (exitCode !== undefined) {
      throw new Error(`launch-agent-chrome exited (${exitCode})`);
    }
    await sleep(200);
  }
  throw new Error(
    `Chrome did not open port ${SHARED_CDP_PORT} within ${LAUNCH_TIMEOUT_MS / 1000}s`,
  );
}

let sharedChromeStarting;

/** Starts the shared Chrome unless it is already up; concurrent callers share one launch. */
function ensureSharedChrome() {
  sharedChromeStarting ??= (async () => {
    if (!(await canConnect(SHARED_CDP_PORT))) await launchSharedChrome();
  })().finally(() => {
    sharedChromeStarting = undefined;
  });
  return sharedChromeStarting;
}

/** Listens on a free localhost port and resolves to its CDP endpoint URL. */
export function startForwarder() {
  const sockets = new Set();
  const track = (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  };
  const server = net.createServer(async (client) => {
    track(client);
    client.on("error", () => client.destroy());
    const port = targetPort();
    if (port === SHARED_CDP_PORT) {
      try {
        await ensureSharedChrome();
      } catch (error) {
        console.error(`cdp-forwarder: ${error.message}`);
        client.destroy();
        return;
      }
    }
    if (client.destroyed) return;
    const upstream = net.connect(port, "127.0.0.1");
    track(upstream);
    upstream.on("error", () => {
      client.destroy();
      upstream.destroy();
    });
    client.on("error", () => upstream.destroy());
    client.pipe(upstream).pipe(client);
  });

  // Dropping the connection makes the client reconnect, and pick up the new target, on its next call.
  fs.watchFile(stateFile, { interval: 500 }, () => {
    for (const socket of sockets) socket.destroy();
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ endpoint: `http://127.0.0.1:${server.address().port}` });
    });
  });
}
