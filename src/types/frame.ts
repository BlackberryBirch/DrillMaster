import { Horse } from './horse';
import { Gait } from './gait';

export interface Frame {
  id: string;
  index: number;
  timestamp: number; // seconds from start
  horses: Horse[];
  duration: number; // seconds until next frame
  /** When true, duration is calculated from gait and farthest horse movement; when false, use manual duration only. Default true for new frames. */
  autoDuration?: boolean;
  /** Base gait for this frame; used to auto-calculate duration from movement (default walk). */
  speed?: Gait;
  /** Multiplier applied to gait speed (1 = normal, >1 = faster, <1 = slower). Default 1. */
  speedMultiplier?: number;
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
  autoDuration: true,
  speed: 'walk',
  speedMultiplier: 1,
  isKeyFrame: false,
});

