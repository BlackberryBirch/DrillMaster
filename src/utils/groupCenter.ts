import { Horse, Point } from '../types';

const EPSILON = 1e-9;

interface MinimalCircle {
  center: Point;
  radius: number;
}

const distanceBetweenPoints = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

const isPointInsideCircle = (point: Point, circle: MinimalCircle | null): boolean => {
  if (!circle) {
    return false;
  }

  return distanceBetweenPoints(point, circle.center) <= circle.radius + EPSILON;
};

const circleFromTwoPoints = (p1: Point, p2: Point): MinimalCircle => {
  const center = {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };

  return {
    center,
    radius: distanceBetweenPoints(p1, p2) / 2,
  };
};

const circleFromThreePoints = (p1: Point, p2: Point, p3: Point): MinimalCircle => {
  const d =
    2 *
    (p1.x * (p2.y - p3.y) +
      p2.x * (p3.y - p1.y) +
      p3.x * (p1.y - p2.y));

  if (Math.abs(d) < EPSILON) {
    const candidateCircles = [
      circleFromTwoPoints(p1, p2),
      circleFromTwoPoints(p1, p3),
      circleFromTwoPoints(p2, p3),
    ];

    let bestCircle = candidateCircles[0];
    candidateCircles.forEach((circle) => {
      if (
        isPointInsideCircle(p1, circle) &&
        isPointInsideCircle(p2, circle) &&
        isPointInsideCircle(p3, circle) &&
        circle.radius <= bestCircle.radius
      ) {
        bestCircle = circle;
      }
    });

    return bestCircle;
  }

  const p1Sq = p1.x * p1.x + p1.y * p1.y;
  const p2Sq = p2.x * p2.x + p2.y * p2.y;
  const p3Sq = p3.x * p3.x + p3.y * p3.y;

  const ux =
    (p1Sq * (p2.y - p3.y) +
      p2Sq * (p3.y - p1.y) +
      p3Sq * (p1.y - p2.y)) /
    d;
  const uy =
    (p1Sq * (p3.x - p2.x) +
      p2Sq * (p1.x - p3.x) +
      p3Sq * (p2.x - p1.x)) /
    d;

  const center = { x: ux, y: uy };
  return {
    center,
    radius: distanceBetweenPoints(center, p1),
  };
};

const minimalEnclosingCircle = (points: Point[]): MinimalCircle => {
  if (points.length === 0) {
    return { center: { x: 0, y: 0 }, radius: 0 };
  }

  let circle: MinimalCircle | null = null;

  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    if (!circle || !isPointInsideCircle(p, circle)) {
      circle = { center: { ...p }, radius: 0 };
      for (let j = 0; j < i; j += 1) {
        const q = points[j];
        if (!isPointInsideCircle(q, circle)) {
          circle = circleFromTwoPoints(p, q);
          for (let k = 0; k < j; k += 1) {
            const r = points[k];
            if (!isPointInsideCircle(r, circle)) {
              circle = circleFromThreePoints(p, q, r);
            }
          }
        }
      }
    }
  }

  return circle ?? { center: { ...points[0] }, radius: 0 };
};

/**
 * Calculate the center point of a group of horses
 * Uses the center of the minimum enclosing circle rather than a simple mean
 */
export const calculateGroupCenter = (horses: Horse[]): Point => {
  if (horses.length === 0) {
    return { x: 0, y: 0 };
  }

  const points = horses.map((horse) => horse.position);
  const circle = minimalEnclosingCircle(points);
  return circle.center;
};

