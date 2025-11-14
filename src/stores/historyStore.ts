import { create } from 'zustand';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  undo: () => void;
  redo: () => void;
}

interface HistoryStore {
  history: HistoryEntry[];
  currentIndex: number;
  maxHistorySize: number;
  
  // Actions
  push: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: [],
  currentIndex: -1,
  maxHistorySize: 100,

  push: (entry) => {
    const { history, currentIndex, maxHistorySize } = get();
    
    // Remove any entries after currentIndex (when we're in the middle of history)
    const newHistory = history.slice(0, currentIndex + 1);
    
    // Add new entry
    const newEntry: HistoryEntry = {
      ...entry,
      id: `history-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    
    newHistory.push(newEntry);
    
    // Limit history size - if we need to remove entries from the start
    // Since we always add to the end after slicing, currentIndex will be the last entry
    let newCurrentIndex = newHistory.length - 1;
    if (newHistory.length > maxHistorySize) {
      const removedCount = newHistory.length - maxHistorySize;
      newHistory.splice(0, removedCount);
      // After removing from start, adjust currentIndex
      // Since we added the new entry at the end, currentIndex should be the last entry
      newCurrentIndex = newHistory.length - 1;
    }
    
    set({ history: newHistory, currentIndex: newCurrentIndex });
  },

  undo: () => {
    const { history, currentIndex } = get();
    
    if (currentIndex < 0) {
      return;
    }
    
    const entry = history[currentIndex];
    entry.undo();
    set({ currentIndex: currentIndex - 1 });
  },

  redo: () => {
    const { history, currentIndex } = get();
    
    if (currentIndex >= history.length - 1) {
      return;
    }
    
    const nextIndex = currentIndex + 1;
    const entry = history[nextIndex];
    entry.redo();
    set({ currentIndex: nextIndex });
  },

  canUndo: () => {
    const { currentIndex } = get();
    return currentIndex >= 0;
  },

  canRedo: () => {
    const { history, currentIndex } = get();
    return currentIndex < history.length - 1;
  },

  clear: () => {
    set({ history: [], currentIndex: -1 });
  },
}));

