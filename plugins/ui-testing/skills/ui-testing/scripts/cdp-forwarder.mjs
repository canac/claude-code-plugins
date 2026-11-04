// A per-session CDP forwarder, so `launch-agent-chrome --proxy` can point this Claude Code session's tools at its
// own Chrome without touching other sessions. Each MCP server that drives Chrome connects through one.

import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const SHARED_CDP_PORT = 9222;
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

/** Listens on a free localhost port and resolves to its CDP endpoint URL. */
export function startForwarder() {
  const sockets = new Set();
  const server = net.createServer((client) => {
    const upstream = net.connect(targetPort(), "127.0.0.1");
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
      socket.on("error", () => {
        client.destroy();
        upstream.destroy();
      });
    }
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
