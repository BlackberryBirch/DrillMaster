import type { KeyFramesPrintLayout } from './PrintKeyFramesDialog';

export const CARDS_PER_PAGE: Record<KeyFramesPrintLayout, number> = {
  '1-up-landscape': 1,
  '2-up-portrait': 2,
  '4-up-portrait': 4,
  '9-up-portrait': 9,
  '16-up-portrait': 16,
};

/** Card size in pixels (width, height) per layout for print. */
export const CARD_SIZE: Record<KeyFramesPrintLayout, { width: number; height: number }> = {
  '1-up-landscape': { width: 700, height: 400 },
  '2-up-portrait': { width: 400, height: 420 },
  '4-up-portrait': { width: 320, height: 280 },
  '9-up-portrait': { width: 240, height: 220 },
  '16-up-portrait': { width: 200, height: 180 },
};

/** Layouts where the arena is rotated 90° counter-clockwise. */
export const ROTATED_ARENA_LAYOUTS: KeyFramesPrintLayout[] = ['4-up-portrait', '9-up-portrait', '16-up-portrait'];
