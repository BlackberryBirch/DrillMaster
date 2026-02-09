import type { KeyFramesPrintLayout } from './PrintKeyFramesDialog';

export const CARDS_PER_PAGE: Record<KeyFramesPrintLayout, number> = {
  '1-up-landscape': 1,
  '2-up-portrait': 2,
  '4-up-portrait': 4,
  '9-up-portrait': 9,
  '16-up-portrait': 16,
};

/** Card size in pixels (width, height) per layout for print. */
/** Rotated layouts (4/9/16-up): arena is 1:2 w:h (width=40m, height=80m). */
export const CARD_SIZE: Record<KeyFramesPrintLayout, { width: number; height: number }> = {
  '1-up-landscape': { width: 700, height: 400 },
  '2-up-portrait': { width: 400, height: 420 },
  '4-up-portrait': { width: 200, height: 422 },
  '9-up-portrait': { width: 160, height: 342 },
  '16-up-portrait': { width: 120, height: 262 },
};

/** Layouts where the arena is rotated 90° counter-clockwise. */
export const ROTATED_ARENA_LAYOUTS: KeyFramesPrintLayout[] = ['4-up-portrait', '9-up-portrait', '16-up-portrait'];
