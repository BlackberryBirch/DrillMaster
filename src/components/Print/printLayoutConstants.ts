import type { KeyFramesPrintLayout } from './PrintKeyFramesDialog';

export const CARDS_PER_PAGE: Record<KeyFramesPrintLayout, number> = {
  '1-up-landscape': 1,
  '2-up-portrait': 2,
  '4-up-portrait': 4,
  '9-up-portrait': 9,
};

/** Card size in pixels (width, height) per layout for print. */
export const CARD_SIZE: Record<KeyFramesPrintLayout, { width: number; height: number }> = {
  '1-up-landscape': { width: 700, height: 400 },
  '2-up-portrait': { width: 400, height: 420 },
  '4-up-portrait': { width: 320, height: 280 },
  '9-up-portrait': { width: 240, height: 220 },
};
