import { NODES } from './nodes.js';
import { SESSIONS } from './sessions.js';
import type { NodeAggregates, NodeStatus } from '../types/index.js';

/* Aggregate session-level info into a per-node view: live in any
   session? which sessions referenced it? recent turns? */
export function nodeAggregates(nodeName: string): NodeAggregates {
  const sessions: NodeAggregates['sessions'] = [];
  const recentTurns: NodeAggregates['recentTurns'] = [];
  let live = false;

  Object.entries(SESSIONS).forEach(([sid, s]) => {
    const usedHere = (s.nodes || []).find(
      (n) => `${n.name}.node` === nodeName || n.name === nodeName.replace(/\.node$/, ''),
    );
    if (!usedHere) return;
    if (usedHere.live) live = true;
    sessions.push({
      id: sid,
      title: s.crumb || sid,
      kicker: s.kicker || '',
      live: !!usedHere.live,
    });
    (s.turns || []).forEach((t) => {
      const tnode = t.node ? `${t.node}.node` : null;
      if (tnode === nodeName) {
        const entry: NodeAggregates['recentTurns'][number] = { who: t.who };
        if (t.time !== undefined) entry.time = t.time;
        if (t.text !== undefined) entry.text = t.text;
        recentTurns.push(entry);
      }
    });
  });

  return { sessions, recentTurns: recentTurns.slice(-4).reverse(), live };
}

export function nodeStatus(name: string): NodeStatus {
  const n = NODES[name];
  if (!n) return 'error';
  if (n.paused) return 'paused';
  const agg = nodeAggregates(name);
  return agg.live ? 'live' : 'idle';
}
