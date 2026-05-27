import { describe, expect, it } from 'vitest';
import { nodeAggregates, nodeStatus } from './aggregates.js';

describe('nodeAggregates', () => {
  it('returns the live flag, sessions, and recent turns for a known node', () => {
    const agg = nodeAggregates('dev.node');
    expect(agg.live).toBe(true);
    expect(agg.sessions.length).toBeGreaterThan(0);
    const first = agg.sessions[0];
    expect(first?.id).toBeTypeOf('string');
    expect(first?.title).toBeTypeOf('string');
  });

  it('returns an empty aggregate for a node nothing references', () => {
    const agg = nodeAggregates('does-not-exist.node');
    expect(agg.sessions).toEqual([]);
    expect(agg.recentTurns).toEqual([]);
    expect(agg.live).toBe(false);
  });

  it('caps recent turns to at most four entries', () => {
    const agg = nodeAggregates('dev.node');
    expect(agg.recentTurns.length).toBeLessThanOrEqual(4);
  });

  it('preserves a `who` field on every retained recent turn', () => {
    const agg = nodeAggregates('research.node');
    agg.recentTurns.forEach((t) => {
      expect(t.who).toBeTypeOf('string');
    });
  });

  it('matches a session ref short name against the full `.node` suffix', () => {
    const dev = nodeAggregates('dev.node');
    const design = nodeAggregates('design.node');
    expect(dev.sessions.length).toBeGreaterThan(0);
    expect(design.sessions.length).toBeGreaterThan(0);
  });
});

describe('nodeStatus', () => {
  it('returns "error" for an unknown node', () => {
    expect(nodeStatus('does-not-exist.node')).toBe('error');
  });

  it('returns "paused" for editor.node (which has paused: true)', () => {
    expect(nodeStatus('editor.node')).toBe('paused');
  });

  it('returns "live" for dev.node which is referenced as live in some session', () => {
    expect(nodeStatus('dev.node')).toBe('live');
  });

  it('returns "live" or "idle" for design.node depending on session state', () => {
    const s = nodeStatus('design.node');
    expect(['live', 'idle']).toContain(s);
  });

  it('returns one of the five well-known status strings for every known node', () => {
    const knownNodes = ['dev.node', 'design.node', 'research.node', 'editor.node'];
    const allowed = new Set(['live', 'idle', 'paused', 'error']);
    knownNodes.forEach((n) => {
      expect(allowed.has(nodeStatus(n))).toBe(true);
    });
  });
});
