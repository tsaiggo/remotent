import { describe, expect, test } from 'vitest';
import type { Turn } from '../types/index.js';
import { TIMELINE_PREVIEW_SIZE, timelinePreview } from './timelinePreview.js';

const turn = (n: number): Turn => ({
  kind: n % 2 === 0 ? 'human' : 'agent',
  who: n % 2 === 0 ? 'You' : 'Agent',
  text: `turn-${n}`,
});

describe('timelinePreview', () => {
  test('shows all turns when there are fewer than the preview size', () => {
    const turns = Array.from({ length: 4 }, (_, i) => turn(i));
    const preview = timelinePreview(turns, TIMELINE_PREVIEW_SIZE);

    expect(preview.hiddenCount).toBe(0);
    expect(preview.visibleCount).toBe(4);
    expect(preview.turns.map((t) => t.text)).toEqual(['turn-0', 'turn-1', 'turn-2', 'turn-3']);
  });

  test('initially shows the latest ten turns from a long conversation', () => {
    const turns = Array.from({ length: 25 }, (_, i) => turn(i));
    const preview = timelinePreview(turns, TIMELINE_PREVIEW_SIZE);

    expect(preview.hiddenCount).toBe(15);
    expect(preview.visibleCount).toBe(10);
    expect(preview.turns).toHaveLength(10);
    expect(preview.turns[0]?.text).toBe('turn-15');
    expect(preview.turns.at(-1)?.text).toBe('turn-24');
  });

  test('loads older turns in ten-turn increments', () => {
    const turns = Array.from({ length: 25 }, (_, i) => turn(i));
    const preview = timelinePreview(turns, TIMELINE_PREVIEW_SIZE * 2);

    expect(preview.hiddenCount).toBe(5);
    expect(preview.visibleCount).toBe(20);
    expect(preview.turns).toHaveLength(20);
    expect(preview.turns[0]?.text).toBe('turn-5');
  });
});
