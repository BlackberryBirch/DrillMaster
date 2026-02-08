import { Horse } from './horse';

export interface Frame {
  id: string;
  index: number;
  timestamp: number; // seconds from start
  horses: Horse[];
  duration: number; // seconds until next frame
  /** When true, this frame is marked as a key frame (e.g. for printing or maneuver names). */
  isKeyFrame?: boolean;
  /** Optional name for the maneuver at this frame (e.g. "Circle left", "Line abreast"). Shown on the arena when the frame is active. */
  maneuverName?: string;
}

export const createFrame = (
  id: string,
  index: number,
  timestamp: number = 0,
  duration: number = 5.0
): Frame => ({
  id,
  index,
  timestamp,
  horses: [],
  duration,
  isKeyFrame: false,
});

