import { Gait } from '../types';

/**
 * Horse physical dimensions
 */
export const HORSE_LENGTH_METERS = 2.7; // Nose to tail in meters
export const HORSE_WIDTH_RATIO = 0.4; // Width is 40% of length

/**
 * Arrow length multipliers based on gait (speed)
 * These determine how long the direction arrow is relative to horse length
 */
export const ARROW_LENGTH_MULTIPLIERS: Record<Gait, number> = {
  walk: 1.0,
  trot: 1.5,
  canter: 2.0,
};

/**
 * Thresholds for determining gait from arrow drag distance
 * These are multipliers of horse length
 */
export const ARROW_GAIT_THRESHOLDS = {
  walk: 1.25, // Between 1.0x and 1.5x
  trot: 1.75, // Between 1.5x and 2.0x
} as const;

/**
 * Drag interaction constants
 */
export const DRAG_DISTANCE_THRESHOLD = 3; // Pixels - minimum movement to consider a drag
export const ARROW_HANDLE_RADIUS = 8; // Pixels - invisible handle size for arrow end

/**
 * Horse rendering visual constants
 */
export const HORSE_RENDERING = {
  SELECTED_STROKE_COLOR: '#F97316',
  DEFAULT_STROKE_COLOR: '#000000',
  SELECTED_STROKE_WIDTH: 3,
  DEFAULT_STROKE_WIDTH: 1,
  OPACITY: 0.8,
  ARROW_COLOR: '#333333',
  ARROW_STROKE_WIDTH: 2,
  ARROW_POINTER_LENGTH: 8,
  ARROW_POINTER_WIDTH: 6,
} as const;

/**
 * Horse label rendering constants
 */
export const HORSE_LABEL = {
  MIN_FONT_SIZE: 8,
  MAX_FONT_SIZE: 14,
  WIDTH_RATIO: 0.6, // Label width is 60% of horse width
  HEIGHT_RATIO: 0.6, // Label height is 60% of horse width
  TEXT_COLOR: '#FFFFFF',
} as const;

/**
 * Horse body part ratios (relative to horse length)
 */
export const HORSE_BODY_RATIOS = {
  HEAD_OFFSET: 0.1, // Head is 10% back from front
  HEAD_RADIUS_X: 0.15, // Head width is 15% of length
  HEAD_RADIUS_Y: 0.25, // Head height is 25% of width
  TAIL_EXTENSION: 0.1, // Tail extends 10% beyond back
  TAIL_WIDTH: 0.15, // Tail width is 15% of horse width
} as const;

