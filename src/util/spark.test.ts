import { describe, expect, it } from 'vitest';
import { sparkPath, sparkSvg } from './spark.js';

describe('sparkPath', () => {
  it('is deterministic for the same seed and dimensions', () => {
    const a = sparkPath('dev.node:tok', 200, 32);
    const b = sparkPath('dev.node:tok', 200, 32);
    expect(a).toBe(b);
  });

  it('produces different output for different seeds', () => {
    const a = sparkPath('dev.node:tok', 200, 32);
    const b = sparkPath('design.node:tok', 200, 32);
    expect(a).not.toBe(b);
  });

  it('emits an SVG path starting with M and with the expected segment count', () => {
    const d = sparkPath('seed', 200, 32);
    expect(d.startsWith('M')).toBe(true);
    // 24 sample points → 1 'M' + 23 'L' segments
    expect((d.match(/L/g) ?? []).length).toBe(23);
    expect((d.match(/M/g) ?? []).length).toBe(1);
  });

  it('respects the width/height bounds', () => {
    const d = sparkPath('seed', 100, 20);
    const xs = [...d.matchAll(/[ML](\d+\.\d)/g)].map((m) => Number(m[1]));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(100);
  });
});

describe('sparkSvg', () => {
  it('wraps sparkPath output in a properly-shaped SVG element', () => {
    const svg = sparkSvg('seed', '#abcdef');
    expect(svg).toContain('<svg');
    expect(svg).toContain('class="telemetry__spark"');
    expect(svg).toContain('viewBox="0 0 200 32"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('stroke="#abcdef"');
    expect(svg).toContain('stroke-width="1"');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('embeds the path string from sparkPath verbatim', () => {
    const d = sparkPath('seed-x', 200, 32);
    const svg = sparkSvg('seed-x', 'red');
    expect(svg).toContain(`d="${d}"`);
  });
});
