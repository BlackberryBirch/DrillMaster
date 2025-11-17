import { Frame, Horse, Point } from '../types';

/**
 * Easing function for smooth animation (ease-in-out)
 * Provides smoother acceleration and deceleration
 */
export const easeInOut = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

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
 * Calculate a direction vector from an angle (in radians)
 * Returns a normalized vector pointing in the direction
 */
const directionToVector = (angle: number): Point => {
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
};

/**
 * Calculate a curved path position using quadratic bezier curve
 * The curve respects the starting and ending directions to create a natural arc
 * where the horse moves forward in its facing direction
 */
const interpolatePositionAlongCurve = (
  startPos: Point,
  startDir: number,
  endPos: Point,
  endDir: number,
  t: number
): Point => {
  // Calculate the distance between start and end
  const dx = endPos.x - startPos.x;
  const dy = endPos.y - startPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate the angle difference between start and end directions
  // This helps determine how much the curve should bend
  let angleDiff = endDir - startDir;
  // Normalize to -π to π range
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  const absAngleDiff = Math.abs(angleDiff);
  
  // Base curve strength on distance, but increase it for sharper turns
  // Sharp turns (large angle difference) need more pronounced curves
  const baseCurveStrength = Math.min(distance * 0.4, 0.25); // Base: 40% of distance, max 25% of arena
  const turnMultiplier = 1 + (absAngleDiff / Math.PI) * 0.5; // Up to 1.5x for 180° turns
  const curveStrength = baseCurveStrength * turnMultiplier;
  
  // Get direction vectors (normalized)
  const startVec = directionToVector(startDir);
  const endVec = directionToVector(endDir);
  
  // Calculate control points:
  // - Control point 1: extend forward from start in starting direction
  // - Control point 2: extend backward from end in reverse ending direction
  // The length of extension determines how much the curve bends
  const control1 = {
    x: startPos.x + startVec.x * curveStrength,
    y: startPos.y + startVec.y * curveStrength,
  };
  
  const control2 = {
    x: endPos.x - endVec.x * curveStrength,
    y: endPos.y - endVec.y * curveStrength,
  };
  
  // Use the midpoint of the two control points as the bezier control point
  // This creates a smooth curve that respects both directions
  const controlPoint = {
    x: (control1.x + control2.x) / 2,
    y: (control1.y + control2.y) / 2,
  };
  
  // Quadratic bezier curve: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
  const oneMinusT = 1 - t;
  const x = oneMinusT * oneMinusT * startPos.x + 
            2 * oneMinusT * t * controlPoint.x + 
            t * t * endPos.x;
  const y = oneMinusT * oneMinusT * startPos.y + 
            2 * oneMinusT * t * controlPoint.y + 
            t * t * endPos.y;
  
  return { x, y };
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

  const startNorm = normalize(start);
  const endNorm = normalize(end);

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
  return {
    frameIndex: frames.length - 1,
    nextFrameIndex: null,
    t: 1,
  };
};

/**
 * Interpolate a horse's position between two frames
 * Matches horses by label (not ID) since IDs change between frames
 */
export const interpolateHorse = (
  horseLabel: string | number,
  fromFrame: Frame,
  toFrame: Frame | null,
  t: number
): Horse | null => {
  const fromHorse = fromFrame.horses.find((h) => h.label === horseLabel);
  if (!fromHorse) return null;

  // If no next frame or t is 0, return horse from current frame
  if (!toFrame || t === 0) {
    return fromHorse;
  }

  // If t is 1, return horse from next frame
  if (t === 1) {
    const toHorse = toFrame.horses.find((h) => h.label === horseLabel);
    return toHorse || fromHorse;
  }

  // Find corresponding horse in next frame by label
  const toHorse = toFrame.horses.find((h) => h.label === horseLabel);
  if (!toHorse) {
    // Horse doesn't exist in next frame, keep current position
    return fromHorse;
  }

  // Check if the gait (speed) is the same between frames
  // If same gait, use linear interpolation for constant speed
  // If different gait, use easing for smoother transitions
  const sameGait = fromHorse.speed === toHorse.speed;
  const interpolationT = sameGait ? t : easeInOut(t);

  // Interpolate position along a curved path that respects the horse's facing direction
  // This creates a natural arc where the horse moves forward in its current direction
  const interpolatedPosition = interpolatePositionAlongCurve(
    fromHorse.position,
    fromHorse.direction,
    toHorse.position,
    toHorse.direction,
    interpolationT
  );

  // Interpolate direction
  const interpolatedDirection = lerpAngle(fromHorse.direction, toHorse.direction, interpolationT);

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
 * Matches horses by label (not ID) since IDs change between frames
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

  // Get all unique horse labels from both frames
  // Use labels instead of IDs because IDs change when frames are copied
  const horseLabels = new Set<string | number>();
  currentFrame.horses.forEach((h) => horseLabels.add(h.label));
  if (nextFrame) {
    nextFrame.horses.forEach((h) => horseLabels.add(h.label));
  }

  // Interpolate each horse by label
  return Array.from(horseLabels)
    .map((horseLabel) => interpolateHorse(horseLabel, currentFrame, nextFrame, t))
    .filter((horse): horse is Horse => horse !== null);
};

