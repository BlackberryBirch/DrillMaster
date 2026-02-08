import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Drill, Frame, Horse, AudioTrack } from '../types';
import { createDrill, createFrame } from '../types';
import { generateId, generateShortId } from '../utils/uuid';
import { useHistoryStore } from './historyStore';
import { storageService } from '../services/storageService';
import { alignHorsesHorizontally, alignHorsesVertically } from '../utils/horseAlignment';
import { distributeHorsesEvenly, distributeHorsesEvenlyAroundCircle } from '../utils/horseDistribution';

/**
 * Regenerates all frame timestamps based on their durations.
 * The first frame always has timestamp 0, and each subsequent frame's
 * timestamp is the sum of all previous frames' durations.
 */
function regenerateFrameTimestamps(frames: Frame[]): Frame[] {
  if (frames.length === 0) return frames;
  
  return frames.map((frame, index) => {
    if (index === 0) {
      // First frame always starts at 0
      return { ...frame, timestamp: 0 };
    } else {
      // Each subsequent frame's timestamp is the sum of all previous durations
      const timestamp = frames
        .slice(0, index)
        .reduce((sum, prevFrame) => sum + prevFrame.duration, 0);
      return { ...frame, timestamp };
    }
  });
}

interface DrillStore {
  drill: Drill | null;
  currentFrameIndex: number;
  
  // Actions
  setDrill: (drill: Drill, skipHistoryClear?: boolean, preserveFrameIndex?: boolean) => void;
  createNewDrill: (name: string) => void;
  addFrame: () => void;
  deleteFrame: (frameId: string) => void;
  reorderFrames: (fromIndex: number, toIndex: number) => void;
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
    
    // Regenerate frame timestamps when loading a drill
    let drillToSet = drill;
    if (drill && drill.frames && drill.frames.length > 0) {
      drillToSet = {
        ...drill,
        frames: regenerateFrameTimestamps(drill.frames),
      };
    }
    
    set({ drill: drillToSet, currentFrameIndex: currentIndex });
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
      isKeyFrame: false, // New duplicate is not a key frame unless user marks it
      maneuverName: undefined, // New frame has no maneuver name until user sets it
      horses: frameToDuplicate.horses.map((h) => ({
        ...h,
        id: generateId(),
      })),
    };

    // Update timestamps of subsequent frames
    const updatedFrames = [...drill.frames];
    updatedFrames.splice(frameIndex + 1, 0, newFrame);
    // Update indices and regenerate timestamps
    const framesWithIndices = updatedFrames.map((frame, index) => ({
      ...frame,
      index,
    }));
    const finalFrames = regenerateFrameTimestamps(framesWithIndices);

    set({
      drill: {
        ...drill,
        frames: finalFrames,
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
    // Reindex frames and regenerate timestamps
    const framesWithIndices = newFrames.map((frame, index) => ({
      ...frame,
      index,
    }));
    const finalFrames = regenerateFrameTimestamps(framesWithIndices);

    const newIndex = Math.min(get().currentFrameIndex, newFrames.length - 1);

    set({
      drill: {
        ...drill,
        frames: finalFrames,
      },
      currentFrameIndex: Math.max(0, newIndex),
    });
  },

  reorderFrames: (fromIndex, toIndex) => {
    const { drill, currentFrameIndex } = get();
    if (!drill || drill.frames.length <= 1) return;
    if (fromIndex < 0 || fromIndex >= drill.frames.length) return;
    if (toIndex < 0 || toIndex >= drill.frames.length) return;
    if (fromIndex < toIndex) {
      // If moving forward, decrement toIndex to account for the removed frame
      toIndex--;
    }
    if (fromIndex === toIndex) return;

    const previousDrill = JSON.parse(JSON.stringify(drill));
    const newFrames = [...drill.frames];
    const [removed] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, removed);
    const framesWithIndices = newFrames.map((frame, index) => ({ ...frame, index }));
    const finalFrames = regenerateFrameTimestamps(framesWithIndices);
    const currentFrameId = drill.frames[currentFrameIndex]?.id;
    const newCurrentIndex = finalFrames.findIndex((f) => f.id === currentFrameId);
    const safeNewIndex = newCurrentIndex >= 0 ? newCurrentIndex : Math.max(0, toIndex);

    const newDrill = { ...drill, frames: finalFrames };
    set({ drill: newDrill, currentFrameIndex: safeNewIndex });

    const newDrillCopy = JSON.parse(JSON.stringify(newDrill));
    useHistoryStore.getState().push({
      description: 'Reorder frames',
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

  setCurrentFrame: (index) => {
    const { drill } = get();
    if (!drill || index < 0 || index >= drill.frames.length) return;
    set({ currentFrameIndex: index });
  },

  updateFrame: (frameId, updates) => {
    const { drill } = get();
    if (!drill) return;

    // Check if duration is being updated
    const isDurationUpdate = 'duration' in updates;
    
    // Update the frame
    const updatedFrames = drill.frames.map((frame) =>
      frame.id === frameId ? { ...frame, ...updates } : frame
    );
    
    // If duration was updated, regenerate all timestamps
    const finalFrames = isDurationUpdate 
      ? regenerateFrameTimestamps(updatedFrames)
      : updatedFrames;

    set({
      drill: {
        ...drill,
        frames: finalFrames,
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

    // Use alignment utility
    const newPositions = alignHorsesHorizontally(selectedHorses);

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

    // Use alignment utility
    const newPositions = alignHorsesVertically(selectedHorses);

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

    // Save previous state for undo
    const previousDrill = JSON.parse(JSON.stringify(drill));

    // Use distribution utility
    const newPositions = distributeHorsesEvenly(selectedHorses);

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
    const { drill } = get();
    if (!drill || horseIds.length < 2) return;

    const frame = drill.frames.find((f) => f.id === frameId);
    if (!frame) return;

    // Get selected horses
    const selectedHorses = frame.horses.filter((h) => horseIds.includes(h.id));
    if (selectedHorses.length < 2) return;

    // Save previous state for undo
    const previousDrill = JSON.parse(JSON.stringify(drill));

    // Use distribution utility
    const distributedHorses = distributeHorsesEvenlyAroundCircle(selectedHorses, true);

    // Update all selected horses
    const newDrill = {
      ...drill,
      frames: drill.frames.map((f) =>
        f.id === frameId
          ? {
              ...f,
              horses: f.horses.map((horse) => {
                const update = distributedHorses.get(horse.id);
                if (update) {
                  return { ...horse, position: update.position, direction: update.direction };
                }
                return horse;
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

