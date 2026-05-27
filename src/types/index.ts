/* ============================================================
   Type model — single source of truth for the Remotent renderer.
   Shapes mirror the data exactly (see src/data/sessions.ts and
   src/data/nodes.ts). Renamed `Node` → `AgentNode` to avoid
   shadowing lib.dom's global `Node` interface.
   ============================================================ */

// ─────────────────── Sessions ───────────────────
export type TurnKind = 'human' | 'agent';
export type RoleClass = 'dev' | 'design' | 'research';

/**
 * A single line/segment inside a terminal block on an agent turn.
 * The renderer in session.ts branches on `type`, so we keep both
 * `cmd` and `text` optional (they're populated per-variant in the
 * existing data).
 */
export type TerminalSegmentType = 'prompt' | 'line' | 'out' | 'stream';
export interface TerminalSegment {
  type: TerminalSegmentType;
  cmd?: string;
  text?: string;
}

export interface TurnArtifact {
  caption: string;
  meta: string;
}

export interface Turn {
  kind: TurnKind;
  who: string;
  role?: string;
  roleClass?: RoleClass;
  time?: string;
  node?: string;
  tools?: string[];
  text?: string;
  terminal?: TerminalSegment[];
  artifact?: TurnArtifact;
  streaming?: boolean;
  /** Mirrors the avatar's live indicator on streaming turns. */
  live?: boolean;
  quiet?: boolean;
}

export interface SessionNodeRef {
  name: string;
  kind?: NodeKind;
  live?: boolean;
  title?: string;
}

export interface Session {
  crumb: string;
  kicker?: string;
  titleSerif?: string;
  titleSans?: string;
  lede?: string;
  nodes?: SessionNodeRef[];
  turns: Turn[];
}

export type SessionMap = Record<string, Session>;

// ─────────────────── Nodes ───────────────────
export type NodeKind = 'dev' | 'design' | 'research';
export type NodeStatus = 'live' | 'idle' | 'paused' | 'error';
export type NodeStatusFilter = 'all' | NodeStatus;
export type ToolScope = 'read' | 'write';
export type AckMode = 'at-most-once' | 'at-least-once' | 'exactly-once' | 'best-effort';

export interface ToolGrant {
  name: string;
  scope: ToolScope;
  calls24h: number;
  ttl: string;
  rate: string;
  resources: string[];
  ack: AckMode;
  errorRate24h?: number;
}

export interface McpResource {
  name: string;
  meta: string;
}

export interface ACPMeta {
  version: string;
  capabilities: string[];
  ack: { default: AckMode; perToolOverrides: Record<string, AckMode> };
  idempotencyWindow: string;
  attestation: { algo: string; keyId: string; lastSigned: string };
  handshake: { lastAt: string; peerCount: number };
}

export type HumanInLoopAction = 'ask' | 'block' | 'log' | 'auto';

export interface HumanInLoopRule {
  trigger: string;
  action: HumanInLoopAction;
  scope: string;
}

export interface Policy {
  humanInLoop: HumanInLoopRule[];
  rateLimit: { tokensPerMin: number; callsPerMin: number };
  concurrency: { maxInFlight: number };
  retry: { policy: string; max: number };
  timeout: string;
}

export interface Subscription {
  topic: string;
  since: string;
  count24h: number;
  qos: AckMode;
}

export interface OutboundContract {
  target: string;
  contract: string;
  calls24h: number;
  p50: string;
  ack: AckMode;
}

export interface LegacyPermissions {
  humanInLoop: string;
  writePaths: string[];
}

export interface AgentNode {
  name: string;
  kind: NodeKind;
  model: string;
  role: string;
  persona: string;
  lede: string;
  createdAt: string;
  owner: string;
  endpoint: string;
  contextWindow: string;
  memoryItems: number;
  paused?: boolean;
  systemPrompt: string;
  tools: ToolGrant[];
  mcp: McpResource[];
  permissions: LegacyPermissions;
  acp: ACPMeta;
  policy: Policy;
  subscriptions: Subscription[];
  outbound: OutboundContract[];
}

export type NodeMap = Record<string, AgentNode>;

// ─────────────────── Aggregates ───────────────────
export interface SessionAppearance {
  id: string;
  title: string;
  kicker: string;
  live: boolean;
}

export interface RecentTurn {
  time?: string;
  text?: string;
  who: string;
}

export interface NodeAggregates {
  sessions: SessionAppearance[];
  recentTurns: RecentTurn[];
  live: boolean;
}

// ─────────────────── State ───────────────────
export interface Store {
  currentSessionId: string | null;
  currentNodeId: string | null;
  currentNodeFilter: NodeStatusFilter;
  currentNodeSearch: string;
  newCounter: number;
}

// ─────────────────── View ───────────────────
export type View = 'hub' | 'nodes';
