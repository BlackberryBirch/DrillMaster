import { Frame, Horse, Point } from '../types';

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
 * Calculate control points for a cubic bezier curve between two positions
 * Returns the 4 control points: P0 (start), P1, P2, P3 (end)
 */
export const getBezierControlPoints = (
  startPos: Point,
  startDir: number,
  endPos: Point,
  endDir: number
): { P0: Point; P1: Point; P2: Point; P3: Point } => {
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
  const baseCurveStrength = Math.min(distance * 0.4, 20); // Base: 80% of distance, max 25% of arena
  const turnMultiplier = 1 + (absAngleDiff / Math.PI) * 0.5; // Up to 1.5x for 180° turns
  const curveStrength = baseCurveStrength * turnMultiplier;
  
  // Get direction vectors (normalized)
  const startVec = directionToVector(startDir);
  const endVec = directionToVector(endDir);
  
  // Calculate control points for cubic bezier:
  // P0 = startPos (start point)
  // P1 = extend forward from start in starting direction
  // P2 = extend backward from end in reverse ending direction
  // P3 = endPos (end point)
  const P0 = startPos;
  const P1 = {
    x: startPos.x + startVec.x * curveStrength,
    y: startPos.y + startVec.y * curveStrength,
  };
  
  const P2 = {
    x: endPos.x - endVec.x * curveStrength,
    y: endPos.y - endVec.y * curveStrength,
  };
  const P3 = endPos;
  
  return { P0, P1, P2, P3 };
};

/**
 * Euclidean distance between two points.
 */
const distance = (a: Point, b: Point): number =>
  Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

/**
 * Sample a cubic Bezier curve (P0, P1, P2, P3) into an array of points and
 * a parallel array of relative distance travelled at each point (0 at start, 1 at end).
 * Relative distance at index i = (sum of segment lengths from start to point i) / total length.
 */
export const sampleBezierCurve = (
  P0: Point,
  P1: Point,
  P2: Point,
  P3: Point,
  numSamples: number = 32
): {position: Point, tangent: Point}[] => {
  const points: {position: Point, tangent: Point}[] = [];
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    points.push(interpolatePositionAlongCurve(P0, P1, P2, P3, t));
  }
  return points;
}

export const interpolatePathPoints = (
  points: {position: Point, tangent: Point}[],
  relativeDistance: number
): {position: Point, tangent: Point} => {
  if (relativeDistance <= 0) {
    return points[0];
  }
  let total = 0;
  const segmentLengths: number[] = [];
  segmentLengths.push(0);
  for (let i = 0; i < points.length - 1; i++) {
    const d = distance(points[i].position, points[i + 1].position);
    segmentLengths.push(d);
    total += d;
  }
  const scaledSegmentLengths = segmentLengths.map((length) => length / total);
  for (let i = 1; i < scaledSegmentLengths.length; i++) {
    if (relativeDistance < scaledSegmentLengths[i]) {
      const t = relativeDistance / scaledSegmentLengths[i];
      return {
        position: lerpPoint(points[i-1].position, points[i].position, t),
        tangent: lerpPoint(points[i-1].tangent, points[i].tangent, t)
      };
    }
    relativeDistance -= scaledSegmentLengths[i];
  }
  return points[points.length - 1];
};

/**
 * Calculate a curved path position using cubic bezier curve with 4 control points
 * The curve respects the starting and ending directions to create a natural arc
 * where the horse moves forward in its facing direction
 * Returns both the position and the tangent vector at time t
 */
const interpolatePositionAlongCurve = (
  P0: Point,
  P1: Point,
  P2: Point,
  P3: Point,
  t: number
): { position: Point; tangent: Point } => {  
  // Cubic bezier curve: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
  const oneMinusT = 1 - t;
  const oneMinusT2 = oneMinusT * oneMinusT;
  const oneMinusT3 = oneMinusT2 * oneMinusT;
  const t2 = t * t;
  const t3 = t2 * t;
  
  const x = oneMinusT3 * P0.x + 
            3 * oneMinusT2 * t * P1.x + 
            3 * oneMinusT * t2 * P2.x + 
            t3 * P3.x;
  const y = oneMinusT3 * P0.y + 
            3 * oneMinusT2 * t * P1.y + 
            3 * oneMinusT * t2 * P2.y + 
            t3 * P3.y;
  
  // Calculate tangent vector: B'(t) = 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2)
  const tangentX = 3 * oneMinusT2 * (P1.x - P0.x) + 
                   6 * oneMinusT * t * (P2.x - P1.x) + 
                   3 * t2 * (P3.x - P2.x);
  const tangentY = 3 * oneMinusT2 * (P1.y - P0.y) + 
                   6 * oneMinusT * t * (P2.y - P1.y) + 
                   3 * t2 * (P3.y - P2.y);
  
  // Normalize the tangent vector
  const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
  const normalizedTangent = tangentLength > 0 
    ? { x: tangentX / tangentLength, y: tangentY / tangentLength }
    : { x: 0, y: 0 };
  
  return { 
    position: { x, y },
    tangent: normalizedTangent
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

  const interpolationT = t;

  // Distance between start and end (positions are in meters from center)
  const dx = toHorse.position.x - fromHorse.position.x;
  const dy = toHorse.position.y - fromHorse.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Sample the Bezier curve to get arc-length parameterization, then map time to
  // curve parameter so the horse moves at constant speed along the path
  const { P0, P1, P2, P3 } = getBezierControlPoints(
    fromHorse.position,
    fromHorse.direction,
    toHorse.position,
    toHorse.direction
  );
  const points = sampleBezierCurve(P0, P1, P2, P3);
  const {position: interpolatedPosition, tangent} = interpolatePathPoints(points, interpolationT);

  // Use lerp for direction when distance is small (< 4 m) to avoid tangent noise;
  // use tangent when distance is larger for natural curve-following
  const SMALL_DISTANCE_THRESHOLD_M = 4;
  const interpolatedDirection =
    distance < SMALL_DISTANCE_THRESHOLD_M
      ? lerpAngle(fromHorse.direction, toHorse.direction, interpolationT)
      : Math.atan2(tangent.y, tangent.x);

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

/**
 * Get bezier control points for all horses being interpolated at a given time
 * Returns a map of horse label to control points
 */
export const getBezierControlPointsForHorses = (
  frames: Frame[],
  time: number
): Map<string | number, { P0: Point; P1: Point; P2: Point; P3: Point }> => {
  const interpolation = getFrameInterpolation(frames, time);
  if (!interpolation) return new Map();

  const { frameIndex, nextFrameIndex } = interpolation;
  const currentFrame = frames[frameIndex];
  const nextFrame = nextFrameIndex !== null ? frames[nextFrameIndex] : null;

  if (!nextFrame) return new Map();

  // Get all unique horse labels from both frames
  const horseLabels = new Set<string | number>();
  currentFrame.horses.forEach((h) => horseLabels.add(h.label));
  nextFrame.horses.forEach((h) => horseLabels.add(h.label));

  const controlPointsMap = new Map<string | number, { P0: Point; P1: Point; P2: Point; P3: Point }>();

  // Get control points for each horse
  Array.from(horseLabels).forEach((horseLabel) => {
    const fromHorse = currentFrame.horses.find((h) => h.label === horseLabel);
    const toHorse = nextFrame.horses.find((h) => h.label === horseLabel);

    if (fromHorse && toHorse) {
      const controlPoints = getBezierControlPoints(
        fromHorse.position,
        fromHorse.direction,
        toHorse.position,
        toHorse.direction
      );
      controlPointsMap.set(horseLabel, controlPoints);
    }
  });

  return controlPointsMap;
};

