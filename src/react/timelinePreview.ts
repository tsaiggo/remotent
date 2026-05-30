import type { Turn } from '../types/index.js';

export const TIMELINE_PREVIEW_SIZE = 10;

export interface TimelinePreview {
  turns: Turn[];
  hiddenCount: number;
  visibleCount: number;
}

export function timelinePreview(turns: Turn[], requestedCount: number): TimelinePreview {
  const visibleCount = Math.min(Math.max(requestedCount, TIMELINE_PREVIEW_SIZE), turns.length);
  const hiddenCount = Math.max(turns.length - visibleCount, 0);

  return {
    turns: turns.slice(hiddenCount),
    hiddenCount,
    visibleCount,
  };
}
