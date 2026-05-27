import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nowClock, pad } from './time.js';

describe('pad', () => {
  it('left-pads single-digit numbers with 0', () => {
    expect(pad(0)).toBe('00');
    expect(pad(5)).toBe('05');
    expect(pad(9)).toBe('09');
  });

  it('returns two-digit numbers unchanged', () => {
    expect(pad(10)).toBe('10');
    expect(pad(59)).toBe('59');
  });

  it('does not truncate three-digit numbers', () => {
    expect(pad(100)).toBe('100');
  });
});

describe('nowClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats the current time as HH:MM:SS with zero padding', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 3, 4, 5));
    expect(nowClock()).toBe('03:04:05');
  });

  it('handles end-of-day values correctly', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 23, 59, 59));
    expect(nowClock()).toBe('23:59:59');
  });

  it('always produces 8 characters (HH:MM:SS)', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));
    expect(nowClock()).toHaveLength(8);
    expect(nowClock()).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
