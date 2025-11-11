import { Horse } from './horse';

export interface Frame {
  id: string;
  index: number;
  timestamp: number; // seconds from start
  horses: Horse[];
  duration: number; // seconds until next frame
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
});

