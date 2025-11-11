export type Gait = 'walk' | 'trot' | 'canter';

export const GAITS: Gait[] = ['walk', 'trot', 'canter'];

export const GAIT_COLORS: Record<Gait, string> = {
  walk: '#10B981', // green
  trot: '#F59E0B', // yellow/amber
  canter: '#EF4444', // red
};

export const GAIT_SPEEDS: Record<Gait, number> = {
  walk: 1.0,
  trot: 2.0,
  canter: 3.0,
};

