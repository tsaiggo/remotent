import { describe, expect, test } from 'vitest';
import {
  acpToSession,
  cwdBasename,
  formatRelativeTime,
  groupSessionsByDate,
  sessionDisplayTitle,
} from './adapter.js';
import type { AcpSessionInfo, AcpSnapshot } from './client.js';

const session = (
  id: string,
  updatedAt: string | null,
  title: string | null = null,
): AcpSessionInfo => ({
  sessionId: id,
  cwd: '/Users/me/proj',
  title,
  updatedAt,
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-05-30T12:00:00Z').getTime();

  test.each<[string, string]>([
    ['', ''],
    ['2026-05-30T11:59:00Z', '1m'],
    ['2026-05-30T11:30:00Z', '30m'],
    ['2026-05-30T10:00:00Z', '2h'],
    ['2026-05-28T12:00:00Z', '2d'],
    ['2026-05-16T12:00:00Z', '2w'],
    ['2026-02-28T12:00:00Z', '3mo'],
  ])('iso=%s → %s', (iso, expected) => {
    expect(formatRelativeTime(iso || null, now)).toBe(expected);
  });

  test('invalid iso returns empty', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});

describe('groupSessionsByDate', () => {
  const now = new Date('2026-05-30T12:00:00Z').getTime();

  test('groups sessions into Today/Yesterday/This Week/Past Week/Older', () => {
    const sessions: AcpSessionInfo[] = [
      session('a', '2026-05-30T09:00:00Z'),
      session('b', '2026-05-30T10:00:00Z'),
      session('c', '2026-05-29T12:00:00Z'),
      session('d', '2026-05-26T12:00:00Z'),
      session('e', '2026-05-20T12:00:00Z'),
      session('f', '2026-04-01T12:00:00Z'),
    ];
    const groups = groupSessionsByDate(sessions, now);
    const map = new Map(groups.map((g) => [g.bucket, g.sessions.map((s) => s.sessionId)]));
    expect(map.get('today')).toEqual(['b', 'a']);
    expect(map.get('yesterday')).toEqual(['c']);
    expect(map.get('thisWeek')).toEqual(['d']);
    expect(map.get('pastWeek')).toEqual(['e']);
    expect(map.get('older')).toEqual(['f']);
  });

  test('preserves bucket order: today → yesterday → thisWeek → pastWeek → older', () => {
    const sessions: AcpSessionInfo[] = [
      session('older', '2026-04-01T12:00:00Z'),
      session('today', '2026-05-30T09:00:00Z'),
      session('yesterday', '2026-05-29T12:00:00Z'),
    ];
    const labels = groupSessionsByDate(sessions, now).map((g) => g.label);
    expect(labels).toEqual(['Today', 'Yesterday', 'Older']);
  });

  test('drops sessions with no/invalid updatedAt', () => {
    const sessions: AcpSessionInfo[] = [
      session('a', null),
      session('b', 'not-a-date'),
      session('c', '2026-05-30T09:00:00Z'),
    ];
    const groups = groupSessionsByDate(sessions, now);
    const allIds = groups.flatMap((g) => g.sessions.map((s) => s.sessionId));
    expect(allIds).toEqual(['c']);
  });
});

describe('cwdBasename', () => {
  test.each<[string, string]>([
    ['/Users/me/projects/remotent', 'remotent'],
    ['/Users/me/projects/remotent/', 'remotent'],
    ['/', '/'],
    ['', '/'],
    ['nested/path/segment', 'segment'],
  ])('cwd=%j → %j', (cwd, expected) => {
    expect(cwdBasename(cwd)).toBe(expected);
  });
});

describe('sessionDisplayTitle', () => {
  test('uses real title when non-default', () => {
    expect(sessionDisplayTitle(session('ses_abc123def', null, 'Greeting'))).toBe('Greeting');
    expect(sessionDisplayTitle(session('ses_abc123def', null, '基于 acp 的优化'))).toBe(
      '基于 acp 的优化',
    );
  });

  test('falls back when title is opencode default', () => {
    expect(
      sessionDisplayTitle(
        session('ses_abcdef0123', null, 'New session - 2026-05-30T18:08:49.479Z'),
      ),
    ).toBe('Session abcdef01');
    expect(
      sessionDisplayTitle(
        session('ses_xyz9876543', null, 'Child session - 2026-05-30T18:08:49.479Z'),
      ),
    ).toBe('Session xyz98765');
  });

  test('falls back when title is null', () => {
    expect(sessionDisplayTitle(session('ses_abcdef0123', null, null))).toBe('Session abcdef01');
  });
});

describe('acpToSession', () => {
  const baseSnap: AcpSnapshot = {
    status: 'connected',
    error: null,
    agent: 'opencode acp',
    sessionId: 'ses_live12345678',
    messages: [],
    sessions: [],
    sessionsLoading: false,
    loadingSessionId: null,
  };

  test('connected: lede mentions ACP and agent', () => {
    const s = acpToSession(baseSnap);
    expect(s.crumb).toBe('OpenCode · live');
    expect(s.lede).toContain('Agent Client Protocol');
    expect(s.lede).toContain('opencode acp');
  });

  test('connecting: lede shows handshake state', () => {
    const s = acpToSession({ ...baseSnap, status: 'connecting' });
    expect(s.lede).toContain('Connecting');
  });

  test('error: lede surfaces the error message', () => {
    const s = acpToSession({ ...baseSnap, status: 'error', error: 'boom' });
    expect(s.lede).toContain('boom');
    expect(s.lede).toContain('bun run server');
  });

  test('loading a stored session: lede shows loading state with title', () => {
    const meta = session('ses_old98765432', '2026-05-25T10:00:00Z', 'My past chat');
    const s = acpToSession({
      ...baseSnap,
      loadingSessionId: 'ses_old98765432',
      sessions: [meta],
    });
    expect(s.crumb).toBe('OpenCode · loading');
    expect(s.titleSans).toBe(' · loading');
    expect(s.lede).toContain('My past chat');
    expect(s.lede).toContain('Replaying');
  });

  test('loading without matching session metadata: still renders the id', () => {
    const s = acpToSession({
      ...baseSnap,
      loadingSessionId: 'ses_unknown1234',
      sessions: [],
    });
    expect(s.lede).toContain('ses_unknown1234');
  });
});
