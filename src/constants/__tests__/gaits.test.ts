import { describe, it, expect } from 'vitest';
import { getGaitSpeedMultiplier } from '../gaits';
import { GAIT_SPEEDS, GAIT_COLORS, Gait } from '../../types';

describe('gaits', () => {
  describe('getGaitSpeedMultiplier', () => {
    it('should return correct speed multiplier for walk', () => {
      expect(getGaitSpeedMultiplier('walk')).toBe(GAIT_SPEEDS.walk);
    });

    it('should return correct speed multiplier for trot', () => {
      expect(getGaitSpeedMultiplier('trot')).toBe(GAIT_SPEEDS.trot);
    });

    it('should return correct speed multiplier for canter', () => {
      expect(getGaitSpeedMultiplier('canter')).toBe(GAIT_SPEEDS.canter);
    });

  });

  describe('GAIT_SPEEDS', () => {
    it('should have speed values for all gaits', () => {
      const gaits: Gait[] = ['walk', 'trot', 'canter'];
      gaits.forEach(gait => {
        expect(GAIT_SPEEDS[gait]).toBeGreaterThan(0);
      });
    });

    it('should have speeds in ascending order', () => {
      expect(GAIT_SPEEDS.walk).toBeLessThan(GAIT_SPEEDS.trot);
      expect(GAIT_SPEEDS.trot).toBeLessThan(GAIT_SPEEDS.canter);
    });
  });

  describe('GAIT_COLORS', () => {
    it('should have color values for all gaits', () => {
      const gaits: Gait[] = ['walk', 'trot', 'canter'];
      gaits.forEach(gait => {
        expect(GAIT_COLORS[gait]).toBeTruthy();
        expect(typeof GAIT_COLORS[gait]).toBe('string');
      });
    });
  });
});

