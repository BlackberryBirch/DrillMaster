import { Frame } from '../types/frame';
import { GAIT_SPEEDS } from '../constants/gaits';

const MIN_DURATION = 0.5;
const MAX_DURATION = 120;

/**
 * Euclidean distance in meters between two positions.
 */
function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/**
 * Max distance (meters) any horse moves from fromFrame to toFrame.
 * Horses are matched by label. Returns 0 if no matching horses.
 */
export function getMaxDistanceMoved(fromFrame: Frame, toFrame: Frame): number {
  let maxDist = 0;
  for (const horse of toFrame.horses) {
    const fromHorse = fromFrame.horses.find(
      (h) => String(h.label) === String(horse.label)
    );
    if (fromHorse) {
      const d = distance(fromHorse.position, horse.position);
      if (d > maxDist) maxDist = d;
    }
  }
  return maxDist;
}

/**
 * Effective speed in m/s for a frame (gait speed × speedMultiplier).
 */
export function getEffectiveSpeedMps(frame: Frame): number {
  const gait = frame.speed ?? 'walk';
  const mps = GAIT_SPEEDS[gait];
  const mult = frame.speedMultiplier ?? 1;
  return mps * mult;
}

/**
 * Compute duration (seconds) for a frame from this frame to the next frame.
 * duration = maxDistanceMoved(current → next) / effectiveSpeed, clamped to [MIN_DURATION, MAX_DURATION].
 * For the last frame (no next frame), returns the frame's current duration.
 */
export function computeDurationFromMovement(
  frame: Frame,
  nextFrame: Frame | null
): number {
  if (!nextFrame) return frame.duration;
  const maxDist = getMaxDistanceMoved(frame, nextFrame);
  const speed = getEffectiveSpeedMps(frame);
  if (speed <= 0) return frame.duration;
  const duration = maxDist / speed;
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration));
}
