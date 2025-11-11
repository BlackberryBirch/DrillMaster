import { Frame, Horse, Point } from '../types';
import { GAIT_SPEEDS } from '../types';

/**
 * Linear interpolation between two values
 */
export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

/**
 * Interpolate between two points
 */
export const lerpPoint = (start: Point, end: Point, t: number): Point => {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
  };
};

/**
 * Interpolate angle (handles wrapping around 2π)
 */
export const lerpAngle = (start: number, end: number, t: number): number => {
  // Normalize angles to 0-2π
  const normalize = (angle: number) => {
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    return angle;
  };

  let startNorm = normalize(start);
  let endNorm = normalize(end);

  // Find shortest path
  let diff = endNorm - startNorm;
  if (Math.abs(diff) > Math.PI) {
    if (diff > 0) {
      diff -= 2 * Math.PI;
    } else {
      diff += 2 * Math.PI;
    }
  }

  return normalize(startNorm + diff * t);
};

/**
 * Find the frame index and interpolation factor for a given time
 */
export const getFrameInterpolation = (
  frames: Frame[],
  time: number
): { frameIndex: number; nextFrameIndex: number | null; t: number } | null => {
  if (frames.length === 0) return null;
  if (frames.length === 1) {
    return { frameIndex: 0, nextFrameIndex: null, t: 0 };
  }

  // Find the frame we're currently in
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const frameEndTime = frame.timestamp + frame.duration;

    if (time >= frame.timestamp && time < frameEndTime) {
      // We're in this frame
      const timeInFrame = time - frame.timestamp;
      const t = frame.duration > 0 ? timeInFrame / frame.duration : 0;
      const nextFrameIndex = i < frames.length - 1 ? i + 1 : null;
      return { frameIndex: i, nextFrameIndex, t: Math.max(0, Math.min(1, t)) };
    }
  }

  // Time is beyond all frames, return last frame
  const lastFrame = frames[frames.length - 1];
  return {
    frameIndex: frames.length - 1,
    nextFrameIndex: null,
    t: 1,
  };
};

/**
 * Interpolate a horse's position between two frames
 */
export const interpolateHorse = (
  horseId: string,
  fromFrame: Frame,
  toFrame: Frame | null,
  t: number
): Horse | null => {
  const fromHorse = fromFrame.horses.find((h) => h.id === horseId);
  if (!fromHorse) return null;

  // If no next frame or t is 0, return horse from current frame
  if (!toFrame || t === 0) {
    return fromHorse;
  }

  // If t is 1, return horse from next frame
  if (t === 1) {
    const toHorse = toFrame.horses.find((h) => h.id === horseId);
    return toHorse || fromHorse;
  }

  // Find corresponding horse in next frame
  const toHorse = toFrame.horses.find((h) => h.id === horseId);
  if (!toHorse) {
    // Horse doesn't exist in next frame, keep current position
    return fromHorse;
  }

  // Interpolate position
  const interpolatedPosition = lerpPoint(fromHorse.position, toHorse.position, t);

  // Interpolate direction
  const interpolatedDirection = lerpAngle(fromHorse.direction, toHorse.direction, t);

  // Use the gait from the current frame (or interpolate if needed)
  // For now, use the gait from the starting frame
  const interpolatedSpeed = fromHorse.speed;

  return {
    ...fromHorse,
    position: interpolatedPosition,
    direction: interpolatedDirection,
    speed: interpolatedSpeed,
  };
};

/**
 * Get all interpolated horses for a given time
 */
export const getInterpolatedHorses = (
  frames: Frame[],
  time: number
): Horse[] => {
  const interpolation = getFrameInterpolation(frames, time);
  if (!interpolation) return [];

  const { frameIndex, nextFrameIndex, t } = interpolation;
  const currentFrame = frames[frameIndex];
  const nextFrame = nextFrameIndex !== null ? frames[nextFrameIndex] : null;

  // Get all unique horse IDs from both frames
  const horseIds = new Set<string>();
  currentFrame.horses.forEach((h) => horseIds.add(h.id));
  if (nextFrame) {
    nextFrame.horses.forEach((h) => horseIds.add(h.id));
  }

  // Interpolate each horse
  return Array.from(horseIds)
    .map((horseId) => interpolateHorse(horseId, currentFrame, nextFrame, t))
    .filter((horse): horse is Horse => horse !== null);
};

