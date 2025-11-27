import { Horse, Point } from '../types';

/**
 * Aligns horses horizontally by setting all horses to the same Y position (average of their current Y positions)
 * @param horses Array of horses to align
 * @returns Map of horse IDs to their new positions
 */
export function alignHorsesHorizontally(horses: Horse[]): Map<string, Point> {
  if (horses.length < 2) {
    return new Map();
  }

  // Calculate average Y position
  const avgY = horses.reduce((sum, h) => sum + h.position.y, 0) / horses.length;

  // Create map of new positions
  const newPositions = new Map<string, Point>();
  horses.forEach((horse) => {
    newPositions.set(horse.id, {
      x: horse.position.x,
      y: avgY,
    });
  });

  return newPositions;
}

/**
 * Aligns horses vertically by setting all horses to the same X position (average of their current X positions)
 * @param horses Array of horses to align
 * @returns Map of horse IDs to their new positions
 */
export function alignHorsesVertically(horses: Horse[]): Map<string, Point> {
  if (horses.length < 2) {
    return new Map();
  }

  // Calculate average X position
  const avgX = horses.reduce((sum, h) => sum + h.position.x, 0) / horses.length;

  // Create map of new positions
  const newPositions = new Map<string, Point>();
  horses.forEach((horse) => {
    newPositions.set(horse.id, {
      x: avgX,
      y: horse.position.y,
    });
  });

  return newPositions;
}

