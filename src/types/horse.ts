import { Point } from './point';
import { Gait } from './gait';

export interface Horse {
  id: string;
  label: string | number;
  position: Point;
  direction: number; // radians (0 = right, π/2 = up, π = left, 3π/2 = down)
  speed: Gait;
  locked: boolean; // part of a sub-pattern?
  subPatternId?: string;
}

export const createHorse = (
  id: string,
  label: string | number,
  position: Point,
  direction: number = 0,
  speed: Gait = 'walk'
): Horse => ({
  id,
  label,
  position,
  direction,
  speed,
  locked: false,
});

