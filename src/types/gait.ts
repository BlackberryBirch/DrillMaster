export type Gait = 'walk' | 'trot' | 'canter';

export const GAITS: Gait[] = ['walk', 'trot', 'canter'];

export const GAIT_COLORS: Record<Gait, string> = {
  walk: '#10B981', // green
  trot: '#F59E0B', // yellow/amber
  canter: '#EF4444', // red
};

/** Relative speed multipliers (e.g. for animation). */
export const GAIT_SPEEDS: Record<Gait, number> = {
  walk: 2.0,
  trot: 4.0,
  canter: 5.0,
};
