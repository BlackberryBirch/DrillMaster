import { Horse, Point } from '../types';
import { calculateGroupCenter } from './groupCenter';

/**
 * Calculates Euclidean distance between two points
 */
function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalizes an angle to [0, 2π] range
 */
function normalizeAngle(angle: number): number {
  let normalized = angle;
  while (normalized < 0) normalized += 2 * Math.PI;
  while (normalized >= 2 * Math.PI) normalized -= 2 * Math.PI;
  return normalized;
}

/**
 * Distributes horses evenly along a line between the two most separated horses.
 * Projects all horses onto the line and distributes them evenly along it.
 * @param horses Array of horses to distribute
 * @returns Map of horse IDs to their new positions
 */
export function distributeHorsesEvenly(horses: Horse[]): Map<string, Point> {
  if (horses.length < 3) {
    return new Map();
  }

  // Find the two horses that are farthest apart
  let maxDistance = 0;
  let horse1 = horses[0];
  let horse2 = horses[1];

  for (let i = 0; i < horses.length; i++) {
    for (let j = i + 1; j < horses.length; j++) {
      const dist = distance(horses[i].position, horses[j].position);
      if (dist > maxDistance) {
        maxDistance = dist;
        horse1 = horses[i];
        horse2 = horses[j];
      }
    }
  }

  // Create a line from horse1 to horse2
  const p1 = horse1.position;
  const p2 = horse2.position;
  const lineVector = { x: p2.x - p1.x, y: p2.y - p1.y };
  const lineLength = Math.sqrt(lineVector.x * lineVector.x + lineVector.y * lineVector.y);

  if (lineLength === 0) {
    // All horses are at the same position, nothing to do
    return new Map();
  }

  // Normalize the line vector
  const lineUnit = { x: lineVector.x / lineLength, y: lineVector.y / lineLength };

  // Project each horse onto the line and calculate its position along the line
  // Position is measured as distance from p1 along the line
  const horseProjections = horses.map((horse) => {
    const toHorse = { x: horse.position.x - p1.x, y: horse.position.y - p1.y };
    // Dot product gives the distance along the line
    const projection = toHorse.x * lineUnit.x + toHorse.y * lineUnit.y;
    return { horse, projection };
  });

  // Sort by projection distance
  horseProjections.sort((a, b) => a.projection - b.projection);

  // Distribute all horses evenly along the line
  const newPositions = new Map<string, Point>();

  horseProjections.forEach(({ horse }, index) => {
    const t = index / (horseProjections.length - 1);
    const newX = p1.x + lineVector.x * t;
    const newY = p1.y + lineVector.y * t;
    newPositions.set(horse.id, { x: newX, y: newY });
  });

  return newPositions;
}

/**
 * Result of distributing horses around a circle
 */
export interface DistributedHorseResult {
  position: Point;
  direction: number;
}

/**
 * Distributes horses evenly around a circle.
 * First places horses on the circle edge preserving their polar angles,
 * then redistributes them evenly around the circle while rotating their directions accordingly.
 * @param horses Array of horses to distribute
 * @returns Map of horse IDs to their new positions and directions
 */
export function distributeHorsesEvenlyAroundCircle(
  horses: Horse[],
  enforceEvenSpacing = true
): Map<string, DistributedHorseResult> {
  if (horses.length < 2) {
    return new Map();
  }

  // Use the same center calculation as groupSelectionControls for consistency
  const center = calculateGroupCenter(horses);

  // Calculate radius (distance from center to farthest horse)
  let maxDist = 0;
  horses.forEach((horse) => {
    const dist = distance(center, horse.position);
    maxDist = Math.max(maxDist, dist);
  });

  // If all horses are at the same position, nothing to do
  if (maxDist === 0) {
    return new Map();
  }

  // Step 1: Save original positions and directions
  const originalPositions = new Map<string, { position: Point; direction: number }>();
  horses.forEach((horse) => {
    originalPositions.set(horse.id, {
      position: { ...horse.position },
      direction: horse.direction || 0,
    });
  });

  // Step 2: Place horses on circle edge preserving their polar angles
  const horsesOnCircle = new Map<string, { position: Point; angle: number; direction: number }>();

  horses.forEach((horse) => {
    const originalPos = originalPositions.get(horse.id)!;

    // Calculate polar coordinates (angle and distance from center)
    const dx = originalPos.position.x - center.x;
    const dy = originalPos.position.y - center.y;
    const polarAngle = Math.atan2(dy, dx);

    // Calculate position on circle edge using preserved polar angle
    const newX = center.x + maxDist * Math.cos(polarAngle);
    const newY = center.y + maxDist * Math.sin(polarAngle);

    // Calculate both tangential directions
    const clockwiseDirection = polarAngle + Math.PI / 2;
    const counterclockwiseDirection = polarAngle - Math.PI / 2;

    // Get the horse's current direction
    const currentDirection = originalPos.direction;

    // Normalize angles to [0, 2π] for comparison
    const currentNorm = normalizeAngle(currentDirection);
    const clockwiseNorm = normalizeAngle(clockwiseDirection);
    const counterclockwiseNorm = normalizeAngle(counterclockwiseDirection);

    // Calculate angular distances (handling wraparound)
    const distToClockwise = Math.min(
      Math.abs(currentNorm - clockwiseNorm),
      2 * Math.PI - Math.abs(currentNorm - clockwiseNorm)
    );
    const distToCounterclockwise = Math.min(
      Math.abs(currentNorm - counterclockwiseNorm),
      2 * Math.PI - Math.abs(currentNorm - counterclockwiseNorm)
    );

    // Choose the direction that's closer to the current orientation
    const tangentialDirection = distToClockwise < distToCounterclockwise
      ? clockwiseDirection
      : counterclockwiseDirection;

    horsesOnCircle.set(horse.id, {
      position: { x: newX, y: newY },
      angle: polarAngle,
      direction: tangentialDirection,
    });
  });

  // If we don't need even spacing (GroupSelectionControls), return Step 2 result
  if (!enforceEvenSpacing) {
    const step2Result = new Map<string, DistributedHorseResult>();
    horsesOnCircle.forEach((data, horseId) => {
      step2Result.set(horseId, {
        position: data.position,
        direction: data.direction,
      });
    });
    return step2Result;
  }

  // Step 3: Redistribute horses to evenly spaced angles
  const horsesSorted = Array.from(horsesOnCircle.entries())
    .map(([id, data]) => ({
      id,
      ...data,
      normalizedAngle: normalizeAngle(data.angle),
    }))
    .sort((a, b) => a.normalizedAngle - b.normalizedAngle);

  const numHorses = horsesSorted.length;
  const angleStep = (2 * Math.PI) / numHorses;

  // Store the evenly spaced angles for each horse (before rotation optimization)
  const horseEvenlySpacedAngles = new Map<string, number>();
  
  horsesSorted.forEach((horseData, index) => {
    // Calculate evenly spaced angle (0, angleStep, 2*angleStep, ...)
    const evenlySpacedAngle = index * angleStep;
    horseEvenlySpacedAngles.set(horseData.id, evenlySpacedAngle);
  });

  // Step 4: Find optimal rotation that minimizes total distance from original positions
  // Try rotations from 0 to 360 degrees in 5-degree increments
  const rotationStepDegrees = 5;
  const rotationStepRadians = (rotationStepDegrees * Math.PI) / 180;
  const numRotations = Math.floor(360 / rotationStepDegrees); // 72 rotations (0, 5, 10, ..., 355)
  
  let minTotalDistance = Infinity;
  let optimalHorses = new Map<string, DistributedHorseResult>();

  for (let i = 0; i < numRotations; i++) {
    const rotationAngle = i * rotationStepRadians;
    
    // Calculate positions and directions for this rotation
    const rotatedHorses = new Map<string, DistributedHorseResult>();
    let totalDistance = 0;

    horsesSorted.forEach((horseData) => {
      const evenlySpacedAngle = horseEvenlySpacedAngles.get(horseData.id)!;
      const rotatedAngle = evenlySpacedAngle + rotationAngle;

      // Calculate position on circle at rotated angle
      const newX = center.x + maxDist * Math.cos(rotatedAngle);
      const newY = center.y + maxDist * Math.sin(rotatedAngle);

      // Calculate how much the horse was rotated from its original angle on circle
      const originalNormalizedAngle = horseData.normalizedAngle;
      let rotationDelta = rotatedAngle - originalNormalizedAngle;

      // Normalize rotation delta to [-π, π] range for shortest rotation
      if (rotationDelta > Math.PI) {
        rotationDelta -= 2 * Math.PI;
      } else if (rotationDelta < -Math.PI) {
        rotationDelta += 2 * Math.PI;
      }

      // Rotate the original direction by the same amount as the position rotation
      const originalDirection = originalPositions.get(horseData.id)?.direction || 0;
      const newDirection = originalDirection + rotationDelta;

      const newPosition: Point = { x: newX, y: newY };
      rotatedHorses.set(horseData.id, {
        position: newPosition,
        direction: newDirection,
      });

      // Calculate distance from original position
      const originalPos = originalPositions.get(horseData.id)!;
      const dist = distance(originalPos.position, newPosition);
      totalDistance += dist * dist;
    });

    // Check if this rotation minimizes total distance
    if (totalDistance < minTotalDistance) {
      minTotalDistance = totalDistance;
      // Create a new Map to avoid reference issues
      optimalHorses = new Map(rotatedHorses);
    }
  }

  return optimalHorses;
}

