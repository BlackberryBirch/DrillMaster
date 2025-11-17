import { Point } from '../types/point';
import { ARENA_ASPECT_RATIO, ARENA_DIVISIONS_LENGTH } from '../constants/arena';

/**
 * Convert normalized point to canvas coordinates
 */
export const pointToCanvas = (
  point: Point,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } => {
  return {
    x: point.x * canvasWidth,
    y: point.y * canvasHeight,
  };
};

/**
 * Convert canvas coordinates to normalized point
 */
export const canvasToPoint = (
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): Point => {
  return {
    x: Math.max(0, Math.min(1, x / canvasWidth)),
    y: Math.max(0, Math.min(1, y / canvasHeight)),
  };
};

/**
 * Calculate arena dimensions based on container height only
 * Arena is always scaled to fit the height with 10px padding at top and bottom
 * and centered horizontally
 */
export const calculateArenaDimensions = (
  containerWidth: number,
  containerHeight: number
): { width: number; height: number; offsetX: number; offsetY: number } => {
  const arenaAspect = ARENA_ASPECT_RATIO;
  const VERTICAL_PADDING = 10; // 10px padding at top and bottom

  // Scale based on height, accounting for 10px padding at top and bottom
  const height = containerHeight - (VERTICAL_PADDING * 2);
  const width = height * arenaAspect;
  
  // Center horizontally if arena is narrower than container
  const offsetX = (containerWidth - width) / 2;
  // Position with 10px padding at the top
  const offsetY = VERTICAL_PADDING;

  return { width, height, offsetX, offsetY };
};

/**
 * Get grid line positions for arena divisions
 */
export const getGridLines = (): {
  vertical: number[];
  horizontal: number[];
} => {
  const vertical: number[] = [];
  const horizontal: number[] = [];

  // 4 divisions along length (vertical lines)
  for (let i = 1; i < ARENA_DIVISIONS_LENGTH; i++) {
    vertical.push(i / ARENA_DIVISIONS_LENGTH);
  }

  // Midpoint along width (horizontal line)
  horizontal.push(0.5);

  return { vertical, horizontal };
};

