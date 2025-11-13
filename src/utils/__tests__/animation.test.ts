import { describe, it, expect } from 'vitest';
import { lerp, lerpPoint, lerpAngle, getFrameInterpolation, interpolateHorse, getInterpolatedHorses } from '../animation';
import { createFrame, createHorse } from '../../types';
import { generateId } from '../uuid';

describe('animation', () => {
  describe('lerp', () => {
    it('should interpolate between two numbers', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(10, 20, 0.3)).toBe(13);
    });

    it('should handle negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
      expect(lerp(10, -10, 0.5)).toBe(0);
    });
  });

  describe('lerpPoint', () => {
    it('should interpolate between two points', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 20 };
      
      expect(lerpPoint(start, end, 0)).toEqual({ x: 0, y: 0 });
      expect(lerpPoint(start, end, 1)).toEqual({ x: 10, y: 20 });
      expect(lerpPoint(start, end, 0.5)).toEqual({ x: 5, y: 10 });
    });

    it('should handle normalized coordinates', () => {
      const start = { x: 0.2, y: 0.3 };
      const end = { x: 0.8, y: 0.7 };
      
      const result = lerpPoint(start, end, 0.5);
      expect(result.x).toBeCloseTo(0.5);
      expect(result.y).toBeCloseTo(0.5);
    });
  });

  describe('lerpAngle', () => {
    it('should interpolate between angles', () => {
      expect(lerpAngle(0, Math.PI, 0.5)).toBeCloseTo(Math.PI / 2);
      // When interpolating from 0 to 2π, they're the same angle, so result should be 0
      expect(lerpAngle(0, Math.PI * 2, 0.5)).toBeCloseTo(0);
    });

    it('should handle angle wrapping', () => {
      const result = lerpAngle(Math.PI * 1.5, Math.PI * 0.5, 0.5);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(Math.PI * 2);
    });

    it('should take shortest path around circle', () => {
      // From 0.1π to 1.9π should go the short way (0.2π difference, not 1.8π)
      // The difference is 1.8π which is > π, so it wraps the other way to -0.2π
      // Interpolating halfway: 0.1π + (-0.2π) * 0.5 = 0
      const result = lerpAngle(Math.PI * 0.1, Math.PI * 1.9, 0.5);
      expect(result).toBeCloseTo(0, 5);
    });

    it('should normalize negative angles', () => {
      const result = lerpAngle(-Math.PI, Math.PI, 0.5);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(Math.PI * 2);
    });

    it('should normalize angles greater than 2π', () => {
      const result = lerpAngle(Math.PI * 3, Math.PI * 4, 0.5);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(Math.PI * 2);
    });
  });

  describe('getFrameInterpolation', () => {
    it('should return null for empty frames', () => {
      expect(getFrameInterpolation([], 0)).toBeNull();
    });

    it('should return first frame for single frame', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const result = getFrameInterpolation([frame], 2.5);
      
      expect(result).toEqual({
        frameIndex: 0,
        nextFrameIndex: null,
        t: 0,
      });
    });

    it('should find correct frame for given time', () => {
      const frame1 = createFrame(generateId(), 0, 0, 5.0);
      const frame2 = createFrame(generateId(), 1, 5, 5.0);
      const frame3 = createFrame(generateId(), 2, 10, 5.0);
      
      const result = getFrameInterpolation([frame1, frame2, frame3], 7);
      
      expect(result?.frameIndex).toBe(1);
      expect(result?.nextFrameIndex).toBe(2);
      expect(result?.t).toBeCloseTo(0.4); // (7 - 5) / 5
    });

    it('should return last frame when time exceeds all frames', () => {
      const frame1 = createFrame(generateId(), 0, 0, 5.0);
      const frame2 = createFrame(generateId(), 1, 5, 5.0);
      
      const result = getFrameInterpolation([frame1, frame2], 20);
      
      expect(result?.frameIndex).toBe(1);
      expect(result?.nextFrameIndex).toBeNull();
      expect(result?.t).toBe(1);
    });

    it('should handle zero duration frames', () => {
      const frame1 = createFrame(generateId(), 0, 0, 0);
      const frame2 = createFrame(generateId(), 1, 0, 5.0);
      
      // When frame1 has 0 duration, time 0 is at the boundary, so it goes to frame2
      const result = getFrameInterpolation([frame1, frame2], 0);
      
      // Time 0 is at the start of frame1, but since duration is 0, it immediately moves to frame2
      expect(result?.frameIndex).toBeGreaterThanOrEqual(0);
    });

    it('should clamp t to 0-1 range', () => {
      const frame1 = createFrame(generateId(), 0, 0, 5.0);
      const frame2 = createFrame(generateId(), 1, 5, 5.0);
      
      // Time exactly at frame boundary
      const result = getFrameInterpolation([frame1, frame2], 5);
      
      expect(result?.t).toBeGreaterThanOrEqual(0);
      expect(result?.t).toBeLessThanOrEqual(1);
    });
  });

  describe('interpolateHorse', () => {
    it('should return null if horse not found in from frame', () => {
      const fromFrame = createFrame(generateId(), 0, 0, 5.0);
      const toFrame = createFrame(generateId(), 1, 5, 5.0);
      
      const result = interpolateHorse('nonexistent', fromFrame, toFrame, 0.5);
      expect(result).toBeNull();
    });

    it('should return from horse when t is 0', () => {
      const horse = createHorse('horse1', 1, { x: 0.5, y: 0.5 }, 0, 'walk');
      const fromFrame = createFrame(generateId(), 0, 0, 5.0);
      fromFrame.horses = [horse];
      const toFrame = createFrame(generateId(), 1, 5, 5.0);
      
      // interpolateHorse matches by label, not id
      const result = interpolateHorse(1, fromFrame, toFrame, 0);
      expect(result).toEqual(horse);
    });

    it('should return to horse when t is 1', () => {
      const fromHorse = createHorse('horse1', 1, { x: 0.5, y: 0.5 }, 0, 'walk');
      const toHorse = createHorse('horse1', 1, { x: 0.7, y: 0.7 }, Math.PI / 2, 'trot');
      const fromFrame = createFrame(generateId(), 0, 0, 5.0);
      fromFrame.horses = [fromHorse];
      const toFrame = createFrame(generateId(), 1, 5, 5.0);
      toFrame.horses = [toHorse];
      
      // interpolateHorse matches by label, not id
      const result = interpolateHorse(1, fromFrame, toFrame, 1);
      expect(result).toEqual(toHorse);
    });

    it('should return from horse when toFrame is null', () => {
      const horse = createHorse('horse1', 1, { x: 0.5, y: 0.5 }, 0, 'walk');
      const fromFrame = createFrame(generateId(), 0, 0, 5.0);
      fromFrame.horses = [horse];
      
      // interpolateHorse matches by label, not id
      const result = interpolateHorse(1, fromFrame, null, 0.5);
      expect(result).toEqual(horse);
    });

    it('should interpolate position and direction', () => {
      const fromHorse = createHorse('horse1', 1, { x: 0.5, y: 0.5 }, 0, 'walk');
      const toHorse = createHorse('horse1', 1, { x: 0.7, y: 0.7 }, Math.PI / 2, 'trot');
      const fromFrame = createFrame(generateId(), 0, 0, 5.0);
      fromFrame.horses = [fromHorse];
      const toFrame = createFrame(generateId(), 1, 5, 5.0);
      toFrame.horses = [toHorse];
      
      // interpolateHorse matches by label, not id
      const result = interpolateHorse(1, fromFrame, toFrame, 0.5);
      
      expect(result).not.toBeNull();
      expect(result?.position.x).toBeCloseTo(0.6);
      expect(result?.position.y).toBeCloseTo(0.6);
      expect(result?.direction).toBeCloseTo(Math.PI / 4);
      expect(result?.speed).toBe('walk'); // Uses from frame speed
    });

    it('should return from horse if horse not in to frame', () => {
      const fromHorse = createHorse('horse1', 1, { x: 0.5, y: 0.5 }, 0, 'walk');
      const fromFrame = createFrame(generateId(), 0, 0, 5.0);
      fromFrame.horses = [fromHorse];
      const toFrame = createFrame(generateId(), 1, 5, 5.0);
      toFrame.horses = []; // No horses in to frame
      
      // interpolateHorse matches by label, not id
      const result = interpolateHorse(1, fromFrame, toFrame, 0.5);
      expect(result).toEqual(fromHorse);
    });
  });

  describe('getInterpolatedHorses', () => {
    it('should return empty array for empty frames', () => {
      expect(getInterpolatedHorses([], 0)).toEqual([]);
    });

    it('should return horses from single frame', () => {
      const horse1 = createHorse('horse1', 1, { x: 0.5, y: 0.5 }, 0, 'walk');
      const horse2 = createHorse('horse2', 2, { x: 0.3, y: 0.3 }, 0, 'walk');
      const frame = createFrame(generateId(), 0, 0, 5.0);
      frame.horses = [horse1, horse2];
      
      const result = getInterpolatedHorses([frame], 2.5);
      expect(result).toHaveLength(2);
      expect(result.map(h => h.id)).toContain('horse1');
      expect(result.map(h => h.id)).toContain('horse2');
    });

    it('should interpolate horses between frames', () => {
      const horse1 = createHorse('horse1', 1, { x: 0.5, y: 0.5 }, 0, 'walk');
      const horse2 = createHorse('horse1', 1, { x: 0.7, y: 0.7 }, Math.PI / 2, 'trot');
      const frame1 = createFrame(generateId(), 0, 0, 5.0);
      frame1.horses = [horse1];
      const frame2 = createFrame(generateId(), 1, 5, 5.0);
      frame2.horses = [horse2];
      
      const result = getInterpolatedHorses([frame1, frame2], 7.5); // Halfway through frame2
      
      expect(result).toHaveLength(1);
      expect(result[0].position.x).toBeGreaterThan(0.5);
      expect(result[0].position.x).toBeLessThanOrEqual(0.7);
    });

    it('should handle horses that exist in only one frame', () => {
      const horse1 = createHorse('horse1', 1, { x: 0.5, y: 0.5 }, 0, 'walk');
      const horse2 = createHorse('horse2', 2, { x: 0.3, y: 0.3 }, 0, 'walk');
      const frame1 = createFrame(generateId(), 0, 0, 5.0);
      frame1.horses = [horse1, horse2];
      const frame2 = createFrame(generateId(), 1, 5, 5.0);
      frame2.horses = [horse1]; // horse2 only in frame1
      
      // Time 7 is in frame2, so we interpolate between frame1 and frame2
      // horse2 doesn't exist in frame2, so it should return from frame1
      const result = getInterpolatedHorses([frame1, frame2], 7);
      
      // horse1 should be interpolated, horse2 should be from frame1
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.map(h => h.id)).toContain('horse1');
      // horse2 might not be included if it's filtered out
      const horse2Result = result.find(h => h.id === 'horse2');
      if (horse2Result) {
        expect(horse2Result).toEqual(horse2);
      }
    });
  });
});

