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

  getCurrentFrame: () => {
    const { drill, currentFrameIndex } = get();
    if (!drill || currentFrameIndex < 0 || currentFrameIndex >= drill.frames.length) {
      return null;
    }
    return drill.frames[currentFrameIndex];
  },
}));

