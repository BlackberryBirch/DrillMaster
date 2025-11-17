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
    it('should scale based on height with 10px padding when container matches aspect ratio', () => {
      const result = calculateArenaDimensions(400, 200);
      // Arena aspect ratio is 2:1 (length:width)
      // Height has 10px padding top and bottom: height=200-20=180, width=180*2=360
      expect(result.height).toBe(180);
      expect(result.width).toBe(360);
      expect(result.offsetX).toBe(20); // (400 - 360) / 2
      expect(result.offsetY).toBe(10); // 10px top padding
    });

    it('should scale based on height with 10px padding and center horizontally when container is taller', () => {
      const result = calculateArenaDimensions(200, 400);
      // Height has 10px padding top and bottom: height=400-20=380, width=380*2=760
      // Arena is wider than container, so it will be centered (may overflow)
      expect(result.height).toBe(380);
      expect(result.width).toBe(760);
      expect(result.offsetX).toBe(-280); // (200 - 760) / 2
      expect(result.offsetY).toBe(10); // 10px top padding
    });

    it('should scale based on height with 10px padding and center when container is wider', () => {
      const result = calculateArenaDimensions(600, 200);
      // Height has 10px padding top and bottom: height=200-20=180, width=180*2=360
      // Arena is narrower than container, so centered horizontally
      expect(result.width).toBe(360);
      expect(result.height).toBe(180);
      expect(result.offsetX).toBe(120); // (600 - 360) / 2
      expect(result.offsetY).toBe(10); // 10px top padding
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

