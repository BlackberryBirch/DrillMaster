import { create } from 'zustand';
import { Drill, Frame, Horse, SubPattern } from '../types';
import { createDrill, createFrame } from '../types';
import { generateId } from '../utils/uuid';

interface DrillStore {
  drill: Drill | null;
  currentFrameIndex: number;
  
  // Actions
  setDrill: (drill: Drill) => void;
  createNewDrill: (name: string) => void;
  addFrame: () => void;
  deleteFrame: (frameId: string) => void;
  duplicateFrame: (frameId: string) => void;
  setCurrentFrame: (index: number) => void;
  updateFrame: (frameId: string, updates: Partial<Frame>) => void;
  addHorseToFrame: (frameId: string, horse: Horse) => void;
  updateHorseInFrame: (frameId: string, horseId: string, updates: Partial<Horse>) => void;
  removeHorseFromFrame: (frameId: string, horseId: string) => void;
  addSubPatternToFrame: (frameId: string, subPattern: SubPattern) => void;
  updateSubPatternInFrame: (frameId: string, subPatternId: string, updates: Partial<SubPattern>) => void;
  removeSubPatternFromFrame: (frameId: string, subPatternId: string) => void;
  
  // Alignment and distribution
  alignHorsesHorizontally: (frameId: string, horseIds: string[]) => void;
  alignHorsesVertically: (frameId: string, horseIds: string[]) => void;
  distributeHorsesEvenly: (frameId: string, horseIds: string[]) => void;
  
  // Getters
  getCurrentFrame: () => Frame | null;
}

export const useDrillStore = create<DrillStore>((set, get) => ({
  drill: null,
  currentFrameIndex: 0,

  setDrill: (drill) => set({ drill, currentFrameIndex: 0 }),

  createNewDrill: (name) => {
    const newDrill = createDrill(generateId(), name);
    const firstFrame = createFrame(generateId(), 0, 0, 5.0);
    newDrill.frames = [firstFrame];
    set({ drill: newDrill, currentFrameIndex: 0 });
  },

  addFrame: () => {
    const { drill, currentFrameIndex } = get();
    if (!drill) return;

    const lastFrame = drill.frames[drill.frames.length - 1];
    const newTimestamp = lastFrame
      ? lastFrame.timestamp + lastFrame.duration
      : 0;

    const newFrame = createFrame(
      generateId(),
      drill.frames.length,
      newTimestamp,
      5.0
    );

    // Copy horses from previous frame
    if (lastFrame) {
      newFrame.horses = lastFrame.horses.map((horse) => ({
        ...horse,
        id: generateId(),
      }));
    }

    set({
      drill: {
        ...drill,
        frames: [...drill.frames, newFrame],
      },
      currentFrameIndex: drill.frames.length,
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

  duplicateFrame: (frameId) => {
    const { drill } = get();
    if (!drill) return;

    const frameIndex = drill.frames.findIndex((f) => f.id === frameId);
    if (frameIndex === -1) return;

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
      subPatterns: frameToDuplicate.subPatterns.map((sp) => ({
        ...sp,
        id: generateId(),
        horseIds: sp.horseIds.map(() => generateId()),
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

  updateHorseInFrame: (frameId, horseId, updates) => {
    const { drill } = get();
    if (!drill) return;

    set({
      drill: {
        ...drill,
        frames: drill.frames.map((frame) =>
          frame.id === frameId
            ? {
                ...frame,
                horses: frame.horses.map((horse) =>
                  horse.id === horseId ? { ...horse, ...updates } : horse
                ),
              }
            : frame
        ),
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
                subPatterns: frame.subPatterns.map((sp) => ({
                  ...sp,
                  horseIds: sp.horseIds.filter((id) => id !== horseId),
                })).filter((sp) => sp.horseIds.length > 0),
              }
            : frame
        ),
      },
    });
  },

  addSubPatternToFrame: (frameId, subPattern) => {
    const { drill } = get();
    if (!drill) return;

    set({
      drill: {
        ...drill,
        frames: drill.frames.map((frame) =>
          frame.id === frameId
            ? { ...frame, subPatterns: [...frame.subPatterns, subPattern] }
            : frame
        ),
      },
    });
  },

  updateSubPatternInFrame: (frameId, subPatternId, updates) => {
    const { drill } = get();
    if (!drill) return;

    set({
      drill: {
        ...drill,
        frames: drill.frames.map((frame) =>
          frame.id === frameId
            ? {
                ...frame,
                subPatterns: frame.subPatterns.map((sp) =>
                  sp.id === subPatternId ? { ...sp, ...updates } : sp
                ),
              }
            : frame
        ),
      },
    });
  },

  removeSubPatternFromFrame: (frameId, subPatternId) => {
    const { drill } = get();
    if (!drill) return;

    set({
      drill: {
        ...drill,
        frames: drill.frames.map((frame) =>
          frame.id === frameId
            ? {
                ...frame,
                subPatterns: frame.subPatterns.filter((sp) => sp.id !== subPatternId),
                horses: frame.horses.map((horse) =>
                  horse.subPatternId === subPatternId
                    ? { ...horse, locked: false, subPatternId: undefined }
                    : horse
                ),
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

    // Calculate average Y position
    const avgY = selectedHorses.reduce((sum, h) => sum + h.position.y, 0) / selectedHorses.length;

    // Update all selected horses to have the same Y position
    set({
      drill: {
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

    // Calculate average X position
    const avgX = selectedHorses.reduce((sum, h) => sum + h.position.x, 0) / selectedHorses.length;

    // Update all selected horses to have the same X position
    set({
      drill: {
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
    const spacing = lineLength / (horseProjections.length - 1);
    const newPositions = new Map<string, { x: number; y: number }>();

    horseProjections.forEach(({ horse }, index) => {
      const t = index / (horseProjections.length - 1);
      const newX = p1.x + lineVector.x * t;
      const newY = p1.y + lineVector.y * t;
      newPositions.set(horse.id, { x: newX, y: newY });
    });

    // Update all selected horses
    set({
      drill: {
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
}));

