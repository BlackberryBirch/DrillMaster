import { Gait } from '../types';
import { ARROW_LENGTH_MULTIPLIERS, ARROW_GAIT_THRESHOLDS } from '../constants/horse';

/**
 * Normalize an angle to the range [0, 2π)
 */
export const normalizeAngle = (angle: number): number => {
  let normalized = angle;
  while (normalized < 0) normalized += 2 * Math.PI;
  while (normalized >= 2 * Math.PI) normalized -= 2 * Math.PI;
  return normalized;
};

/**
 * Calculate direction and speed from arrow drag position
 * @param localX - X position in horse's local coordinate system
 * @param localY - Y position in horse's local coordinate system
 * @param currentDirection - Current horse direction in radians
 * @param horseLength - Length of the horse in pixels
 * @returns Object with normalized direction and calculated speed
 */
export const calculateDirectionAndSpeedFromDrag = (
  localX: number,
  localY: number,
  currentDirection: number,
  horseLength: number
): { direction: number; speed: Gait } => {
  // Calculate vector from horse center (0, 0 in local coords) to arrow end
  const dx = localX;
  const dy = localY;

  // Calculate direction in local coordinate system
  // In local coords: positive X = forward (the arrow points along +X axis)
  const localAngle = Math.atan2(dy, dx);
  // The new world direction is the horse's current direction plus the local angle
  const direction = normalizeAngle(currentDirection + localAngle);

  // Calculate distance (arrow length)
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Determine speed based on distance thresholds
  const walkThreshold = horseLength * ARROW_GAIT_THRESHOLDS.walk;
  const trotThreshold = horseLength * ARROW_GAIT_THRESHOLDS.trot;

  let speed: Gait;
  if (distance < walkThreshold) {
    speed = 'walk';
  } else if (distance < trotThreshold) {
    speed = 'trot';
  } else {
    speed = 'canter';
  }

  return { direction, speed };
};

/**
 * Calculate arrow end position based on speed
 * @param horseLength - Length of the horse in pixels
 * @param speed - Current gait/speed
 * @returns Object with arrow end X and Y coordinates in local coordinate system
 */
export const calculateArrowEndPosition = (
  horseLength: number,
  speed: Gait
): { x: number; y: number } => {
  const arrowLength = horseLength * ARROW_LENGTH_MULTIPLIERS[speed];
  return {
    x: horseLength / 2 + arrowLength,
    y: 0,
  };
};

/**
 * Stop event propagation for Konva events
 * Useful for preventing clicks/drags from bubbling up
 */
export const stopEventPropagation = (e: any): void => {
  e.cancelBubble = true;
  if (e.evt) {
    e.evt.stopPropagation();
  }
};

