import { create } from 'zustand';
import { Point } from '../types';

interface EditorStore {
  selectedHorseIds: string[];
  showDirectionArrows: boolean;
  snapToGrid: boolean;
  zoom: number;
  pan: Point;
  
  // Actions
  setSelectedHorses: (ids: string[]) => void;
  addSelectedHorse: (id: string) => void;
  removeSelectedHorse: (id: string) => void;
  clearSelection: () => void;
  toggleDirectionArrows: () => void;
  toggleSnapToGrid: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  resetView: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  selectedHorseIds: [],
  showDirectionArrows: true,
  snapToGrid: false,
  zoom: 1.0,
  pan: { x: 0, y: 0 },

  setSelectedHorses: (ids) => set({ selectedHorseIds: ids }),
  
  addSelectedHorse: (id) =>
    set((state) => ({
      selectedHorseIds: state.selectedHorseIds.includes(id)
        ? state.selectedHorseIds
        : [...state.selectedHorseIds, id],
    })),
  
  removeSelectedHorse: (id) =>
    set((state) => ({
      selectedHorseIds: state.selectedHorseIds.filter((hid) => hid !== id),
    })),
  
  clearSelection: () => set({ selectedHorseIds: [] }),
  
  toggleDirectionArrows: () =>
    set((state) => ({ showDirectionArrows: !state.showDirectionArrows })),
  
  toggleSnapToGrid: () =>
    set((state) => ({ snapToGrid: !state.snapToGrid })),
  
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(3.0, zoom)) }),
  
  setPan: (pan) => set({ pan }),
  
  resetView: () => set({ zoom: 1.0, pan: { x: 0, y: 0 } }),
}));

