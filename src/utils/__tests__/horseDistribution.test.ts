import { describe, it, expect } from 'vitest';
import { distributeHorsesEvenly, distributeHorsesEvenlyAroundCircle } from '../horseDistribution';
import { createHorse, Horse } from '../../types';
import { generateId } from '../uuid';

describe('horseDistribution', () => {
  describe('distributeHorsesEvenly', () => {
    it('should return empty map for less than 3 horses', () => {
      const horses: Horse[] = [];
      const result = distributeHorsesEvenly(horses);
      expect(result.size).toBe(0);

      const singleHorse = [createHorse(generateId(), 1, { x: 0, y: 0 })];
      const result2 = distributeHorsesEvenly(singleHorse);
      expect(result2.size).toBe(0);

      const twoHorses = [
        createHorse(generateId(), 1, { x: 0, y: 0 }),
        createHorse(generateId(), 2, { x: 10, y: 0 }),
      ];
      const result3 = distributeHorsesEvenly(twoHorses);
      expect(result3.size).toBe(0);
    });

    it('should distribute 3 horses evenly along line between two most separated', () => {
      // Create horses in a diagonal line - the two most separated should be horse1 and horse3
      const horse1 = createHorse(generateId(), 1, { x: -32, y: -16 });
      const horse2 = createHorse(generateId(), 2, { x: -16, y: -4 });
      const horse3 = createHorse(generateId(), 3, { x: 32, y: 16 });

      const result = distributeHorsesEvenly([horse1, horse2, horse3]);

      // Horse1 and horse3 should be at their original positions (the endpoints)
      expect(result.get(horse1.id)?.x).toBeCloseTo(-32, 5);
      expect(result.get(horse1.id)?.y).toBeCloseTo(-16, 5);
      expect(result.get(horse3.id)?.x).toBeCloseTo(32, 5);
      expect(result.get(horse3.id)?.y).toBeCloseTo(16, 5);

      // Horse2 should be evenly spaced between them (center)
      expect(result.get(horse2.id)?.x).toBeCloseTo(0, 5);
      expect(result.get(horse2.id)?.y).toBeCloseTo(0, 5);
    });

    it('should handle horses at same position', () => {
      const horse1 = createHorse(generateId(), 1, { x: 0, y: 0 });
      const horse2 = createHorse(generateId(), 2, { x: 0, y: 0 });
      const horse3 = createHorse(generateId(), 3, { x: 0, y: 0 });

      const result = distributeHorsesEvenly([horse1, horse2, horse3]);
      expect(result.size).toBe(0);
    });

    it('should distribute 4 horses evenly along line', () => {
      const horse1 = createHorse(generateId(), 1, { x: 0, y: 0 });
      const horse2 = createHorse(generateId(), 2, { x: 10, y: 0 });
      const horse3 = createHorse(generateId(), 3, { x: 20, y: 0 });
      const horse4 = createHorse(generateId(), 4, { x: 30, y: 0 });

      const result = distributeHorsesEvenly([horse1, horse2, horse3, horse4]);

      // All should be on the line from (0,0) to (30,0)
      expect(result.get(horse1.id)?.x).toBeCloseTo(0, 5);
      expect(result.get(horse1.id)?.y).toBeCloseTo(0, 5);
      expect(result.get(horse4.id)?.x).toBeCloseTo(30, 5);
      expect(result.get(horse4.id)?.y).toBeCloseTo(0, 5);

      // Middle horses should be evenly spaced
      expect(result.get(horse2.id)?.x).toBeCloseTo(10, 5);
      expect(result.get(horse3.id)?.x).toBeCloseTo(20, 5);
    });
  });

  describe('distributeHorsesEvenlyAroundCircle', () => {
    // Helper function to calculate distance from center
    const distanceFromCenter = (pos: { x: number; y: number }, center: { x: number; y: number }) => {
      const dx = pos.x - center.x;
      const dy = pos.y - center.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Helper function to calculate angle from center
    const angleFromCenter = (pos: { x: number; y: number }, center: { x: number; y: number }) => {
      const dx = pos.x - center.x;
      const dy = pos.y - center.y;
      return Math.atan2(dy, dx);
    };

    it('should return empty map for less than 2 horses', () => {
      const horses: Horse[] = [];
      const result = distributeHorsesEvenlyAroundCircle(horses);
      expect(result.size).toBe(0);

      const singleHorse = [createHorse(generateId(), 1, { x: 0, y: 0 })];
      const result2 = distributeHorsesEvenlyAroundCircle(singleHorse);
      expect(result2.size).toBe(0);
    });

    it('should distribute 2 horses evenly around circle (180 degrees apart)', () => {
      const horse1 = createHorse(generateId(), 1, { x: -10, y: 0 }, 0);
      const horse2 = createHorse(generateId(), 2, { x: 10, y: 0 }, 0);

      const result = distributeHorsesEvenlyAroundCircle([horse1, horse2]);

      // Calculate center
      const center = {
        x: (horse1.position.x + horse2.position.x) / 2,
        y: (horse1.position.y + horse2.position.y) / 2,
      };

      // Calculate radius (should be half the distance between original positions)
      const originalDist = Math.sqrt(
        Math.pow(horse2.position.x - horse1.position.x, 2) +
        Math.pow(horse2.position.y - horse1.position.y, 2)
      );
      const expectedRadius = originalDist / 2;

      result.forEach((horseResult) => {
        const dist = distanceFromCenter(horseResult.position, center);
        expect(dist).toBeCloseTo(expectedRadius, 3);
      });

      // Check that horses are approximately 180 degrees apart
      const angles = Array.from(result.values()).map((h) => angleFromCenter(h.position, center));
      const angleDiff = Math.abs(angles[0] - angles[1]);
      const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
      expect(normalizedDiff).toBeCloseTo(Math.PI, 2);
    });

    it('should distribute 3 horses evenly around circle (120 degrees apart)', () => {
      const horse1 = createHorse(generateId(), 1, { x: 0, y: 0 }, 0);
      const horse2 = createHorse(generateId(), 2, { x: 10, y: 0 }, 0);
      const horse3 = createHorse(generateId(), 3, { x: 5, y: 10 }, 0);

      const result = distributeHorsesEvenlyAroundCircle([horse1, horse2, horse3]);

      // Calculate center
      const center = {
        x: (horse1.position.x + horse2.position.x + horse3.position.x) / 3,
        y: (horse1.position.y + horse2.position.y + horse3.position.y) / 3,
      };

      // All horses should be at the same distance from center
      const distances = Array.from(result.values()).map((h) => distanceFromCenter(h.position, center));
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      distances.forEach((dist) => {
        expect(dist).toBeCloseTo(avgDistance, 3);
      });

      // Check angles are evenly spaced (120 degrees = 2π/3)
      const angles = Array.from(result.values())
        .map((h) => angleFromCenter(h.position, center))
        .sort((a, b) => a - b);
      const angleStep = (2 * Math.PI) / 3;

      // Check that angles are approximately evenly spaced
      for (let i = 0; i < angles.length - 1; i++) {
        let diff = angles[i + 1] - angles[i];
        if (diff < 0) diff += 2 * Math.PI;
        expect(diff).toBeCloseTo(angleStep, 1);
      }
    });

    it('should distribute 4 horses evenly around circle (90 degrees apart)', () => {
      const horse1 = createHorse(generateId(), 1, { x: 0, y: 0 }, 0);
      const horse2 = createHorse(generateId(), 2, { x: 10, y: 0 }, 0);
      const horse3 = createHorse(generateId(), 3, { x: 10, y: 10 }, 0);
      const horse4 = createHorse(generateId(), 4, { x: 0, y: 10 }, 0);

      const result = distributeHorsesEvenlyAroundCircle([horse1, horse2, horse3, horse4]);

      // Calculate center
      const center = {
        x: (horse1.position.x + horse2.position.x + horse3.position.x + horse4.position.x) / 4,
        y: (horse1.position.y + horse2.position.y + horse3.position.y + horse4.position.y) / 4,
      };

      // All horses should be at the same distance from center
      const distances = Array.from(result.values()).map((h) => distanceFromCenter(h.position, center));
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      distances.forEach((dist) => {
        expect(dist).toBeCloseTo(avgDistance, 3);
      });

      // Check angles are evenly spaced (90 degrees = π/2)
      const angles = Array.from(result.values())
        .map((h) => angleFromCenter(h.position, center))
        .sort((a, b) => a - b);
      const angleStep = Math.PI / 2;

      // Check that angles are approximately evenly spaced
      for (let i = 0; i < angles.length - 1; i++) {
        let diff = angles[i + 1] - angles[i];
        if (diff < 0) diff += 2 * Math.PI;
        expect(diff).toBeCloseTo(angleStep, 1);
      }
      // Check wrap-around
      const lastDiff = angles[0] - angles[angles.length - 1] + 2 * Math.PI;
      expect(lastDiff).toBeCloseTo(angleStep, 1);
    });

    it('should handle horses at same position', () => {
      const horse1 = createHorse(generateId(), 1, { x: 0, y: 0 }, 0);
      const horse2 = createHorse(generateId(), 2, { x: 0, y: 0 }, 0);

      const result = distributeHorsesEvenlyAroundCircle([horse1, horse2]);
      expect(result.size).toBe(0);
    });

    it('should update horse directions when distributing', () => {
      const horse1 = createHorse(generateId(), 1, { x: 0, y: 0 }, 0);
      const horse2 = createHorse(generateId(), 2, { x: 10, y: 0 }, 0);
      const horse3 = createHorse(generateId(), 3, { x: 5, y: 10 }, 0);

      const result = distributeHorsesEvenlyAroundCircle([horse1, horse2, horse3]);

      // All results should have direction property
      result.forEach((horseResult) => {
        expect(horseResult.direction).toBeDefined();
        expect(typeof horseResult.direction).toBe('number');
      });
    });

    it('should skip even spacing when enforceEvenSpacing is false', () => {
      const horse1 = createHorse(generateId(), 1, { x: -2, y: 1 }, 0);
      const horse2 = createHorse(generateId(), 2, { x: 3, y: -1 }, 0);
      const horse3 = createHorse(generateId(), 3, { x: 0, y: 4 }, 0);

      const horses = [horse1, horse2, horse3];

      const result = distributeHorsesEvenlyAroundCircle(horses, false);

      // Calculate expected Step 2 positions (preserve polar angles, snap to circle radius)
      const center = {
        x: horses.reduce((sum, h) => sum + h.position.x, 0) / horses.length,
        y: horses.reduce((sum, h) => sum + h.position.y, 0) / horses.length,
      };
      let maxDist = 0;
      horses.forEach((horse) => {
        const dx = horse.position.x - center.x;
        const dy = horse.position.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        maxDist = Math.max(maxDist, dist);
      });

      horses.forEach((horse) => {
        const dx = horse.position.x - center.x;
        const dy = horse.position.y - center.y;
        const angle = Math.atan2(dy, dx);
        const expectedX = center.x + maxDist * Math.cos(angle);
        const expectedY = center.y + maxDist * Math.sin(angle);

        const horseResult = result.get(horse.id);
        expect(horseResult).toBeDefined();
        expect(horseResult?.position.x).toBeCloseTo(expectedX, 5);
        expect(horseResult?.position.y).toBeCloseTo(expectedY, 5);
      });
    });
  });
});

