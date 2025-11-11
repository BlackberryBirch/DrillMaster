import { Gait, GAIT_SPEEDS, GAIT_COLORS } from '../types/gait';

export { GAIT_SPEEDS, GAIT_COLORS, type Gait };

// Relative speeds for animation interpolation
export const getGaitSpeedMultiplier = (gait: Gait): number => {
  return GAIT_SPEEDS[gait];
};

