import { describe, it, expect, beforeEach } from 'vitest';
import { useDrillStore } from '../drillStore';
import { createHorse, createFrame, createDrill } from '../../types';
import { generateId } from '../../utils/uuid';

describe('drillStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
  });

  describe('createNewDrill', () => {
    it('should create a new drill with one frame', () => {
      useDrillStore.getState().createNewDrill('Test Drill');

      const drill = useDrillStore.getState().drill;
      expect(drill).not.toBeNull();
      expect(drill?.name).toBe('Test Drill');
      expect(drill?.frames).toHaveLength(1);
      expect(useDrillStore.getState().currentFrameIndex).toBe(0);
    });
  });

  describe('setDrill', () => {
    it('should set the drill and reset frame index', () => {
      const drill = createDrill('test-id', 'Test Drill');
      useDrillStore.getState().setDrill(drill);

      // setDrill creates a new object reference, so use toStrictEqual for deep equality
      expect(useDrillStore.getState().drill).toStrictEqual(drill);
      expect(useDrillStore.getState().currentFrameIndex).toBe(0);
    });
  });

  describe('addFrame', () => {
    it('should add a new frame', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      useDrillStore.getState().addFrame();

      const drill = useDrillStore.getState().drill;
      expect(drill?.frames).toHaveLength(2);
      expect(drill?.frames[1].index).toBe(1);
      expect(drill?.frames[1].timestamp).toBe(drill?.frames[0].duration);
    });

    it('should copy horses from previous frame', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      const frame0 = useDrillStore.getState().getCurrentFrame();
      if (frame0) {
        const horse = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });
        useDrillStore.getState().addHorseToFrame(frame0.id, horse);
      }

      useDrillStore.getState().addFrame();

      const frame1 = useDrillStore.getState().drill?.frames[1];
      expect(frame1?.horses).toHaveLength(1);
      expect(frame1?.horses[0].position).toEqual({ x: 0.5, y: 0.5 });
    });
  });

  describe('deleteFrame', () => {
    it('should delete a frame and reindex remaining frames', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      useDrillStore.getState().addFrame();
      useDrillStore.getState().addFrame();

      const drill = useDrillStore.getState().drill;
      const frameToDelete = drill?.frames[1];
      if (frameToDelete) {
        useDrillStore.getState().deleteFrame(frameToDelete.id);
      }

      const updatedDrill = useDrillStore.getState().drill;
      expect(updatedDrill?.frames).toHaveLength(2);
      expect(updatedDrill?.frames[0].index).toBe(0);
      expect(updatedDrill?.frames[1].index).toBe(1);
    });

    it('should not delete the last frame', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      const drill = useDrillStore.getState().drill;
      const frame = drill?.frames[0];
      
      if (frame) {
        useDrillStore.getState().deleteFrame(frame.id);
      }

      const updatedDrill = useDrillStore.getState().drill;
      expect(updatedDrill?.frames).toHaveLength(1);
    });
  });

  describe('duplicateFrame', () => {
    it('should duplicate a frame', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      const frame0 = useDrillStore.getState().getCurrentFrame();
      if (frame0) {
        const horse = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });
        useDrillStore.getState().addHorseToFrame(frame0.id, horse);
      }

      if (frame0) {
        useDrillStore.getState().duplicateFrame(frame0.id);
      }

      const drill = useDrillStore.getState().drill;
      expect(drill?.frames).toHaveLength(2);
      expect(drill?.frames[1].horses).toHaveLength(1);
      expect(useDrillStore.getState().currentFrameIndex).toBe(1);
    });
  });

  describe('setCurrentFrame', () => {
    it('should set current frame index', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      useDrillStore.getState().addFrame();
      useDrillStore.getState().setCurrentFrame(1);

      expect(useDrillStore.getState().currentFrameIndex).toBe(1);
    });

    it('should not set invalid frame index', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      useDrillStore.getState().setCurrentFrame(10);

      expect(useDrillStore.getState().currentFrameIndex).toBe(0);
    });
  });

  describe('updateFrame', () => {
    it('should update frame properties', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      const frame = useDrillStore.getState().getCurrentFrame();
      
      if (frame) {
        useDrillStore.getState().updateFrame(frame.id, { duration: 10.0 });
      }

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      expect(updatedFrame?.duration).toBe(10.0);
    });
  });

  describe('horse management', () => {
    beforeEach(() => {
      useDrillStore.getState().createNewDrill('Test Drill');
    });

    it('should add horse to frame', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      const horse = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });

      if (frame) {
        useDrillStore.getState().addHorseToFrame(frame.id, horse);
      }

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      expect(updatedFrame?.horses).toHaveLength(1);
      expect(updatedFrame?.horses[0].id).toBe(horse.id);
    });

    it('should update horse in frame', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      const horse = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });

      if (frame) {
        useDrillStore.getState().addHorseToFrame(frame.id, horse);
        useDrillStore.getState().updateHorseInFrame(frame.id, horse.id, {
          position: { x: 0.75, y: 0.25 },
        });
      }

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      expect(updatedFrame?.horses[0].position).toEqual({ x: 0.75, y: 0.25 });
    });

    it('should remove horse from frame', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      const horse = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });

      if (frame) {
        useDrillStore.getState().addHorseToFrame(frame.id, horse);
        useDrillStore.getState().removeHorseFromFrame(frame.id, horse.id);
      }

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      expect(updatedFrame?.horses).toHaveLength(0);
    });
  });

  describe('alignment and distribution', () => {
    beforeEach(() => {
      useDrillStore.getState().createNewDrill('Test Drill');
    });

    it('should align horses horizontally', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      if (!frame) return;

      const horse1 = createHorse(generateId(), 1, { x: 0.2, y: 0.3 });
      const horse2 = createHorse(generateId(), 2, { x: 0.5, y: 0.7 });
      const horse3 = createHorse(generateId(), 3, { x: 0.8, y: 0.4 });

      useDrillStore.getState().addHorseToFrame(frame.id, horse1);
      useDrillStore.getState().addHorseToFrame(frame.id, horse2);
      useDrillStore.getState().addHorseToFrame(frame.id, horse3);

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      if (!updatedFrame) return;

      const horseIds = updatedFrame.horses.map((h) => h.id);
      useDrillStore.getState().alignHorsesHorizontally(updatedFrame.id, horseIds);

      const alignedFrame = useDrillStore.getState().getCurrentFrame();
      const alignedHorses = alignedFrame?.horses || [];
      
      // All horses should have the same Y position (average of original Y positions)
      const avgY = (0.3 + 0.7 + 0.4) / 3;
      alignedHorses.forEach((horse) => {
        expect(horse.position.y).toBeCloseTo(avgY, 5);
      });
    });

    it('should align horses vertically', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      if (!frame) return;

      const horse1 = createHorse(generateId(), 1, { x: 0.2, y: 0.3 });
      const horse2 = createHorse(generateId(), 2, { x: 0.5, y: 0.7 });
      const horse3 = createHorse(generateId(), 3, { x: 0.8, y: 0.4 });

      useDrillStore.getState().addHorseToFrame(frame.id, horse1);
      useDrillStore.getState().addHorseToFrame(frame.id, horse2);
      useDrillStore.getState().addHorseToFrame(frame.id, horse3);

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      if (!updatedFrame) return;

      const horseIds = updatedFrame.horses.map((h) => h.id);
      useDrillStore.getState().alignHorsesVertically(updatedFrame.id, horseIds);

      const alignedFrame = useDrillStore.getState().getCurrentFrame();
      const alignedHorses = alignedFrame?.horses || [];
      
      // All horses should have the same X position (average of original X positions)
      const avgX = (0.2 + 0.5 + 0.8) / 3;
      alignedHorses.forEach((horse) => {
        expect(horse.position.x).toBeCloseTo(avgX, 5);
      });
    });

    it('should distribute horses evenly along line between two most separated', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      if (!frame) return;

      // Create horses in a diagonal line - the two most separated should be horse1 and horse3
      const horse1 = createHorse(generateId(), 1, { x: 0.1, y: 0.1 });
      const horse2 = createHorse(generateId(), 2, { x: 0.5, y: 0.5 });
      const horse3 = createHorse(generateId(), 3, { x: 0.9, y: 0.9 });

      useDrillStore.getState().addHorseToFrame(frame.id, horse1);
      useDrillStore.getState().addHorseToFrame(frame.id, horse2);
      useDrillStore.getState().addHorseToFrame(frame.id, horse3);

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      if (!updatedFrame) return;

      // Move middle horse to a different position
      useDrillStore.getState().updateHorseInFrame(updatedFrame.id, horse2.id, {
        position: { x: 0.3, y: 0.4 },
      });

      const horseIds = updatedFrame.horses.map((h) => h.id);
      useDrillStore.getState().distributeHorsesEvenly(updatedFrame.id, horseIds);

      const distributedFrame = useDrillStore.getState().getCurrentFrame();
      const distributedHorses = distributedFrame?.horses || [];
      
      // Find horse1 and horse3 (the two most separated)
      const h1 = distributedHorses.find((h) => h.id === horse1.id);
      const h3 = distributedHorses.find((h) => h.id === horse3.id);
      
      // Horse1 and horse3 should be at their original positions (the endpoints)
      expect(h1?.position.x).toBeCloseTo(0.1, 5);
      expect(h1?.position.y).toBeCloseTo(0.1, 5);
      expect(h3?.position.x).toBeCloseTo(0.9, 5);
      expect(h3?.position.y).toBeCloseTo(0.9, 5);
      
      // Horse2 should be evenly spaced between them
      const h2 = distributedHorses.find((h) => h.id === horse2.id);
      expect(h2?.position.x).toBeCloseTo(0.5, 5);
      expect(h2?.position.y).toBeCloseTo(0.5, 5);
    });
  });


  describe('getCurrentFrame', () => {
    it('should return current frame', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      const frame = useDrillStore.getState().getCurrentFrame();

      expect(frame).not.toBeNull();
      expect(frame?.index).toBe(0);
    });

    it('should return null if no drill', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      expect(frame).toBeNull();
    });
  });
});

