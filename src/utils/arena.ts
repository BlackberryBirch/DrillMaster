import { Point } from '../types/point';
import { ARENA_ASPECT_RATIO, ARENA_DIVISIONS_LENGTH, ARENA_WIDTH, ARENA_LENGTH } from '../constants/arena';

/**
 * Convert point in meters from center to canvas coordinates
 * @param point Point in meters from arena center
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @returns Canvas coordinates in pixels
 */
export const pointToCanvas = (
  point: Point,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } => {
  // Convert meters from center to normalized (0-1), then to canvas pixels
  // x: meters from -ARENA_LENGTH/2 to +ARENA_LENGTH/2 -> 0 to 1 -> 0 to canvasWidth
  // y: meters from -ARENA_WIDTH/2 to +ARENA_WIDTH/2 -> 0 to 1 -> 0 to canvasHeight
  const normalizedX = (point.x / ARENA_LENGTH) + 0.5;
  const normalizedY = (point.y / ARENA_WIDTH) + 0.5;
  
  return {
    x: Math.max(0, Math.min(canvasWidth, normalizedX * canvasWidth)),
    y: Math.max(0, Math.min(canvasHeight, normalizedY * canvasHeight)),
  };
};

/**
 * Convert canvas coordinates to point in meters from center
 * @param x Canvas x coordinate in pixels
 * @param y Canvas y coordinate in pixels
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @returns Point in meters from arena center
 */
export const canvasToPoint = (
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): Point => {
  // Convert canvas pixels to normalized (0-1), then to meters from center
  // x: 0 to canvasWidth -> 0 to 1 -> -ARENA_LENGTH/2 to +ARENA_LENGTH/2
  // y: 0 to canvasHeight -> 0 to 1 -> -ARENA_WIDTH/2 to +ARENA_WIDTH/2
  const normalizedX = Math.max(0, Math.min(1, x / canvasWidth));
  const normalizedY = Math.max(0, Math.min(1, y / canvasHeight));
  
  return {
    x: (normalizedX - 0.5) * ARENA_LENGTH,
    y: (normalizedY - 0.5) * ARENA_WIDTH,
  };
};

/** Extra space below the arena for the maneuver name label (font ~14px + padding). */
const MANEUVER_LABEL_SPACE = 40;

/**
 * Calculate arena dimensions so the arena fits entirely in the container (centered).
 * Uses padding on all sides and reserves space below the arena for the maneuver name.
 */
export const calculateArenaDimensions = (
  containerWidth: number,
  containerHeight: number
): { width: number; height: number; offsetX: number; offsetY: number } => {
  const arenaAspect = ARENA_ASPECT_RATIO;
  const PADDING = 20; // px on sides and top
  const BOTTOM_PADDING = PADDING + MANEUVER_LABEL_SPACE; // extra room for maneuver name

  const availableWidth = Math.max(0, containerWidth - PADDING * 2);
  const availableHeight = Math.max(0, containerHeight - PADDING - BOTTOM_PADDING);

  // Fit arena (aspect ratio length:width = 2:1) inside available area
  const widthByHeight = availableHeight * arenaAspect;
  const heightByWidth = availableWidth / arenaAspect;

  let width: number;
  let height: number;
  if (widthByHeight <= availableWidth) {
    width = widthByHeight;
    height = availableHeight;
  } else {
    width = availableWidth;
    height = heightByWidth;
  }

  const offsetX = (containerWidth - width) / 2;
  // Center arena in the area above the bottom reserve so the maneuver name stays visible
  const offsetY = PADDING + (availableHeight - height) / 2;

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

