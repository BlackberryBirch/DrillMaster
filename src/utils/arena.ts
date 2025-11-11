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
 * Calculate arena dimensions maintaining aspect ratio
 */
export const calculateArenaDimensions = (
  containerWidth: number,
  containerHeight: number
): { width: number; height: number; offsetX: number; offsetY: number } => {
  const containerAspect = containerWidth / containerHeight;
  const arenaAspect = ARENA_ASPECT_RATIO;

  let width: number;
  let height: number;
  let offsetX = 0;
  let offsetY = 0;

  if (containerAspect > arenaAspect) {
    // Container is wider than arena aspect ratio
    height = containerHeight;
    width = height * arenaAspect;
    offsetX = (containerWidth - width) / 2;
  } else {
    // Container is taller than arena aspect ratio
    width = containerWidth;
    height = width / arenaAspect;
    offsetY = (containerHeight - height) / 2;
  }

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

