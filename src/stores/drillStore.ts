import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Drill, Frame, Horse, AudioTrack } from '../types';
import { createDrill, createFrame } from '../types';
import { generateId, generateShortId } from '../utils/uuid';
import { useHistoryStore } from './historyStore';
import { storageService } from '../services/storageService';

interface DrillStore {
  drill: Drill | null;
  currentFrameIndex: number;
  
  // Actions
  setDrill: (drill: Drill, skipHistoryClear?: boolean, preserveFrameIndex?: boolean) => void;
  createNewDrill: (name: string) => void;
  addFrame: () => void;
  deleteFrame: (frameId: string) => void;
  setCurrentFrame: (index: number) => void;
  updateFrame: (frameId: string, updates: Partial<Frame>) => void;
  addHorseToFrame: (frameId: string, horse: Horse) => void;
  updateHorseInFrame: (frameId: string, horseId: string, updates: Partial<Horse>, skipHistory?: boolean) => void;
  batchUpdateHorsesInFrame: (frameId: string, updates: Map<string, Partial<Horse>>) => void;
  removeHorseFromFrame: (frameId: string, horseId: string) => void;
  
  // Alignment and distribution
  alignHorsesHorizontally: (frameId: string, horseIds: string[]) => void;
  alignHorsesVertically: (frameId: string, horseIds: string[]) => void;
  distributeHorsesEvenly: (frameId: string, horseIds: string[]) => void;
  distributeHorsesEvenlyAroundCircle: (frameId: string, horseIds: string[]) => void;
  
  // Audio
  setAudioTrack: (url: string, offset?: number, filename?: string, storagePath?: string) => void;
  removeAudioTrack: () => Promise<void>;
  
  // Getters
  getCurrentFrame: () => Frame | null;
}

export const useDrillStore = create<DrillStore>()(
  persist(
    (set, get) => ({
      drill: null,
      currentFrameIndex: 0,

  setDrill: (drill, skipHistoryClear = false, preserveFrameIndex = false) => {
    let currentIndex = 0;
    if (preserveFrameIndex) {
      const prevIndex = get().currentFrameIndex;
      // Preserve frame index if it's still valid in the new drill
      if (drill && prevIndex >= 0 && prevIndex < drill.frames.length) {
        currentIndex = prevIndex;
      } else if (drill && drill.frames.length > 0) {
        // Otherwise, use the last valid index
        currentIndex = Math.min(prevIndex, drill.frames.length - 1);
      }
    }
    set({ drill, currentFrameIndex: currentIndex });
    // Clear history when loading a new drill (but not during undo/redo)
    if (!skipHistoryClear) {
      useHistoryStore.getState().clear();
    }
  },

  createNewDrill: (name) => {
    const newDrill = createDrill(generateShortId(), name);
    const firstFrame = createFrame(generateId(), 0, 0, 5.0);
    newDrill.frames = [firstFrame];
    set({ drill: newDrill, currentFrameIndex: 0 });
    // Clear history when creating a new drill
    useHistoryStore.getState().clear();
  },

  addFrame: () => {
    const { drill, currentFrameIndex } = get();
    if (!drill) return;

    // If no frames exist or current frame is invalid, use the last frame
    const frameIndex = currentFrameIndex >= 0 && currentFrameIndex < drill.frames.length
      ? currentFrameIndex
      : drill.frames.length - 1;

    if (frameIndex < 0) return; // No frames to duplicate

    const frameToDuplicate = drill.frames[frameIndex];
    const newFrame: Frame = {
      ...frameToDuplicate,
      id: generateId(),
      index: frameIndex + 1,
      timestamp: frameToDuplicate.timestamp + frameToDuplicate.duration,
      horses: frameToDuplicate.horses.map((h) => ({
        ...h,
        id: generateId(),
      })),
    };

    // Update timestamps of subsequent frames
    const updatedFrames = [...drill.frames];
    updatedFrames.splice(frameIndex + 1, 0, newFrame);
    updatedFrames.forEach((frame, index) => {
      frame.index = index;
      if (index > 0) {
        frame.timestamp = updatedFrames[index - 1].timestamp + updatedFrames[index - 1].duration;
      }
    });

    set({
      drill: {
        ...drill,
        frames: updatedFrames,
      },
      currentFrameIndex: frameIndex + 1,
    });
  },

  deleteFrame: (frameId) => {
    const { drill } = get();
    if (!drill) return;

    // Don't delete if it's the last frame
    if (drill.frames.length <= 1) return;

    const frameIndex = drill.frames.findIndex((f) => f.id === frameId);
    if (frameIndex === -1) return;

    const newFrames = drill.frames.filter((f) => f.id !== frameId);
    // Reindex frames
    newFrames.forEach((frame, index) => {
      frame.index = index;
      if (index > 0) {
        frame.timestamp = newFrames[index - 1].timestamp + newFrames[index - 1].duration;
      }
    });

    const newIndex = Math.min(get().currentFrameIndex, newFrames.length - 1);

    set({
      drill: {
        ...drill,
        frames: newFrames,
      },
      currentFrameIndex: Math.max(0, newIndex),
    });
  },


  setCurrentFrame: (index) => {
    const { drill } = get();
    if (!drill || index < 0 || index >= drill.frames.length) return;
    set({ currentFrameIndex: index });
  },

  updateFrame: (frameId, updates) => {
    const { drill } = get();
    if (!drill) return;

    set({
      drill: {
        ...drill,
        frames: drill.frames.map((frame) =>
          frame.id === frameId ? { ...frame, ...updates } : frame
        ),
      },
    });
  },

  addHorseToFrame: (frameId, horse) => {
    const { drill } = get();
    if (!drill) return;

    set({
      drill: {
        ...drill,
        frames: drill.frames.map((frame) =>
          frame.id === frameId
            ? { ...frame, horses: [...frame.horses, horse] }
            : frame
        ),
      },
    });
  },

  updateHorseInFrame: (frameId, horseId, updates, skipHistory = false) => {
    const { drill } = get();
    if (!drill) return;

    // Find the frame and horse to save previous state
    const frame = drill.frames.find((f) => f.id === frameId);
    if (!frame) return;
    const horse = frame.horses.find((h) => h.id === horseId);
    if (!horse) return;

    // Save previous state for undo (only if not skipping history)
    let previousDrill: Drill | null = null;
    if (!skipHistory) {
      previousDrill = JSON.parse(JSON.stringify(drill));
    }

    // Apply update
    const newDrill = {
      ...drill,
      frames: drill.frames.map((f) =>
        f.id === frameId
          ? {
              ...f,
              horses: f.horses.map((h) =>
                h.id === horseId ? { ...h, ...updates } : h
              ),
            }
          : f
      ),
    };

    set({ drill: newDrill });

    // Record in history (only if not skipping)
    if (!skipHistory && previousDrill) {
      // Create a deep copy of newDrill for history to prevent mutation
      const newDrillCopy = JSON.parse(JSON.stringify(newDrill));
      useHistoryStore.getState().push({
        description: `Update horse ${horseId}`,
        undo: () => {
          const { setDrill } = get();
          setDrill(previousDrill!, true, true); // Skip history clear, preserve frame index
        },
        redo: () => {
          const { setDrill } = get();
          setDrill(newDrillCopy, true, true); // Skip history clear, preserve frame index
        },
      });
    }
  },

  batchUpdateHorsesInFrame: (frameId, updates) => {
    const { drill } = get();
    if (!drill) return;

    const frame = drill.frames.find((f) => f.id === frameId);
    if (!frame) return;

    // Save previous state for undo
    const previousDrill = JSON.parse(JSON.stringify(drill));

    // Apply all updates
    const newDrill = {
      ...drill,
      frames: drill.frames.map((f) =>
        f.id === frameId
          ? {
              ...f,
              horses: f.horses.map((horse) => {
                const horseUpdates = updates.get(horse.id);
                return horseUpdates ? { ...horse, ...horseUpdates } : horse;
              }),
            }
          : f
      ),
    };

    set({ drill: newDrill });

    // Record in history
    // Create a deep copy of newDrill for history to prevent mutation
    const newDrillCopy = JSON.parse(JSON.stringify(newDrill));
    useHistoryStore.getState().push({
      description: updates.size === 1 
        ? `Move horse` 
        : `Move ${updates.size} horses`,
      undo: () => {
        const { setDrill } = get();
        setDrill(previousDrill, true, true); // Skip history clear, preserve frame index
      },
      redo: () => {
        const { setDrill } = get();
        setDrill(newDrillCopy, true, true); // Skip history clear, preserve frame index
      },
    });
  },

  removeHorseFromFrame: (frameId, horseId) => {
    const { drill } = get();
    if (!drill) return;

    set({
      drill: {
        ...drill,
        frames: drill.frames.map((frame) =>
          frame.id === frameId
            ? {
                ...frame,
                horses: frame.horses.filter((h) => h.id !== horseId),
              }
            : frame
        ),
      },
    });
  },

  alignHorsesHorizontally: (frameId, horseIds) => {
    const { drill } = get();
    if (!drill || horseIds.length < 2) return;

    const frame = drill.frames.find((f) => f.id === frameId);
    if (!frame) return;

    // Get selected horses
    const selectedHorses = frame.horses.filter((h) => horseIds.includes(h.id));
    if (selectedHorses.length < 2) return;

    // Save previous state for undo
    const previousDrill = JSON.parse(JSON.stringify(drill));

    // Calculate average Y position
    const avgY = selectedHorses.reduce((sum, h) => sum + h.position.y, 0) / selectedHorses.length;

    // Update all selected horses to have the same Y position
    const newDrill = {
      ...drill,
      frames: drill.frames.map((f) =>
        f.id === frameId
          ? {
              ...f,
              horses: f.horses.map((horse) =>
                horseIds.includes(horse.id)
                  ? { ...horse, position: { ...horse.position, y: avgY } }
                  : horse
              ),
            }
          : f
      ),
    };

    set({ drill: newDrill });

    // Record in history
    // Create a deep copy of newDrill for history to prevent mutation
    const newDrillCopy = JSON.parse(JSON.stringify(newDrill));
    useHistoryStore.getState().push({
      description: `Align ${horseIds.length} horses horizontally`,
        undo: () => {
          const { setDrill } = get();
          setDrill(previousDrill, true, true); // Skip history clear, preserve frame index
        },
        redo: () => {
          const { setDrill } = get();
          // Create a fresh deep copy when restoring to ensure no mutation
          const restoredNew = JSON.parse(JSON.stringify(newDrillCopy));
          setDrill(restoredNew, true, true); // Skip history clear, preserve frame index
        },
    });
  },

  alignHorsesVertically: (frameId, horseIds) => {
    const { drill } = get();
    if (!drill || horseIds.length < 2) return;

    const frame = drill.frames.find((f) => f.id === frameId);
    if (!frame) return;

    // Get selected horses
    const selectedHorses = frame.horses.filter((h) => horseIds.includes(h.id));
    if (selectedHorses.length < 2) return;

    // Save previous state for undo
    const previousDrill = JSON.parse(JSON.stringify(drill));

    // Calculate average X position
    const avgX = selectedHorses.reduce((sum, h) => sum + h.position.x, 0) / selectedHorses.length;

    // Update all selected horses to have the same X position
    const newDrill = {
      ...drill,
      frames: drill.frames.map((f) =>
        f.id === frameId
          ? {
              ...f,
              horses: f.horses.map((horse) =>
                horseIds.includes(horse.id)
                  ? { ...horse, position: { ...horse.position, x: avgX } }
                  : horse
              ),
            }
          : f
      ),
    };

    set({ drill: newDrill });

    // Record in history
    // Create a deep copy of newDrill for history to prevent mutation
    const newDrillCopy = JSON.parse(JSON.stringify(newDrill));
    useHistoryStore.getState().push({
      description: `Align ${horseIds.length} horses vertically`,
        undo: () => {
          const { setDrill } = get();
          setDrill(previousDrill, true, true); // Skip history clear, preserve frame index
        },
        redo: () => {
          const { setDrill } = get();
          // Create a fresh deep copy when restoring to ensure no mutation
          const restoredNew = JSON.parse(JSON.stringify(newDrillCopy));
          setDrill(restoredNew, true, true); // Skip history clear, preserve frame index
        },
    });
  },

  distributeHorsesEvenly: (frameId, horseIds) => {
    const { drill } = get();
    if (!drill || horseIds.length < 3) return; // Need at least 3 horses to distribute

    const frame = drill.frames.find((f) => f.id === frameId);
    if (!frame) return;

    // Get selected horses
    const selectedHorses = frame.horses.filter((h) => horseIds.includes(h.id));
    if (selectedHorses.length < 3) return;

    // Calculate Euclidean distance between two points
    const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Find the two horses that are farthest apart
    let maxDistance = 0;
    let horse1 = selectedHorses[0];
    let horse2 = selectedHorses[1];

    for (let i = 0; i < selectedHorses.length; i++) {
      for (let j = i + 1; j < selectedHorses.length; j++) {
        const dist = distance(selectedHorses[i].position, selectedHorses[j].position);
        if (dist > maxDistance) {
          maxDistance = dist;
          horse1 = selectedHorses[i];
          horse2 = selectedHorses[j];
        }
      }
    }

    // Create a line from horse1 to horse2
    const p1 = horse1.position;
    const p2 = horse2.position;
    const lineVector = { x: p2.x - p1.x, y: p2.y - p1.y };
    const lineLength = Math.sqrt(lineVector.x * lineVector.x + lineVector.y * lineVector.y);

    if (lineLength === 0) {
      // All horses are at the same position, nothing to do
      return;
    }

    // Normalize the line vector
    const lineUnit = { x: lineVector.x / lineLength, y: lineVector.y / lineLength };

    // Project each horse onto the line and calculate its position along the line
    // Position is measured as distance from p1 along the line
    const horseProjections = selectedHorses.map((horse) => {
      const toHorse = { x: horse.position.x - p1.x, y: horse.position.y - p1.y };
      // Dot product gives the distance along the line
      const projection = toHorse.x * lineUnit.x + toHorse.y * lineUnit.y;
      return { horse, projection };
    });

    // Sort by projection distance
    horseProjections.sort((a, b) => a.projection - b.projection);

    // The first and last horses should be at p1 and p2 (the two most separated)
    // Distribute all horses evenly along the line
    const newPositions = new Map<string, { x: number; y: number }>();

    horseProjections.forEach(({ horse }, index) => {
      const t = index / (horseProjections.length - 1);
      const newX = p1.x + lineVector.x * t;
      const newY = p1.y + lineVector.y * t;
      newPositions.set(horse.id, { x: newX, y: newY });
    });

    // Save previous state for undo
    const previousDrill = JSON.parse(JSON.stringify(drill));

    // Update all selected horses
    const newDrill = {
      ...drill,
      frames: drill.frames.map((f) =>
        f.id === frameId
          ? {
              ...f,
              horses: f.horses.map((horse) =>
                newPositions.has(horse.id)
                  ? { ...horse, position: newPositions.get(horse.id)! }
                  : horse
              ),
            }
          : f
      ),
    };

    set({ drill: newDrill });

    // Record in history
    // Create a deep copy of newDrill for history to prevent mutation
    const newDrillCopy = JSON.parse(JSON.stringify(newDrill));
    useHistoryStore.getState().push({
      description: `Distribute ${horseIds.length} horses evenly`,
        undo: () => {
          const { setDrill } = get();
          setDrill(previousDrill, true, true); // Skip history clear, preserve frame index
        },
        redo: () => {
          const { setDrill } = get();
          // Create a fresh deep copy when restoring to ensure no mutation
          const restoredNew = JSON.parse(JSON.stringify(newDrillCopy));
          setDrill(restoredNew, true, true); // Skip history clear, preserve frame index
        },
    });
  },

  distributeHorsesEvenlyAroundCircle: (frameId, horseIds) => {
    console.log('[distributeHorsesEvenlyAroundCircle] Starting distribution');
    const { drill } = get();
    if (!drill || horseIds.length < 2) {
      console.log('[distributeHorsesEvenlyAroundCircle] Early return: no drill or < 2 horses');
      return;
    }

    const frame = drill.frames.find((f) => f.id === frameId);
    if (!frame) {
      console.log('[distributeHorsesEvenlyAroundCircle] Early return: frame not found');
      return;
    }

    // Get selected horses
    const selectedHorses = frame.horses.filter((h) => horseIds.includes(h.id));
    if (selectedHorses.length < 2) {
      console.log('[distributeHorsesEvenlyAroundCircle] Early return: < 2 selected horses');
      return;
    }
    console.log(`[distributeHorsesEvenlyAroundCircle] Processing ${selectedHorses.length} horses`);

    // Calculate Euclidean distance between two points
    const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Step 1: Save original horse locations
    console.log('[Step 1] Saving original horse locations');
    const originalPositions = new Map<string, { x: number; y: number; direction: number }>();
    selectedHorses.forEach((horse) => {
      const pos = {
        x: horse.position.x,
        y: horse.position.y,
        direction: horse.direction || 0,
      };
      originalPositions.set(horse.id, pos);
      console.log(`[Step 1] Horse ${horse.id}: pos=(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}), dir=${(pos.direction * 180 / Math.PI).toFixed(1)}°`);
    });

    // Calculate center of all horses (in meters)
    // All positions are already in meters from arena center
    let sumX = 0;
    let sumY = 0;
    selectedHorses.forEach((horse) => {
      sumX += horse.position.x; // meters
      sumY += horse.position.y; // meters
    });
    const center = { x: sumX / selectedHorses.length, y: sumY / selectedHorses.length }; // meters
    console.log(`[Step 1] Center: (${center.x.toFixed(3)}, ${center.y.toFixed(3)})m`);

    // Calculate radius (distance from center to farthest horse, in meters)
    let maxDist = 0;
    selectedHorses.forEach((horse) => {
      const dist = distance(center, horse.position); // distance in meters
      maxDist = Math.max(maxDist, dist);
    });
    console.log(`[Step 1] Max distance (radius): ${maxDist.toFixed(3)}m`);

    // If all horses are at the same position, nothing to do
    if (maxDist === 0) {
      console.log('[Step 1] Early return: all horses at same position');
      return;
    }

    // Step 2: Use handleRadialDistribute logic to place horses on circle
    // (preserve their polar angles and snap to circle edge)
    // All calculations are in meters (coordinates are already in meters from center)
    console.log('[Step 2] Placing horses on circle (preserving polar angles)');
    const horsesOnCircle = new Map<string, { x: number; y: number; angle: number; direction: number }>();
    
    selectedHorses.forEach((horse) => {
      const originalPos = originalPositions.get(horse.id)!;
      
      // Calculate polar coordinates (angle and distance from center, in meters)
      const dx = originalPos.x - center.x; // meters
      const dy = originalPos.y - center.y; // meters
      const polarAngle = Math.atan2(dy, dx);
      
      // Calculate position on circle edge using preserved polar angle (in meters)
      const newX = center.x + maxDist * Math.cos(polarAngle); // meters
      const newY = center.y + maxDist * Math.sin(polarAngle); // meters
      
      // Calculate both tangential directions
      const clockwiseDirection = polarAngle + Math.PI / 2;
      const counterclockwiseDirection = polarAngle - Math.PI / 2;
      
      // Get the horse's current direction
      const currentDirection = originalPos.direction;
      
      // Normalize angles to [0, 2π] for comparison
      const normalizeAngle = (angle: number): number => {
        let normalized = angle;
        while (normalized < 0) normalized += 2 * Math.PI;
        while (normalized >= 2 * Math.PI) normalized -= 2 * Math.PI;
        return normalized;
      };
      
      const currentNorm = normalizeAngle(currentDirection);
      const clockwiseNorm = normalizeAngle(clockwiseDirection);
      const counterclockwiseNorm = normalizeAngle(counterclockwiseDirection);
      
      // Calculate angular distances (handling wraparound)
      const distToClockwise = Math.min(
        Math.abs(currentNorm - clockwiseNorm),
        2 * Math.PI - Math.abs(currentNorm - clockwiseNorm)
      );
      const distToCounterclockwise = Math.min(
        Math.abs(currentNorm - counterclockwiseNorm),
        2 * Math.PI - Math.abs(currentNorm - counterclockwiseNorm)
      );
      
      // Choose the direction that's closer to the current orientation
      const tangentialDirection = distToClockwise < distToCounterclockwise
        ? clockwiseDirection
        : counterclockwiseDirection;
      
      horsesOnCircle.set(horse.id, {
        x: newX,
        y: newY,
        angle: polarAngle,
        direction: tangentialDirection,
      });
      console.log(`[Step 2] Horse ${horse.id}: polarAngle=${(polarAngle * 180 / Math.PI).toFixed(1)}°, pos=(${newX.toFixed(3)}, ${newY.toFixed(3)}), dir=${(tangentialDirection * 180 / Math.PI).toFixed(1)}°`);
    });

    // Step 3: Starting from one horse, rotate others to be evenly distributed
    // All calculations are in meters (coordinates are already in meters from center)
    console.log('[Step 3] Evenly distributing horses around circle');
    // Normalize angles to [0, 2π] for consistent sorting
    const normalizeAngle = (angle: number): number => {
      let normalized = angle;
      while (normalized < 0) normalized += 2 * Math.PI;
      while (normalized >= 2 * Math.PI) normalized -= 2 * Math.PI;
      return normalized;
    };

    // Sort horses by their angle on the circle (with normalized angles)
    const horsesSorted = Array.from(horsesOnCircle.entries())
      .map(([id, data]) => ({ 
        id, 
        ...data, 
        normalizedAngle: normalizeAngle(data.angle) 
      }))
      .sort((a, b) => a.normalizedAngle - b.normalizedAngle);

    const numHorses = horsesSorted.length;
    const angleStep = (2 * Math.PI) / numHorses;
    console.log(`[Step 3] ${numHorses} horses, angle step: ${(angleStep * 180 / Math.PI).toFixed(1)}°`);

    // Actually redistribute horses to evenly spaced angles (0, angleStep, 2*angleStep, etc.)
    // and adjust their rotations accordingly
    // All positions are in meters: center (meters), maxDist (meters), new positions (meters)
    const evenlyDistributedHorses = new Map<string, { x: number; y: number; angle: number; direction: number }>();
    
    horsesSorted.forEach((horseData, index) => {
      // Calculate evenly spaced angle (0, angleStep, 2*angleStep, ...)
      const evenlySpacedAngle = index * angleStep;
      
      // Calculate position on circle at evenly spaced angle (in meters)
      const newX = center.x + maxDist * Math.cos(evenlySpacedAngle);
      const newY = center.y + maxDist * Math.sin(evenlySpacedAngle);
      
      // Calculate how much the horse was rotated from its original angle on circle
      // Use normalized angle to handle wraparound correctly
      const originalNormalizedAngle = horseData.normalizedAngle;
      let rotationDelta = evenlySpacedAngle - originalNormalizedAngle;
      
      // Normalize rotation delta to [-π, π] range for shortest rotation
      if (rotationDelta > Math.PI) {
        rotationDelta -= 2 * Math.PI;
      } else if (rotationDelta < -Math.PI) {
        rotationDelta += 2 * Math.PI;
      }
      
      // Rotate the original direction by the same amount as the position rotation
      // Get the original direction from the original positions
      const originalDirection = originalPositions.get(horseData.id)?.direction || 0;
      const newDirection = originalDirection + rotationDelta;
      
      evenlyDistributedHorses.set(horseData.id, {
        x: newX,
        y: newY,
        angle: evenlySpacedAngle,
        direction: newDirection,
      });
      console.log(`[Step 3] Horse ${horseData.id}: evenlySpacedAngle=${(evenlySpacedAngle * 180 / Math.PI).toFixed(1)}°, pos=(${newX.toFixed(3)}, ${newY.toFixed(3)})m, rotationDelta=${(rotationDelta * 180 / Math.PI).toFixed(1)}°, newDir=${(newDirection * 180 / Math.PI).toFixed(1)}°`);
    });

    // Save previous state for undo
    const previousDrill = JSON.parse(JSON.stringify(drill));

    // Update all selected horses
    const newDrill = {
      ...drill,
      frames: drill.frames.map((f) =>
        f.id === frameId
          ? {
              ...f,
              horses: f.horses.map((horse) => {
                // Use evenlyDistributedHorses (Step 3 result) not horsesOnCircle (Step 2 intermediate)
                const update = evenlyDistributedHorses.get(horse.id);
                if (update) {
                  return { ...horse, position: { x: update.x, y: update.y }, direction: update.direction };
                }
                return horse;
              }),
            }
          : f
      ),
    };

    console.log('[Final Step] Updating drill state');
    set({ drill: newDrill });

    // Record in history
    // Create a deep copy of newDrill for history to prevent mutation
    const newDrillCopy = JSON.parse(JSON.stringify(newDrill));
    useHistoryStore.getState().push({
      description: `Distribute ${horseIds.length} horses evenly around circle`,
        undo: () => {
          const { setDrill } = get();
          setDrill(previousDrill, true, true); // Skip history clear, preserve frame index
        },
        redo: () => {
          const { setDrill } = get();
          // Create a fresh deep copy when restoring to ensure no mutation
          const restoredNew = JSON.parse(JSON.stringify(newDrillCopy));
          setDrill(restoredNew, true, true); // Skip history clear, preserve frame index
        },
    });
    console.log('[distributeHorsesEvenlyAroundCircle] Complete - horses distributed evenly around circle');
  },

  setAudioTrack: (url, offset = 0, filename, storagePath?) => {
    const { drill } = get();
    if (!drill) return;

    const audioTrack: AudioTrack = {
      url,
      storagePath,
      offset,
      filename,
    };

    // Save previous state for undo
    const previousDrill = JSON.parse(JSON.stringify(drill));

    const newDrill = {
      ...drill,
      audioTrack,
    };

    set({ drill: newDrill });

    // Record in history
    const newDrillCopy = JSON.parse(JSON.stringify(newDrill));
    useHistoryStore.getState().push({
      description: 'Set audio track',
      undo: () => {
        const { setDrill } = get();
        setDrill(previousDrill, true, true);
      },
      redo: () => {
        const { setDrill } = get();
        setDrill(newDrillCopy, true, true);
      },
    });
  },

  removeAudioTrack: async () => {
    const { drill } = get();
    if (!drill || !drill.audioTrack) return;

    // Delete audio file from storage if it's a storage URL (not a data URL)
    if (drill.audioTrack.url && !drill.audioTrack.url.startsWith('data:')) {
      try {
        await storageService.deleteAudioFile(drill.audioTrack.url);
      } catch (error) {
        console.warn('Failed to delete audio file from storage:', error);
        // Continue with removal even if storage deletion fails
      }
    }

    // Save previous state for undo
    const previousDrill = JSON.parse(JSON.stringify(drill));

    const newDrill = {
      ...drill,
      audioTrack: undefined,
    };

    set({ drill: newDrill });

    // Record in history
    const newDrillCopy = JSON.parse(JSON.stringify(newDrill));
    useHistoryStore.getState().push({
      description: 'Remove audio track',
      undo: () => {
        const { setDrill } = get();
        setDrill(previousDrill, true, true);
      },
      redo: () => {
        const { setDrill } = get();
        setDrill(newDrillCopy, true, true);
      },
    });
  },

  getCurrentFrame: () => {
    const { drill, currentFrameIndex } = get();
    if (!drill || currentFrameIndex < 0 || currentFrameIndex >= drill.frames.length) {
      return null;
    }
    return drill.frames[currentFrameIndex];
  },
    }),
    {
      name: 'drill-storage',
      // Only persist drill and currentFrameIndex, not actions
      partialize: (state) => ({
        drill: state.drill,
        currentFrameIndex: state.currentFrameIndex,
      }),
      // When loading from storage, clear history since undo/redo functions won't be valid
      onRehydrateStorage: () => (state) => {
        if (state) {
          useHistoryStore.getState().clear();
        }
      },
    }
  )
);

