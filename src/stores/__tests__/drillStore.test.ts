import { describe, it, expect, beforeEach } from 'vitest';
import { useDrillStore } from '../drillStore';
import { createHorse, createDrill } from '../../types';
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
    it('should duplicate the current frame', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      const frame0 = useDrillStore.getState().getCurrentFrame();
      if (frame0) {
        useDrillStore.getState().updateFrame(frame0.id, { duration: 10.0 });
        const horse = createHorse(generateId(), 1, { x: 0, y: 0 }); // Center in meters
        useDrillStore.getState().addHorseToFrame(frame0.id, horse);
      }

      useDrillStore.getState().addFrame();

      const drill = useDrillStore.getState().drill;
      expect(drill?.frames).toHaveLength(2);
      expect(drill?.frames[1].index).toBe(1);
      expect(drill?.frames[1].timestamp).toBe(drill?.frames[0].duration);
      // Should duplicate duration
      expect(drill?.frames[1].duration).toBe(10.0);
      // Should copy horses
      expect(drill?.frames[1].horses).toHaveLength(1);
      expect(drill?.frames[1].horses[0].position).toEqual({ x: 0, y: 0 }); // Center in meters
      // Should select the new frame
      expect(useDrillStore.getState().currentFrameIndex).toBe(1);
    });

    it('should insert duplicate immediately after current frame', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      useDrillStore.getState().addFrame(); // Add second frame (frame 0 gets duplicated)
      useDrillStore.getState().setCurrentFrame(0); // Select first frame
      useDrillStore.getState().addFrame(); // Duplicate first frame

      const drill = useDrillStore.getState().drill;
      expect(drill?.frames).toHaveLength(3);
      // New frame should be at index 1 (right after frame 0)
      expect(drill?.frames[1].index).toBe(1);
      // Third frame should now be at index 2
      expect(drill?.frames[2].index).toBe(2);
      expect(useDrillStore.getState().currentFrameIndex).toBe(1);
    });

    it('should use last frame if current frame is invalid', () => {
      useDrillStore.getState().createNewDrill('Test Drill');
      useDrillStore.getState().addFrame(); // Create second frame
      // Set invalid current frame index
      useDrillStore.getState().setCurrentFrame(10);

      useDrillStore.getState().addFrame();

      const drill = useDrillStore.getState().drill;
      expect(drill?.frames).toHaveLength(3);
      // Should have duplicated the last frame (index 1), so new frame is at index 2
      expect(useDrillStore.getState().currentFrameIndex).toBe(2);
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
      const horse = createHorse(generateId(), 1, { x: 0, y: 0 }); // Center in meters

      if (frame) {
        useDrillStore.getState().addHorseToFrame(frame.id, horse);
      }

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      expect(updatedFrame?.horses).toHaveLength(1);
      expect(updatedFrame?.horses[0].id).toBe(horse.id);
    });

    it('should update horse in frame', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      const horse = createHorse(generateId(), 1, { x: 0, y: 0 }); // Center in meters

      if (frame) {
        useDrillStore.getState().addHorseToFrame(frame.id, horse);
        useDrillStore.getState().updateHorseInFrame(frame.id, horse.id, {
          position: { x: 10, y: -20 }, // (0.75-0.5)*40=10, (0.25-0.5)*80=-20 in meters
        });
      }

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      expect(updatedFrame?.horses[0].position).toEqual({ x: 10, y: -20 });
    });

    it('should remove horse from frame', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      const horse = createHorse(generateId(), 1, { x: 0, y: 0 }); // Center in meters

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

      // X uses ARENA_LENGTH (80m), Y uses ARENA_WIDTH (40m)
      const horse1 = createHorse(generateId(), 1, { x: -24, y: -8 }); // (0.2-0.5)*80=-24, (0.3-0.5)*40=-8
      const horse2 = createHorse(generateId(), 2, { x: 0, y: 8 }); // (0.5-0.5)*80=0, (0.7-0.5)*40=8
      const horse3 = createHorse(generateId(), 3, { x: 24, y: -4 }); // (0.8-0.5)*80=24, (0.4-0.5)*40=-4

      useDrillStore.getState().addHorseToFrame(frame.id, horse1);
      useDrillStore.getState().addHorseToFrame(frame.id, horse2);
      useDrillStore.getState().addHorseToFrame(frame.id, horse3);

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      if (!updatedFrame) return;

      const horseIds = updatedFrame.horses.map((h) => h.id);
      useDrillStore.getState().alignHorsesHorizontally(updatedFrame.id, horseIds);

      const alignedFrame = useDrillStore.getState().getCurrentFrame();
      const alignedHorses = alignedFrame?.horses || [];
      
      // All horses should have the same Y position (average of original Y positions in meters)
      const avgY = (-8 + 8 + (-4)) / 3; // -4/3 ≈ -1.333
      alignedHorses.forEach((horse) => {
        expect(horse.position.y).toBeCloseTo(avgY, 5);
      });
    });

    it('should align horses vertically', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      if (!frame) return;

      // X uses ARENA_LENGTH (80m), Y uses ARENA_WIDTH (40m)
      const horse1 = createHorse(generateId(), 1, { x: -24, y: -8 }); // (0.2-0.5)*80=-24, (0.3-0.5)*40=-8
      const horse2 = createHorse(generateId(), 2, { x: 0, y: 8 }); // (0.5-0.5)*80=0, (0.7-0.5)*40=8
      const horse3 = createHorse(generateId(), 3, { x: 24, y: -4 }); // (0.8-0.5)*80=24, (0.4-0.5)*40=-4

      useDrillStore.getState().addHorseToFrame(frame.id, horse1);
      useDrillStore.getState().addHorseToFrame(frame.id, horse2);
      useDrillStore.getState().addHorseToFrame(frame.id, horse3);

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      if (!updatedFrame) return;

      const horseIds = updatedFrame.horses.map((h) => h.id);
      useDrillStore.getState().alignHorsesVertically(updatedFrame.id, horseIds);

      const alignedFrame = useDrillStore.getState().getCurrentFrame();
      const alignedHorses = alignedFrame?.horses || [];
      
      // All horses should have the same X position (average of original X positions in meters)
      const avgX = (-24 + 0 + 24) / 3; // 0
      alignedHorses.forEach((horse) => {
        expect(horse.position.x).toBeCloseTo(avgX, 5);
      });
    });

    it('should distribute horses evenly along line between two most separated', () => {
      const frame = useDrillStore.getState().getCurrentFrame();
      if (!frame) return;

      // Create horses in a diagonal line - the two most separated should be horse1 and horse3
      // X uses ARENA_LENGTH (80m), Y uses ARENA_WIDTH (40m)
      const horse1 = createHorse(generateId(), 1, { x: -32, y: -16 }); // (0.1-0.5)*80=-32, (0.1-0.5)*40=-16
      const horse2 = createHorse(generateId(), 2, { x: 0, y: 0 }); // Center
      const horse3 = createHorse(generateId(), 3, { x: 32, y: 16 }); // (0.9-0.5)*80=32, (0.9-0.5)*40=16

      useDrillStore.getState().addHorseToFrame(frame.id, horse1);
      useDrillStore.getState().addHorseToFrame(frame.id, horse2);
      useDrillStore.getState().addHorseToFrame(frame.id, horse3);

      const updatedFrame = useDrillStore.getState().getCurrentFrame();
      if (!updatedFrame) return;

      // Move middle horse to a different position (in meters)
      useDrillStore.getState().updateHorseInFrame(updatedFrame.id, horse2.id, {
        position: { x: -16, y: -4 }, // (0.3-0.5)*80=-16, (0.4-0.5)*40=-4
      });

      const horseIds = updatedFrame.horses.map((h) => h.id);
      useDrillStore.getState().distributeHorsesEvenly(updatedFrame.id, horseIds);

      const distributedFrame = useDrillStore.getState().getCurrentFrame();
      const distributedHorses = distributedFrame?.horses || [];
      
      // Find horse1 and horse3 (the two most separated)
      const h1 = distributedHorses.find((h) => h.id === horse1.id);
      const h3 = distributedHorses.find((h) => h.id === horse3.id);
      
      // Horse1 and horse3 should be at their original positions (the endpoints in meters)
      expect(h1?.position.x).toBeCloseTo(-32, 5);
      expect(h1?.position.y).toBeCloseTo(-16, 5);
      expect(h3?.position.x).toBeCloseTo(32, 5);
      expect(h3?.position.y).toBeCloseTo(16, 5);
      
      // Horse2 should be evenly spaced between them (center)
      const h2 = distributedHorses.find((h) => h.id === horse2.id);
      expect(h2?.position.x).toBeCloseTo(0, 5);
      expect(h2?.position.y).toBeCloseTo(0, 5);
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

      // Helper function to generate random position within bounds (in meters)
      // Arena is 40m x 80m, so x ranges from -20 to +20, y ranges from -40 to +40
      const randomPosition = () => ({
        x: -16 + Math.random() * 32, // Between -16 and +16 meters
        y: -32 + Math.random() * 64, // Between -32 and +32 meters
      });

      // Helper function to generate random orientation
      const randomOrientation = () => Math.random() * 2 * Math.PI;

      it('should distribute 2 horses evenly around circle (180 degrees apart)', () => {
        const frame = useDrillStore.getState().getCurrentFrame();
        if (!frame) return;

        // Test with multiple random configurations
        for (let testRun = 0; testRun < 5; testRun++) {
          useDrillStore.setState({
            drill: frame ? {
              ...useDrillStore.getState().drill!,
              frames: [{
                ...frame,
                horses: [],
              }],
            } : null,
          });

          const currentFrame = useDrillStore.getState().getCurrentFrame();
          if (!currentFrame) return;

          const horse1 = createHorse(generateId(), 1, randomPosition(), randomOrientation());
          const horse2 = createHorse(generateId(), 2, randomPosition(), randomOrientation());

          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse1);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse2);

          const updatedFrame = useDrillStore.getState().getCurrentFrame();
          if (!updatedFrame) return;

          const horseIds = updatedFrame.horses.map((h) => h.id);
          useDrillStore.getState().distributeHorsesEvenlyAroundCircle(updatedFrame.id, horseIds);

          const distributedFrame = useDrillStore.getState().getCurrentFrame();
          const distributedHorses = distributedFrame?.horses || [];

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

          distributedHorses.forEach((horse) => {
            const dist = distanceFromCenter(horse.position, center);
            expect(dist).toBeCloseTo(expectedRadius, 3);
          });

          // Check that horses are approximately 180 degrees apart
          const angles = distributedHorses.map((h) => angleFromCenter(h.position, center));
          const angleDiff = Math.abs(angles[0] - angles[1]);
          const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
          expect(normalizedDiff).toBeCloseTo(Math.PI, 2);
        }
      });

      it('should distribute 3 horses evenly around circle (120 degrees apart)', () => {
        const frame = useDrillStore.getState().getCurrentFrame();
        if (!frame) return;

        // Test with multiple random configurations
        for (let testRun = 0; testRun < 5; testRun++) {
          useDrillStore.setState({
            drill: frame ? {
              ...useDrillStore.getState().drill!,
              frames: [{
                ...frame,
                horses: [],
              }],
            } : null,
          });

          const currentFrame = useDrillStore.getState().getCurrentFrame();
          if (!currentFrame) return;

          const horse1 = createHorse(generateId(), 1, randomPosition(), randomOrientation());
          const horse2 = createHorse(generateId(), 2, randomPosition(), randomOrientation());
          const horse3 = createHorse(generateId(), 3, randomPosition(), randomOrientation());

          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse1);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse2);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse3);

          const updatedFrame = useDrillStore.getState().getCurrentFrame();
          if (!updatedFrame) return;

          const horseIds = updatedFrame.horses.map((h) => h.id);
          useDrillStore.getState().distributeHorsesEvenlyAroundCircle(updatedFrame.id, horseIds);

          const distributedFrame = useDrillStore.getState().getCurrentFrame();
          const distributedHorses = distributedFrame?.horses || [];

          // Calculate center
          const center = {
            x: (horse1.position.x + horse2.position.x + horse3.position.x) / 3,
            y: (horse1.position.y + horse2.position.y + horse3.position.y) / 3,
          };

          // All horses should be at the same distance from center
          const distances = distributedHorses.map((h) => distanceFromCenter(h.position, center));
          const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
          distances.forEach((dist) => {
            expect(dist).toBeCloseTo(avgDistance, 3);
          });

          // Check angles are evenly spaced (120 degrees = 2π/3)
          const angles = distributedHorses.map((h) => angleFromCenter(h.position, center)).sort((a, b) => a - b);
          const angleStep = (2 * Math.PI) / 3;
          
          // Check that angles are approximately evenly spaced
          for (let i = 0; i < angles.length - 1; i++) {
            let diff = angles[i + 1] - angles[i];
            if (diff < 0) diff += 2 * Math.PI;
            expect(diff).toBeCloseTo(angleStep, 1);
          }
        }
      });

      it('should distribute 4 horses evenly around circle (90 degrees apart)', () => {
        const frame = useDrillStore.getState().getCurrentFrame();
        if (!frame) return;

        // Test with multiple random configurations
        for (let testRun = 0; testRun < 5; testRun++) {
          useDrillStore.setState({
            drill: frame ? {
              ...useDrillStore.getState().drill!,
              frames: [{
                ...frame,
                horses: [],
              }],
            } : null,
          });

          const currentFrame = useDrillStore.getState().getCurrentFrame();
          if (!currentFrame) return;

          const horse1 = createHorse(generateId(), 1, randomPosition(), randomOrientation());
          const horse2 = createHorse(generateId(), 2, randomPosition(), randomOrientation());
          const horse3 = createHorse(generateId(), 3, randomPosition(), randomOrientation());
          const horse4 = createHorse(generateId(), 4, randomPosition(), randomOrientation());

          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse1);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse2);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse3);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse4);

          const updatedFrame = useDrillStore.getState().getCurrentFrame();
          if (!updatedFrame) return;

          const horseIds = updatedFrame.horses.map((h) => h.id);
          useDrillStore.getState().distributeHorsesEvenlyAroundCircle(updatedFrame.id, horseIds);

          const distributedFrame = useDrillStore.getState().getCurrentFrame();
          const distributedHorses = distributedFrame?.horses || [];

          // Calculate center
          const center = {
            x: (horse1.position.x + horse2.position.x + horse3.position.x + horse4.position.x) / 4,
            y: (horse1.position.y + horse2.position.y + horse3.position.y + horse4.position.y) / 4,
          };

          // All horses should be at the same distance from center
          const distances = distributedHorses.map((h) => distanceFromCenter(h.position, center));
          const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
          distances.forEach((dist) => {
            expect(dist).toBeCloseTo(avgDistance, 3);
          });

          // Check angles are evenly spaced (90 degrees = π/2)
          const angles = distributedHorses.map((h) => angleFromCenter(h.position, center)).sort((a, b) => a - b);
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
        }
      });

      it('should handle horses already on a circle', () => {
        const frame = useDrillStore.getState().getCurrentFrame();
        if (!frame) return;

        // Test with multiple random configurations
        for (let testRun = 0; testRun < 5; testRun++) {
          useDrillStore.setState({
            drill: frame ? {
              ...useDrillStore.getState().drill!,
              frames: [{
                ...frame,
                horses: [],
              }],
            } : null,
          });

          const currentFrame = useDrillStore.getState().getCurrentFrame();
          if (!currentFrame) return;

          // Random center and radius (in meters)
          const center = { 
            x: -12 + Math.random() * 24, // -12 to +12 meters
            y: -24 + Math.random() * 48  // -24 to +24 meters
          };
          const radius = 2 + Math.random() * 6; // 2-8 meters (was 0.05-0.15 normalized)

          // Create 4 horses already on a circle but not evenly spaced
          const angles = [
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
          ];
          
          const horse1 = createHorse(generateId(), 1, 
            { x: center.x + radius * Math.cos(angles[0]), y: center.y + radius * Math.sin(angles[0]) }, randomOrientation());
          const horse2 = createHorse(generateId(), 2, 
            { x: center.x + radius * Math.cos(angles[1]), y: center.y + radius * Math.sin(angles[1]) }, randomOrientation());
          const horse3 = createHorse(generateId(), 3, 
            { x: center.x + radius * Math.cos(angles[2]), y: center.y + radius * Math.sin(angles[2]) }, randomOrientation());
          const horse4 = createHorse(generateId(), 4, 
            { x: center.x + radius * Math.cos(angles[3]), y: center.y + radius * Math.sin(angles[3]) }, randomOrientation());

          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse1);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse2);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse3);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse4);

          const updatedFrame = useDrillStore.getState().getCurrentFrame();
          if (!updatedFrame) return;

          const horseIds = updatedFrame.horses.map((h) => h.id);
          useDrillStore.getState().distributeHorsesEvenlyAroundCircle(updatedFrame.id, horseIds);

          const distributedFrame = useDrillStore.getState().getCurrentFrame();
          const distributedHorses = distributedFrame?.horses || [];

          // Calculate actual center
          const actualCenter = {
            x: distributedHorses.reduce((sum, h) => sum + h.position.x, 0) / distributedHorses.length,
            y: distributedHorses.reduce((sum, h) => sum + h.position.y, 0) / distributedHorses.length,
          };

          // All horses should be at approximately the same distance from center
          const distances = distributedHorses.map((h) => distanceFromCenter(h.position, actualCenter));
          const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
          distances.forEach((dist) => {
            expect(dist).toBeCloseTo(avgDistance, 3);
          });

          // Angles should be evenly spaced
          const finalAngles = distributedHorses.map((h) => angleFromCenter(h.position, actualCenter)).sort((a, b) => a - b);
          const angleStep = Math.PI / 2;
          for (let i = 0; i < finalAngles.length - 1; i++) {
            let diff = finalAngles[i + 1] - finalAngles[i];
            if (diff < 0) diff += 2 * Math.PI;
            expect(diff).toBeCloseTo(angleStep, 1);
          }
        }
      });

      it('should handle horses in a line', () => {
        const frame = useDrillStore.getState().getCurrentFrame();
        if (!frame) return;

        // Test with multiple random line configurations
        for (let testRun = 0; testRun < 5; testRun++) {
          useDrillStore.setState({
            drill: frame ? {
              ...useDrillStore.getState().drill!,
              frames: [{
                ...frame,
                horses: [],
              }],
            } : null,
          });

          const currentFrame = useDrillStore.getState().getCurrentFrame();
          if (!currentFrame) return;

          // Create 3 horses in a line (random orientation and position)
          const lineStart = randomPosition();
          const lineAngle = randomOrientation();
          const lineLength = 4 + Math.random() * 8; // 4-12 meters (was 0.1-0.3 normalized)
          
          const horse1 = createHorse(generateId(), 1, 
            { x: lineStart.x, y: lineStart.y }, randomOrientation());
          const horse2 = createHorse(generateId(), 2, 
            { x: lineStart.x + lineLength * Math.cos(lineAngle) / 2, y: lineStart.y + lineLength * Math.sin(lineAngle) / 2 }, randomOrientation());
          const horse3 = createHorse(generateId(), 3, 
            { x: lineStart.x + lineLength * Math.cos(lineAngle), y: lineStart.y + lineLength * Math.sin(lineAngle) }, randomOrientation());

          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse1);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse2);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse3);

          const updatedFrame = useDrillStore.getState().getCurrentFrame();
          if (!updatedFrame) return;

          const horseIds = updatedFrame.horses.map((h) => h.id);
          useDrillStore.getState().distributeHorsesEvenlyAroundCircle(updatedFrame.id, horseIds);

          const distributedFrame = useDrillStore.getState().getCurrentFrame();
          const distributedHorses = distributedFrame?.horses || [];

          // Calculate center
          const center = {
            x: (horse1.position.x + horse2.position.x + horse3.position.x) / 3,
            y: (horse1.position.y + horse2.position.y + horse3.position.y) / 3,
          };

          // All horses should be at the same distance from center
          const distances = distributedHorses.map((h) => distanceFromCenter(h.position, center));
          const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
          distances.forEach((dist) => {
            expect(dist).toBeCloseTo(avgDistance, 3);
          });

          // Angles should be evenly spaced (120 degrees)
          const angles = distributedHorses.map((h) => angleFromCenter(h.position, center)).sort((a, b) => a - b);
          const angleStep = (2 * Math.PI) / 3;
          for (let i = 0; i < angles.length - 1; i++) {
            let diff = angles[i + 1] - angles[i];
            if (diff < 0) diff += 2 * Math.PI;
            expect(diff).toBeCloseTo(angleStep, 1);
          }
        }
      });

      it('should rotate horse directions when distributing', () => {
        const frame = useDrillStore.getState().getCurrentFrame();
        if (!frame) return;

        // Test with multiple random configurations
        for (let testRun = 0; testRun < 5; testRun++) {
          useDrillStore.setState({
            drill: frame ? {
              ...useDrillStore.getState().drill!,
              frames: [{
                ...frame,
                horses: [],
              }],
            } : null,
          });

          const currentFrame = useDrillStore.getState().getCurrentFrame();
          if (!currentFrame) return;

          // Create 2 horses with random positions and directions
          const horse1 = createHorse(generateId(), 1, randomPosition(), randomOrientation());
          const horse2 = createHorse(generateId(), 2, randomPosition(), randomOrientation());

          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse1);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse2);

          const updatedFrame = useDrillStore.getState().getCurrentFrame();
          if (!updatedFrame) return;

          const horseIds = updatedFrame.horses.map((h) => h.id);
          useDrillStore.getState().distributeHorsesEvenlyAroundCircle(updatedFrame.id, horseIds);

          const distributedFrame = useDrillStore.getState().getCurrentFrame();
          const distributedHorses = distributedFrame?.horses || [];

          // Directions should be set (not undefined)
          distributedHorses.forEach((horse) => {
            expect(horse.direction).toBeDefined();
            expect(typeof horse.direction).toBe('number');
          });
        }
      });

      it('should actually redistribute horses (not leave them in same positions)', () => {
        const frame = useDrillStore.getState().getCurrentFrame();
        if (!frame) return;

        // Test with specific positions that were reported as not working
        // Horse 1: (0.46, 0.41) direction 260° = 4.537 radians
        // Horse 2: (0.59, 0.30) direction 380° = 6.633 radians  
        // Horse 3: (0.61, 0.47) direction -40° = -0.698 radians
        // Convert normalized to meters: (norm - 0.5) * dimension
        const horse1 = createHorse(generateId(), 1, { x: -1.6, y: -7.2 }, 4.537); // (0.46-0.5)*40=-1.6, (0.41-0.5)*80=-7.2
        const horse2 = createHorse(generateId(), 2, { x: 3.6, y: -16 }, 6.633); // (0.59-0.5)*40=3.6, (0.30-0.5)*80=-16
        const horse3 = createHorse(generateId(), 3, { x: 4.4, y: -2.4 }, -0.698); // (0.61-0.5)*40=4.4, (0.47-0.5)*80=-2.4

        useDrillStore.getState().addHorseToFrame(frame.id, horse1);
        useDrillStore.getState().addHorseToFrame(frame.id, horse2);
        useDrillStore.getState().addHorseToFrame(frame.id, horse3);

        const updatedFrame = useDrillStore.getState().getCurrentFrame();
        if (!updatedFrame) return;

        // Save original positions
        const originalPositions = new Map(
          updatedFrame.horses.map((h) => [h.id, { x: h.position.x, y: h.position.y }])
        );

        const horseIds = updatedFrame.horses.map((h) => h.id);
        useDrillStore.getState().distributeHorsesEvenlyAroundCircle(updatedFrame.id, horseIds);

        const distributedFrame = useDrillStore.getState().getCurrentFrame();
        const distributedHorses = distributedFrame?.horses || [];

        // Verify horses are actually moved (not in exact same positions)
        let allSame = true;
        distributedHorses.forEach((horse) => {
          const original = originalPositions.get(horse.id);
          if (original) {
            const dist = Math.sqrt(
              Math.pow(horse.position.x - original.x, 2) +
              Math.pow(horse.position.y - original.y, 2)
            );
            if (dist > 0.001) { // Allow small floating point differences
              allSame = false;
            }
          }
        });
        expect(allSame).toBe(false); // Horses should have moved

        // Verify they're evenly distributed
        const center = {
          x: distributedHorses.reduce((sum, h) => sum + h.position.x, 0) / distributedHorses.length,
          y: distributedHorses.reduce((sum, h) => sum + h.position.y, 0) / distributedHorses.length,
        };

        // All horses should be at the same distance from center
        const distances = distributedHorses.map((h) => distanceFromCenter(h.position, center));
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        distances.forEach((dist) => {
          expect(dist).toBeCloseTo(avgDistance, 3);
        });

        // Angles should be evenly spaced (120 degrees)
        const angles = distributedHorses.map((h) => angleFromCenter(h.position, center)).sort((a, b) => a - b);
        const angleStep = (2 * Math.PI) / 3;
        for (let i = 0; i < angles.length - 1; i++) {
          let diff = angles[i + 1] - angles[i];
          if (diff < 0) diff += 2 * Math.PI;
          expect(diff).toBeCloseTo(angleStep, 1);
        }
      });

      it('should minimize distance to original positions', () => {
        const frame = useDrillStore.getState().getCurrentFrame();
        if (!frame) return;

        // Test with multiple random configurations
        for (let testRun = 0; testRun < 5; testRun++) {
          useDrillStore.setState({
            drill: frame ? {
              ...useDrillStore.getState().drill!,
              frames: [{
                ...frame,
                horses: [],
              }],
            } : null,
          });

          const currentFrame = useDrillStore.getState().getCurrentFrame();
          if (!currentFrame) return;

          // Create 4 horses in a random cluster
          const clusterCenter = randomPosition();
          const clusterRadius = 2 + Math.random() * 4; // 2-6 meters (was 0.05-0.1 normalized, ~2-4 meters)
          
          const horse1 = createHorse(generateId(), 1, 
            { x: clusterCenter.x + (Math.random() - 0.5) * clusterRadius, 
              y: clusterCenter.y + (Math.random() - 0.5) * clusterRadius }, randomOrientation());
          const horse2 = createHorse(generateId(), 2, 
            { x: clusterCenter.x + (Math.random() - 0.5) * clusterRadius, 
              y: clusterCenter.y + (Math.random() - 0.5) * clusterRadius }, randomOrientation());
          const horse3 = createHorse(generateId(), 3, 
            { x: clusterCenter.x + (Math.random() - 0.5) * clusterRadius, 
              y: clusterCenter.y + (Math.random() - 0.5) * clusterRadius }, randomOrientation());
          const horse4 = createHorse(generateId(), 4, 
            { x: clusterCenter.x + (Math.random() - 0.5) * clusterRadius, 
              y: clusterCenter.y + (Math.random() - 0.5) * clusterRadius }, randomOrientation());

          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse1);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse2);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse3);
          useDrillStore.getState().addHorseToFrame(currentFrame.id, horse4);

          const updatedFrame = useDrillStore.getState().getCurrentFrame();
          if (!updatedFrame) return;

          // Save original positions
          const originalPositions = new Map(
            updatedFrame.horses.map((h) => [h.id, { x: h.position.x, y: h.position.y }])
          );

          const horseIds = updatedFrame.horses.map((h) => h.id);
          useDrillStore.getState().distributeHorsesEvenlyAroundCircle(updatedFrame.id, horseIds);

          const distributedFrame = useDrillStore.getState().getCurrentFrame();
          const distributedHorses = distributedFrame?.horses || [];

          // Calculate total distance moved
          let totalDistance = 0;
          distributedHorses.forEach((horse) => {
            const original = originalPositions.get(horse.id);
            if (original) {
              const dist = Math.sqrt(
                Math.pow(horse.position.x - original.x, 2) +
                Math.pow(horse.position.y - original.y, 2)
              );
              totalDistance += dist;
            }
          });

          // Total distance should be reasonable (horses should be close to original positions)
          // Since we're optimizing, the distance should be minimized
          // Distance is in meters, so allow for reasonable tolerance (e.g., 15 meters total for 4 horses)
          // Note: This is a randomized test, so the threshold needs to account for variation
          expect(totalDistance).toBeLessThan(15.0);
        }
      });
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

