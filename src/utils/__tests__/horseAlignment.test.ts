import { describe, it, expect } from 'vitest';
import { alignHorsesHorizontally, alignHorsesVertically } from '../horseAlignment';
import { createHorse, Horse } from '../../types';
import { generateId } from '../uuid';

describe('horseAlignment', () => {
  describe('alignHorsesHorizontally', () => {
    it('should return empty map for less than 2 horses', () => {
      const horses: Horse[] = [];
      const result = alignHorsesHorizontally(horses);
      expect(result.size).toBe(0);

      const singleHorse = [createHorse(generateId(), 1, { x: 0, y: 0 })];
      const result2 = alignHorsesHorizontally(singleHorse);
      expect(result2.size).toBe(0);
    });

    it('should align 2 horses horizontally', () => {
      const horse1 = createHorse(generateId(), 1, { x: -24, y: -8 });
      const horse2 = createHorse(generateId(), 2, { x: 0, y: 8 });

      const result = alignHorsesHorizontally([horse1, horse2]);

      const avgY = (-8 + 8) / 2; // 0
      expect(result.get(horse1.id)?.y).toBeCloseTo(avgY, 5);
      expect(result.get(horse2.id)?.y).toBeCloseTo(avgY, 5);
      expect(result.get(horse1.id)?.x).toBe(-24);
      expect(result.get(horse2.id)?.x).toBe(0);
    });

    it('should align 3 horses horizontally', () => {
      const horse1 = createHorse(generateId(), 1, { x: -24, y: -8 });
      const horse2 = createHorse(generateId(), 2, { x: 0, y: 8 });
      const horse3 = createHorse(generateId(), 3, { x: 24, y: -4 });

      const result = alignHorsesHorizontally([horse1, horse2, horse3]);

      const avgY = (-8 + 8 + (-4)) / 3; // -4/3 ≈ -1.333
      expect(result.get(horse1.id)?.y).toBeCloseTo(avgY, 5);
      expect(result.get(horse2.id)?.y).toBeCloseTo(avgY, 5);
      expect(result.get(horse3.id)?.y).toBeCloseTo(avgY, 5);
      expect(result.get(horse1.id)?.x).toBe(-24);
      expect(result.get(horse2.id)?.x).toBe(0);
      expect(result.get(horse3.id)?.x).toBe(24);
    });

    it('should preserve X positions when aligning horizontally', () => {
      const horse1 = createHorse(generateId(), 1, { x: 10, y: 5 });
      const horse2 = createHorse(generateId(), 2, { x: 20, y: 15 });
      const horse3 = createHorse(generateId(), 3, { x: 30, y: 25 });

      const result = alignHorsesHorizontally([horse1, horse2, horse3]);

      expect(result.get(horse1.id)?.x).toBe(10);
      expect(result.get(horse2.id)?.x).toBe(20);
      expect(result.get(horse3.id)?.x).toBe(30);
    });

    it('should handle horses with same Y position', () => {
      const horse1 = createHorse(generateId(), 1, { x: -10, y: 5 });
      const horse2 = createHorse(generateId(), 2, { x: 0, y: 5 });
      const horse3 = createHorse(generateId(), 3, { x: 10, y: 5 });

      const result = alignHorsesHorizontally([horse1, horse2, horse3]);

      expect(result.get(horse1.id)?.y).toBe(5);
      expect(result.get(horse2.id)?.y).toBe(5);
      expect(result.get(horse3.id)?.y).toBe(5);
    });
  });

  describe('alignHorsesVertically', () => {
    it('should return empty map for less than 2 horses', () => {
      const horses: Horse[] = [];
      const result = alignHorsesVertically(horses);
      expect(result.size).toBe(0);

      const singleHorse = [createHorse(generateId(), 1, { x: 0, y: 0 })];
      const result2 = alignHorsesVertically(singleHorse);
      expect(result2.size).toBe(0);
    });

    it('should align 2 horses vertically', () => {
      const horse1 = createHorse(generateId(), 1, { x: -24, y: -8 });
      const horse2 = createHorse(generateId(), 2, { x: 0, y: 8 });

      const result = alignHorsesVertically([horse1, horse2]);

      const avgX = (-24 + 0) / 2; // -12
      expect(result.get(horse1.id)?.x).toBeCloseTo(avgX, 5);
      expect(result.get(horse2.id)?.x).toBeCloseTo(avgX, 5);
      expect(result.get(horse1.id)?.y).toBe(-8);
      expect(result.get(horse2.id)?.y).toBe(8);
    });

    it('should align 3 horses vertically', () => {
      const horse1 = createHorse(generateId(), 1, { x: -24, y: -8 });
      const horse2 = createHorse(generateId(), 2, { x: 0, y: 8 });
      const horse3 = createHorse(generateId(), 3, { x: 24, y: -4 });

      const result = alignHorsesVertically([horse1, horse2, horse3]);

      const avgX = (-24 + 0 + 24) / 3; // 0
      expect(result.get(horse1.id)?.x).toBeCloseTo(avgX, 5);
      expect(result.get(horse2.id)?.x).toBeCloseTo(avgX, 5);
      expect(result.get(horse3.id)?.x).toBeCloseTo(avgX, 5);
      expect(result.get(horse1.id)?.y).toBe(-8);
      expect(result.get(horse2.id)?.y).toBe(8);
      expect(result.get(horse3.id)?.y).toBe(-4);
    });

    it('should preserve Y positions when aligning vertically', () => {
      const horse1 = createHorse(generateId(), 1, { x: 5, y: 10 });
      const horse2 = createHorse(generateId(), 2, { x: 15, y: 20 });
      const horse3 = createHorse(generateId(), 3, { x: 25, y: 30 });

      const result = alignHorsesVertically([horse1, horse2, horse3]);

      expect(result.get(horse1.id)?.y).toBe(10);
      expect(result.get(horse2.id)?.y).toBe(20);
      expect(result.get(horse3.id)?.y).toBe(30);
    });

    it('should handle horses with same X position', () => {
      const horse1 = createHorse(generateId(), 1, { x: 5, y: -10 });
      const horse2 = createHorse(generateId(), 2, { x: 5, y: 0 });
      const horse3 = createHorse(generateId(), 3, { x: 5, y: 10 });

      const result = alignHorsesVertically([horse1, horse2, horse3]);

      expect(result.get(horse1.id)?.x).toBe(5);
      expect(result.get(horse2.id)?.x).toBe(5);
      expect(result.get(horse3.id)?.x).toBe(5);
    });
  });
});

