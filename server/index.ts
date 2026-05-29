import { spawn } from 'node:child_process';
import type { ServerWebSocket } from 'bun';

const WS_PORT = Number(process.env['PORT'] ?? 5174);
const AGENT_CMD = process.env['AGENT_CMD'] ?? 'opencode';
const AGENT_ARGS = (process.env['AGENT_ARGS'] ?? 'acp').split(/\s+/);

type Bridge = {
  child: ReturnType<typeof spawn>;
  stdoutBuffer: string;
};

const bridges = new WeakMap<ServerWebSocket<unknown>, Bridge>();

function spawnAgent(ws: ServerWebSocket<unknown>): Bridge {
  const child = spawn(AGENT_CMD, AGENT_ARGS, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  const bridge: Bridge = { child, stdoutBuffer: '' };

  child.stdout.on('data', (chunk: Buffer) => {
    bridge.stdoutBuffer += chunk.toString('utf8');
    let nl: number;
    while ((nl = bridge.stdoutBuffer.indexOf('\n')) >= 0) {
      const line = bridge.stdoutBuffer.slice(0, nl).trim();
      bridge.stdoutBuffer = bridge.stdoutBuffer.slice(nl + 1);
      if (!line) continue;
      ws.send(line);
    }
  });

  child.stderr.on('data', (chunk: Buffer) => {
    console.error(`[${AGENT_CMD}]`, chunk.toString('utf8').trimEnd());
  });

  child.on('exit', (code) => {
    console.error(`[sidecar] agent process exited code=${String(code)}`);
    try {
      ws.close(1011, `agent exited code=${String(code)}`);
    } catch {
      /* ignore */
    }
  });

  return bridge;
}

const server = Bun.serve({
  port: WS_PORT,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      if (server.upgrade(req)) return undefined;
      return new Response('upgrade failed', { status: 426 });
    }
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({ ok: true, agent: `${AGENT_CMD} ${AGENT_ARGS.join(' ')}` }),
        {
          headers: { 'content-type': 'application/json' },
        },
      );
    }
    return new Response('not found', { status: 404 });
  },
  websocket: {
    open(ws) {
      console.error(`[sidecar] ws open — spawning '${AGENT_CMD} ${AGENT_ARGS.join(' ')}'`);
      bridges.set(ws, spawnAgent(ws));
    },
    message(ws, msg) {
      const bridge = bridges.get(ws);
      if (!bridge) return;
      const line = typeof msg === 'string' ? msg : new TextDecoder().decode(msg);
      bridge.child.stdin?.write(line + '\n');
    },
    close(ws) {
      const bridge = bridges.get(ws);
      if (!bridge) return;
      console.error('[sidecar] ws close — killing agent');
      try {
        bridge.child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
      bridges.delete(ws);
    },
  },
});

console.error(`[sidecar] listening on ws://localhost:${String(server.port)}/ws`);
console.error(`[sidecar] agent: ${AGENT_CMD} ${AGENT_ARGS.join(' ')}`);
