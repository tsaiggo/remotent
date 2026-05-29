import {
  ClientSideConnection,
  type Agent,
  type AnyMessage,
  type Client,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type ReadTextFileResponse,
  type SessionNotification,
  type Stream,
} from '@agentclientprotocol/sdk';

export type AcpStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface AcpMessageChunk {
  type: 'user' | 'agent' | 'thought' | 'tool';
  text: string;
  toolId?: string;
  toolStatus?: string;
  toolKind?: string;
}

export interface AcpMessage {
  id: string;
  role: 'user' | 'agent';
  chunks: AcpMessageChunk[];
  streaming: boolean;
  createdAt: number;
}

export interface AcpSnapshot {
  status: AcpStatus;
  error: string | null;
  agent: string;
  sessionId: string | null;
  messages: AcpMessage[];
}

type Listener = () => void;

const wsUrl = (): string => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
};

function wsToStream(ws: WebSocket): Stream {
  const readable = new ReadableStream<AnyMessage>({
    start(controller) {
      ws.addEventListener('message', (ev: MessageEvent<string>) => {
        const text = typeof ev.data === 'string' ? ev.data : '';
        if (!text) return;
        try {
          const msg = JSON.parse(text) as AnyMessage;
          controller.enqueue(msg);
        } catch (e) {
          console.error('[acp] parse error', e, text);
        }
      });
      ws.addEventListener('close', () => {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
      ws.addEventListener('error', (e) => {
        console.error('[acp] ws error', e);
      });
    },
  });
  const writable = new WritableStream<AnyMessage>({
    write(msg) {
      ws.send(JSON.stringify(msg));
    },
  });
  return { readable, writable };
}

class AcpClient implements Pick<Agent, never> {
  private listeners = new Set<Listener>();
  private conn: ClientSideConnection | null = null;
  private snapshot: AcpSnapshot = {
    status: 'idle',
    error: null,
    agent: 'opencode acp',
    sessionId: null,
    messages: [],
  };
  private pendingUserPrompts: string[] = [];

  getSnapshot = (): AcpSnapshot => this.snapshot;

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private update(patch: Partial<AcpSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((fn) => {
      fn();
    });
  }

  async connect(): Promise<void> {
    if (this.snapshot.status === 'connected' || this.snapshot.status === 'connecting') return;
    this.update({ status: 'connecting', error: null });

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl());
    } catch (e) {
      this.update({ status: 'error', error: String(e) });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => {
        resolve();
      });
      ws.addEventListener('error', () => {
        reject(new Error('ws error'));
      });
      ws.addEventListener('close', () => {
        if (this.snapshot.status === 'connecting') reject(new Error('ws closed'));
      });
    }).catch((e: Error) => {
      this.update({ status: 'error', error: e.message });
      throw e;
    });

    const conn = new ClientSideConnection(
      () =>
        ({
          sessionUpdate: (params: SessionNotification): Promise<void> => {
            this.onSessionUpdate(params);
            return Promise.resolve();
          },
          requestPermission: (
            params: RequestPermissionRequest,
          ): Promise<RequestPermissionResponse> => {
            console.warn('[acp] auto-allow permission (MVP):', params.toolCall.title);
            const firstOption = params.options[0];
            if (!firstOption) {
              return Promise.resolve({ outcome: { outcome: 'cancelled' } });
            }
            return Promise.resolve({
              outcome: { outcome: 'selected', optionId: firstOption.optionId },
            });
          },
          readTextFile: (): Promise<ReadTextFileResponse> => Promise.resolve({ content: '' }),
          writeTextFile: () => Promise.resolve({}),
          createTerminal: () => Promise.resolve({ terminalId: 'mvp-stub' }),
          terminalOutput: () => Promise.resolve({ output: '', truncated: false }),
          releaseTerminal: () => Promise.resolve({}),
          waitForTerminalExit: () => Promise.resolve({ exitStatus: { exitCode: 0 } }),
          killTerminal: () => Promise.resolve({}),
        }) as unknown as Client,
      wsToStream(ws),
    );
    this.conn = conn;

    ws.addEventListener('close', () => {
      this.update({ status: 'idle', sessionId: null });
      this.conn = null;
    });

    try {
      await conn.initialize({
        protocolVersion: 1,
        clientCapabilities: {
          fs: { readTextFile: true, writeTextFile: false },
          terminal: false,
        },
      });
      const sessionRes = await conn.newSession({
        cwd: '/',
        mcpServers: [],
      });
      this.update({ status: 'connected', sessionId: sessionRes.sessionId, messages: [] });

      while (this.pendingUserPrompts.length > 0) {
        const text = this.pendingUserPrompts.shift();
        if (text) void this.sendPrompt(text);
      }
    } catch (e) {
      this.update({ status: 'error', error: String(e) });
      throw e;
    }
  }

  async sendPrompt(text: string): Promise<void> {
    if (this.snapshot.status !== 'connected' || !this.conn || !this.snapshot.sessionId) {
      this.pendingUserPrompts.push(text);
      return;
    }
    const userMessage: AcpMessage = {
      id: `user-${String(Date.now())}`,
      role: 'user',
      chunks: [{ type: 'user', text }],
      streaming: false,
      createdAt: Date.now(),
    };
    this.update({ messages: [...this.snapshot.messages, userMessage] });
    try {
      await this.conn.prompt({
        sessionId: this.snapshot.sessionId,
        prompt: [{ type: 'text', text }],
      });
    } catch (e) {
      this.update({ error: `prompt failed: ${String(e)}` });
    }
  }

  private onSessionUpdate(params: SessionNotification): void {
    const upd = params.update;
    const msgs = this.snapshot.messages.slice();
    const last = msgs[msgs.length - 1];

    const ensureStreamingAgent = (): AcpMessage => {
      if (last?.role === 'agent' && last.streaming) return last;
      const fresh: AcpMessage = {
        id: `agent-${String(Date.now())}-${String(msgs.length)}`,
        role: 'agent',
        chunks: [],
        streaming: true,
        createdAt: Date.now(),
      };
      msgs.push(fresh);
      return fresh;
    };

    switch (upd.sessionUpdate) {
      case 'agent_message_chunk': {
        const content = upd.content;
        if (content.type !== 'text') break;
        const m = ensureStreamingAgent();
        const lastChunk = m.chunks[m.chunks.length - 1];
        if (lastChunk?.type === 'agent') {
          lastChunk.text += content.text;
        } else {
          m.chunks.push({ type: 'agent', text: content.text });
        }
        break;
      }
      case 'agent_thought_chunk': {
        const content = upd.content;
        if (content.type !== 'text') break;
        const m = ensureStreamingAgent();
        m.chunks.push({ type: 'thought', text: content.text });
        break;
      }
      case 'tool_call': {
        const m = ensureStreamingAgent();
        const chunk: AcpMessageChunk = {
          type: 'tool',
          text: upd.title ?? upd.toolCallId,
          toolId: upd.toolCallId,
        };
        if (upd.status !== undefined) chunk.toolStatus = upd.status;
        if (upd.kind !== undefined) chunk.toolKind = upd.kind;
        m.chunks.push(chunk);
        break;
      }
      case 'tool_call_update': {
        const m = ensureStreamingAgent();
        const chunk = m.chunks.find((c) => c.toolId === upd.toolCallId);
        if (chunk && typeof upd.status === 'string') {
          chunk.toolStatus = upd.status;
        }
        break;
      }
      default:
        break;
    }
    this.update({ messages: msgs });
  }

  finalizeStreamingTurn(): void {
    const msgs = this.snapshot.messages.slice();
    const last = msgs[msgs.length - 1];
    if (last?.streaming) {
      last.streaming = false;
      this.update({ messages: msgs });
    }
  }
}

export const acp = new AcpClient();
