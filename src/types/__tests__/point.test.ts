import { describe, it, expect } from 'vitest';
import { createPoint, normalizePoint, denormalizePoint } from '../point';

describe('point', () => {
  describe('createPoint', () => {
    it('should create a point with x and y coordinates', () => {
      const point = createPoint(0.5, 0.7);
      expect(point).toEqual({ x: 0.5, y: 0.7 });
    });

    it('should handle normalized coordinates (0-1)', () => {
      const point = createPoint(0, 1);
      expect(point.x).toBe(0);
      expect(point.y).toBe(1);
    });
  });

  describe('normalizePoint', () => {
    it('should normalize pixel coordinates to 0-1 range', () => {
      const result = normalizePoint(400, 200, 800, 400);
      expect(result).toEqual({ x: 0.5, y: 0.5 });
    });

    it('should handle edge cases', () => {
      expect(normalizePoint(0, 0, 800, 400)).toEqual({ x: 0, y: 0 });
      expect(normalizePoint(800, 400, 800, 400)).toEqual({ x: 1, y: 1 });
    });

    it('should handle different width and height', () => {
      const result = normalizePoint(200, 100, 1000, 500);
      expect(result).toEqual({ x: 0.2, y: 0.2 });
    });
  });

  describe('denormalizePoint', () => {
    it('should convert normalized coordinates to pixel coordinates', () => {
      const result = denormalizePoint({ x: 0.5, y: 0.5 }, 800, 400);
      expect(result).toEqual({ x: 400, y: 200 });
    });

    it('should handle edge cases', () => {
      expect(denormalizePoint({ x: 0, y: 0 }, 800, 400)).toEqual({ x: 0, y: 0 });
      expect(denormalizePoint({ x: 1, y: 1 }, 800, 400)).toEqual({ x: 800, y: 400 });
    });

    it('should handle different width and height', () => {
      const result = denormalizePoint({ x: 0.2, y: 0.3 }, 1000, 500);
      expect(result).toEqual({ x: 200, y: 150 });
    });

    it('should be inverse of normalizePoint', () => {
      const width = 800;
      const height = 400;
      const pixelX = 300;
      const pixelY = 150;
      
      const normalized = normalizePoint(pixelX, pixelY, width, height);
      const denormalized = denormalizePoint(normalized, width, height);
      
      expect(denormalized.x).toBeCloseTo(pixelX);
      expect(denormalized.y).toBeCloseTo(pixelY);
    });
  });
});

