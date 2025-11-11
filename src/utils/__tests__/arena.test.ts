import { describe, it, expect } from 'vitest';
import { pointToCanvas, canvasToPoint, calculateArenaDimensions, getGridLines } from '../arena';
import { Point } from '../../types';

describe('arena utilities', () => {
  describe('pointToCanvas', () => {
    it('should convert normalized point to canvas coordinates', () => {
      const point: Point = { x: 0.5, y: 0.5 };
      const result = pointToCanvas(point, 100, 200);
      expect(result.x).toBe(50);
      expect(result.y).toBe(100);
    });

    it('should handle edge cases', () => {
      const topLeft: Point = { x: 0, y: 0 };
      const result1 = pointToCanvas(topLeft, 100, 200);
      expect(result1.x).toBe(0);
      expect(result1.y).toBe(0);

      const bottomRight: Point = { x: 1, y: 1 };
      const result2 = pointToCanvas(bottomRight, 100, 200);
      expect(result2.x).toBe(100);
      expect(result2.y).toBe(200);
    });
  });

  describe('canvasToPoint', () => {
    it('should convert canvas coordinates to normalized point', () => {
      const result = canvasToPoint(50, 100, 100, 200);
      expect(result.x).toBe(0.5);
      expect(result.y).toBe(0.5);
    });

    it('should clamp values to 0-1 range', () => {
      const result1 = canvasToPoint(-10, -20, 100, 200);
      expect(result1.x).toBe(0);
      expect(result1.y).toBe(0);

      const result2 = canvasToPoint(150, 250, 100, 200);
      expect(result2.x).toBe(1);
      expect(result2.y).toBe(1);
    });
  });

  describe('calculateArenaDimensions', () => {
    it('should maintain aspect ratio when container is wider', () => {
      const result = calculateArenaDimensions(400, 200);
      // Arena aspect ratio is 2:1 (length:width)
      // Container is 2:1, so height should be 200, width should be 400
      expect(result.height).toBe(200);
      expect(result.width).toBe(400);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
    });

    it('should maintain aspect ratio when container is taller', () => {
      const result = calculateArenaDimensions(200, 400);
      // Container is 1:2, arena is 2:1
      // Should fit width, so width=200, height=100, offsetY=150
      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(150);
    });

    it('should center arena when container is wider', () => {
      const result = calculateArenaDimensions(600, 200);
      // Container is 3:1, arena should be 400x200, centered
      expect(result.width).toBe(400);
      expect(result.height).toBe(200);
      expect(result.offsetX).toBe(100);
      expect(result.offsetY).toBe(0);
    });
  });

  describe('getGridLines', () => {
    it('should return correct grid line positions', () => {
      const result = getGridLines();
      
      // Should have 3 vertical lines (4 divisions = 3 lines at 0.25, 0.5, 0.75)
      expect(result.vertical).toHaveLength(3);
      expect(result.vertical).toEqual([0.25, 0.5, 0.75]);
      
      // Should have 1 horizontal line (midpoint)
      expect(result.horizontal).toHaveLength(1);
      expect(result.horizontal).toEqual([0.5]);
    });
  });
});

