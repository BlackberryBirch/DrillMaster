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

      expect(useDrillStore.getState().drill).toBe(drill);
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

  describe('sub-pattern management', () => {
    beforeEach(() => {
      useDrillStore.getState().createNewDrill('Test Drill');
    });

    it('should add sub-pattern to frame', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      const subPattern = {
        id: generateId(),
        horseIds: [generateId(), generateId()],
        locked: true,
      };

      if (frame) {
        useDrillStore.getState().addSubPatternToFrame(frame.id, subPattern);
      }

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      expect(updatedFrame?.subPatterns).toHaveLength(1);
    });

    it('should remove sub-pattern and unlock horses', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      const horse = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });
      const subPattern = {
        id: generateId(),
        horseIds: [horse.id],
        locked: true,
      };

      if (frame) {
        useDrillStore.getState().addHorseToFrame(frame.id, horse);
        useDrillStore.getState().updateHorseInFrame(frame.id, horse.id, {
          locked: true,
          subPatternId: subPattern.id,
        });
        useDrillStore.getState().addSubPatternToFrame(frame.id, subPattern);
        useDrillStore.getState().removeSubPatternFromFrame(frame.id, subPattern.id);
      }

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      expect(updatedFrame?.subPatterns).toHaveLength(0);
      expect(updatedFrame?.horses[0].locked).toBe(false);
      expect(updatedFrame?.horses[0].subPatternId).toBeUndefined();
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

