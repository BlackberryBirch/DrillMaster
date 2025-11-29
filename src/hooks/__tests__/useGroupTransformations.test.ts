import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGroupTransformations } from '../useGroupTransformations';
import { calculateGroupCenter } from '../../utils/groupCenter';
import { createHorse, createFrame, Horse, Frame } from '../../types';
import { generateId } from '../../utils/uuid';
import { useDrillStore } from '../../stores/drillStore';

// Mock the drill store
vi.mock('../../stores/drillStore', () => ({
  useDrillStore: {
    getState: vi.fn(),
  },
}));

describe('useGroupTransformations', () => {
  const mockUpdateHorseInFrame = vi.fn();
  const mockBatchUpdateHorsesInFrame = vi.fn();
  const mockGetCurrentFrame = vi.fn();

  const width = 800;
  const height = 400;

  beforeEach(() => {
    vi.clearAllMocks();
    (useDrillStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      getCurrentFrame: mockGetCurrentFrame,
    });
  });

  describe('calculateGroupCenter', () => {
    it('should calculate center of a single horse', () => {
      const horses = [
        createHorse('horse1', 1, { x: 0.5, y: 0.5 }),
      ];
      const center = calculateGroupCenter(horses);
      expect(center).toEqual({ x: 0.5, y: 0.5 });
    });

    it('should return midpoint for two horses', () => {
      const horses = [
        createHorse('horse1', 1, { x: 0.2, y: 0.4 }),
        createHorse('horse2', 2, { x: 0.6, y: 0.4 }),
      ];
      const center = calculateGroupCenter(horses);
      expect(center.x).toBeCloseTo(0.4, 5);
      expect(center.y).toBeCloseTo(0.4, 5);
    });

    it('should calculate circumcenter for three non-collinear horses', () => {
      const horses = [
        createHorse('horse1', 1, { x: 0, y: 0 }),
        createHorse('horse2', 2, { x: 2, y: 0 }),
        createHorse('horse3', 3, { x: 0, y: 2 }),
      ];
      const center = calculateGroupCenter(horses);
      expect(center.x).toBeCloseTo(1, 5);
      expect(center.y).toBeCloseTo(1, 5);
    });

    it('should return (0, 0) for empty array', () => {
      const center = calculateGroupCenter([]);
      expect(center).toEqual({ x: 0, y: 0 });
    });
  });

  describe('handleGroupRotate', () => {
    it('should not rotate when no current frame', () => {
      const frame: Frame | null = null;
      const horses: Horse[] = [
        createHorse('horse1', 1, { x: 0.5, y: 0.5 }),
      ];

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      result.current.handleGroupRotate(Math.PI / 4);
      expect(mockUpdateHorseInFrame).not.toHaveBeenCalled();
    });

    it('should not rotate when no selected horses', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses: Horse[] = [];

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      result.current.handleGroupRotate(Math.PI / 4);
      expect(mockUpdateHorseInFrame).not.toHaveBeenCalled();
    });

    it('should initialize state and rotate horses around center', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses = [
        createHorse('horse1', 1, { x: 0.4, y: 0.5 }, 0),
        createHorse('horse2', 2, { x: 0.6, y: 0.5 }, 0),
      ];
      frame.horses = horses;

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      // Rotate 90 degrees (π/2)
      result.current.handleGroupRotate(Math.PI / 2);

      // Should have called updateHorseInFrame for each horse
      expect(mockUpdateHorseInFrame).toHaveBeenCalledTimes(2);
      
      // Check that positions were updated (skipHistory = true)
      const calls = mockUpdateHorseInFrame.mock.calls;
      expect(calls[0][0]).toBe(frame.id); // frameId
      expect(calls[0][1]).toBe('horse1'); // horseId
      expect(calls[0][3]).toBe(true); // skipHistory
      
      // Verify positions changed (rotated around center)
      const horse1Update = calls[0][2] as Partial<Horse>;
      const horse2Update = calls[1][2] as Partial<Horse>;
      
      expect(horse1Update.position).toBeDefined();
      expect(horse1Update.direction).toBeDefined();
      expect(horse2Update.position).toBeDefined();
      expect(horse2Update.direction).toBeDefined();
    });

    it('should accumulate rotation on multiple calls', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses = [
        createHorse('horse1', 1, { x: 0.5, y: 0.5 }, 0),
      ];
      frame.horses = horses;

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      // Rotate twice
      result.current.handleGroupRotate(Math.PI / 4);
      mockUpdateHorseInFrame.mockClear();
      result.current.handleGroupRotate(Math.PI / 4);

      // Should have been called again
      expect(mockUpdateHorseInFrame).toHaveBeenCalled();
      
      // Check that direction accumulated (total rotation should be π/2)
      const lastCall = mockUpdateHorseInFrame.mock.calls[0];
      const update = lastCall[2] as Partial<Horse>;
      expect(update.direction).toBeCloseTo(Math.PI / 2, 5);
    });
  });

  describe('handleGroupRotateEnd', () => {
    it('should not process when no current frame', () => {
      const frame: Frame | null = null;
      const horses: Horse[] = [
        createHorse('horse1', 1, { x: 0.5, y: 0.5 }),
      ];

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      result.current.handleGroupRotateEnd();
      expect(mockBatchUpdateHorsesInFrame).not.toHaveBeenCalled();
    });

    it('should restore initial positions and apply final rotation with history', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses = [
        createHorse('horse1', 1, { x: 0.4, y: 0.5 }, 0),
        createHorse('horse2', 2, { x: 0.6, y: 0.5 }, 0),
      ];
      frame.horses = horses;
      mockGetCurrentFrame.mockReturnValue(frame);

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      // First rotate to initialize state
      result.current.handleGroupRotate(Math.PI / 2);
      mockUpdateHorseInFrame.mockClear();

      // Then end rotation
      result.current.handleGroupRotateEnd();

      // Should restore positions first (skipHistory = true)
      expect(mockUpdateHorseInFrame).toHaveBeenCalled();
      
      // Should then batch update with history
      expect(mockBatchUpdateHorsesInFrame).toHaveBeenCalledWith(
        frame.id,
        expect.any(Map)
      );
    });
  });

  describe('handleGroupScale', () => {
    it('should not scale when no current frame', () => {
      const frame: Frame | null = null;
      const horses: Horse[] = [
        createHorse('horse1', 1, { x: 0.5, y: 0.5 }),
      ];

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      result.current.handleGroupScale(1.5);
      expect(mockUpdateHorseInFrame).not.toHaveBeenCalled();
    });

    it('should not scale when no selected horses', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses: Horse[] = [];

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      result.current.handleGroupScale(1.5);
      expect(mockUpdateHorseInFrame).not.toHaveBeenCalled();
    });

    it('should initialize state and scale horses from center', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses = [
        createHorse('horse1', 1, { x: 0.4, y: 0.5 }),
        createHorse('horse2', 2, { x: 0.6, y: 0.5 }),
      ];
      frame.horses = horses;

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      // Scale by 1.5x
      result.current.handleGroupScale(1.5);

      // Should have called updateHorseInFrame for each horse
      expect(mockUpdateHorseInFrame).toHaveBeenCalledTimes(2);
      
      // Check that positions were updated
      const calls = mockUpdateHorseInFrame.mock.calls;
      expect(calls[0][0]).toBe(frame.id);
      expect(calls[0][1]).toBe('horse1');
      expect(calls[0][3]).toBe(true); // skipHistory
      
      // Verify positions changed (scaled from center)
      const horse1Update = calls[0][2] as Partial<Horse>;
      const horse2Update = calls[1][2] as Partial<Horse>;
      
      expect(horse1Update.position).toBeDefined();
      expect(horse2Update.position).toBeDefined();
    });

    it('should use stored center on subsequent scale calls', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses = [
        createHorse('horse1', 1, { x: 0.5, y: 0.5 }),
      ];
      frame.horses = horses;

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      // Scale twice
      result.current.handleGroupScale(1.5);
      mockUpdateHorseInFrame.mockClear();
      result.current.handleGroupScale(2.0);

      // Should have been called again
      expect(mockUpdateHorseInFrame).toHaveBeenCalled();
    });
  });

  describe('handleGroupScaleEnd', () => {
    it('should not process when no current frame', () => {
      const frame: Frame | null = null;
      const horses: Horse[] = [
        createHorse('horse1', 1, { x: 0.5, y: 0.5 }),
      ];

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      result.current.handleGroupScaleEnd();
      expect(mockBatchUpdateHorsesInFrame).not.toHaveBeenCalled();
    });

    it('should restore initial positions and apply final scale with history', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses = [
        createHorse('horse1', 1, { x: 0.4, y: 0.5 }),
        createHorse('horse2', 2, { x: 0.6, y: 0.5 }),
      ];
      frame.horses = horses;
      mockGetCurrentFrame.mockReturnValue(frame);

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      // First scale to initialize state
      result.current.handleGroupScale(1.5);
      mockUpdateHorseInFrame.mockClear();

      // Then end scaling
      result.current.handleGroupScaleEnd();

      // Should restore positions first
      expect(mockUpdateHorseInFrame).toHaveBeenCalled();
      
      // Should then batch update with history
      expect(mockBatchUpdateHorsesInFrame).toHaveBeenCalledWith(
        frame.id,
        expect.any(Map)
      );
    });
  });

  describe('handleRadialDistribute', () => {
    it('should not distribute when no current frame', () => {
      const frame: Frame | null = null;
      const horses: Horse[] = [
        createHorse('horse1', 1, { x: 0.5, y: 0.5 }),
      ];

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      result.current.handleRadialDistribute();
      expect(mockBatchUpdateHorsesInFrame).not.toHaveBeenCalled();
    });

    it('should not distribute when no selected horses', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses: Horse[] = [];

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      result.current.handleRadialDistribute();
      expect(mockBatchUpdateHorsesInFrame).not.toHaveBeenCalled();
    });

    it('should distribute horses evenly around circle', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses = [
        createHorse('horse1', 1, { x: 0.4, y: 0.5 }, 0),
        createHorse('horse2', 2, { x: 0.6, y: 0.5 }, 0),
        createHorse('horse3', 3, { x: 0.5, y: 0.4 }, 0),
      ];
      frame.horses = horses;
      mockGetCurrentFrame.mockReturnValue(frame);

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      result.current.handleRadialDistribute();

      // Should restore positions first
      expect(mockUpdateHorseInFrame).toHaveBeenCalled();
      
      // Should then batch update with distributed positions
      expect(mockBatchUpdateHorsesInFrame).toHaveBeenCalledWith(
        frame.id,
        expect.any(Map)
      );

      // Check that all horses were updated
      const updatesMap = mockBatchUpdateHorsesInFrame.mock.calls[0][1] as Map<string, Partial<Horse>>;
      expect(updatesMap.size).toBe(3);
      expect(updatesMap.has('horse1')).toBe(true);
      expect(updatesMap.has('horse2')).toBe(true);
      expect(updatesMap.has('horse3')).toBe(true);

      // Verify each horse has new position and tangential direction
      const horse1Update = updatesMap.get('horse1');
      const horse2Update = updatesMap.get('horse2');
      const horse3Update = updatesMap.get('horse3');

      expect(horse1Update?.position).toBeDefined();
      expect(horse1Update?.direction).toBeDefined();
      expect(horse2Update?.position).toBeDefined();
      expect(horse2Update?.direction).toBeDefined();
      expect(horse3Update?.position).toBeDefined();
      expect(horse3Update?.direction).toBeDefined();
    });

    it('should distribute single horse to circle edge', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses = [
        createHorse('horse1', 1, { x: 0.5, y: 0.5 }, 0),
      ];
      frame.horses = horses;
      mockGetCurrentFrame.mockReturnValue(frame);

      const { result } = renderHook(() =>
        useGroupTransformations({
          currentFrame: frame,
          selectedHorses: horses,
          width,
          height,
          updateHorseInFrame: mockUpdateHorseInFrame,
          batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
        })
      );

      result.current.handleRadialDistribute();

      expect(mockBatchUpdateHorsesInFrame).toHaveBeenCalled();
      const updatesMap = mockBatchUpdateHorsesInFrame.mock.calls[0][1] as Map<string, Partial<Horse>>;
      expect(updatesMap.size).toBe(1);
      expect(updatesMap.has('horse1')).toBe(true);
    });
  });

  describe('state reset on selection change', () => {
    it('should reset rotation state when horses change', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses1 = [createHorse('horse1', 1, { x: 0.5, y: 0.5 })];
      const horses2 = [createHorse('horse2', 2, { x: 0.5, y: 0.5 })];
      frame.horses = [...horses1, ...horses2];

      const { result, rerender } = renderHook(
        ({ horses }) =>
          useGroupTransformations({
            currentFrame: frame,
            selectedHorses: horses,
            width,
            height,
            updateHorseInFrame: mockUpdateHorseInFrame,
            batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
          }),
        { initialProps: { horses: horses1 } }
      );

      // Rotate with first set of horses
      result.current.handleGroupRotate(Math.PI / 4);
      mockUpdateHorseInFrame.mockClear();

      // Change selection
      rerender({ horses: horses2 });

      // Rotate again - should reinitialize (new horses)
      result.current.handleGroupRotate(Math.PI / 4);
      
      // Should have been called for new horses
      expect(mockUpdateHorseInFrame).toHaveBeenCalled();
    });

    it('should reset scale state when horses change', () => {
      const frame = createFrame(generateId(), 0, 0, 5.0);
      const horses1 = [createHorse('horse1', 1, { x: 0.5, y: 0.5 })];
      const horses2 = [createHorse('horse2', 2, { x: 0.5, y: 0.5 })];
      frame.horses = [...horses1, ...horses2];

      const { result, rerender } = renderHook(
        ({ horses }) =>
          useGroupTransformations({
            currentFrame: frame,
            selectedHorses: horses,
            width,
            height,
            updateHorseInFrame: mockUpdateHorseInFrame,
            batchUpdateHorsesInFrame: mockBatchUpdateHorsesInFrame,
          }),
        { initialProps: { horses: horses1 } }
      );

      // Scale with first set of horses
      result.current.handleGroupScale(1.5);
      mockUpdateHorseInFrame.mockClear();

      // Change selection
      rerender({ horses: horses2 });

      // Scale again - should reinitialize (new horses)
      result.current.handleGroupScale(2.0);
      
      // Should have been called for new horses
      expect(mockUpdateHorseInFrame).toHaveBeenCalled();
    });
  });
});

