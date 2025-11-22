import { describe, it, expect } from 'vitest';
import { pointToCanvas, canvasToPoint, calculateArenaDimensions, getGridLines } from '../arena';
import { Point } from '../../types';

describe('arena utilities', () => {
  describe('pointToCanvas', () => {
    it('should convert meters from center to canvas coordinates', () => {
      // Center point (0, 0) meters should map to center of canvas
      const point: Point = { x: 0, y: 0 };
      const result = pointToCanvas(point, 100, 200);
      expect(result.x).toBe(50);
      expect(result.y).toBe(100);
    });

    it('should handle edge cases', () => {
      // Top-left corner: -40m (left edge) for 80m long arena, -20m (top edge) for 40m wide arena
      const topLeft: Point = { x: -40, y: -20 };
      const result1 = pointToCanvas(topLeft, 100, 200);
      expect(result1.x).toBe(0);
      expect(result1.y).toBe(0);

      // Bottom-right corner: +40m (right edge) for 80m long arena, +20m (bottom edge) for 40m wide arena
      const bottomRight: Point = { x: 40, y: 20 };
      const result2 = pointToCanvas(bottomRight, 100, 200);
      expect(result2.x).toBe(100);
      expect(result2.y).toBe(200);
    });
  });

  describe('canvasToPoint', () => {
    it('should convert canvas coordinates to meters from center', () => {
      // Center of canvas should map to center (0, 0) meters
      const result = canvasToPoint(50, 100, 100, 200);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should clamp values to arena bounds', () => {
      // Negative canvas coordinates should clamp to left/top edges in meters
      const result1 = canvasToPoint(-10, -20, 100, 200);
      // After clamping normalized to 0, meters = (0 - 0.5) * 80 = -40 for x, (0 - 0.5) * 40 = -20 for y
      expect(result1.x).toBe(-40);
      expect(result1.y).toBe(-20);

      // Beyond canvas bounds should clamp to right/bottom edges in meters
      const result2 = canvasToPoint(150, 250, 100, 200);
      // After clamping normalized to 1, meters = (1 - 0.5) * 80 = 40 for x, (1 - 0.5) * 40 = 20 for y
      expect(result2.x).toBe(40);
      expect(result2.y).toBe(20);
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

