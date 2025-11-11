import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../editorStore';

describe('editorStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useEditorStore.setState({
      selectedHorseIds: [],
      showDirectionArrows: true,
      snapToGrid: false,
      zoom: 1.0,
      pan: { x: 0, y: 0 },
    });
  });

  describe('selection', () => {
    it('should set selected horses', () => {
      useEditorStore.getState().setSelectedHorses(['horse1', 'horse2']);
      expect(useEditorStore.getState().selectedHorseIds).toEqual(['horse1', 'horse2']);
    });

    it('should add selected horse', () => {
      useEditorStore.getState().setSelectedHorses(['horse1']);
      useEditorStore.getState().addSelectedHorse('horse2');
      
      expect(useEditorStore.getState().selectedHorseIds).toEqual(['horse1', 'horse2']);
    });

    it('should not add duplicate horse', () => {
      useEditorStore.getState().setSelectedHorses(['horse1']);
      useEditorStore.getState().addSelectedHorse('horse1');
      
      expect(useEditorStore.getState().selectedHorseIds).toEqual(['horse1']);
    });

    it('should remove selected horse', () => {
      useEditorStore.getState().setSelectedHorses(['horse1', 'horse2']);
      useEditorStore.getState().removeSelectedHorse('horse1');
      
      expect(useEditorStore.getState().selectedHorseIds).toEqual(['horse2']);
    });

    it('should clear selection', () => {
      useEditorStore.getState().setSelectedHorses(['horse1', 'horse2']);
      useEditorStore.getState().clearSelection();
      
      expect(useEditorStore.getState().selectedHorseIds).toEqual([]);
    });
  });

  describe('editor settings', () => {
    it('should toggle direction arrows', () => {
      expect(useEditorStore.getState().showDirectionArrows).toBe(true);
      useEditorStore.getState().toggleDirectionArrows();
      expect(useEditorStore.getState().showDirectionArrows).toBe(false);
      useEditorStore.getState().toggleDirectionArrows();
      expect(useEditorStore.getState().showDirectionArrows).toBe(true);
    });

    it('should toggle snap to grid', () => {
      expect(useEditorStore.getState().snapToGrid).toBe(false);
      useEditorStore.getState().toggleSnapToGrid();
      expect(useEditorStore.getState().snapToGrid).toBe(true);
      useEditorStore.getState().toggleSnapToGrid();
      expect(useEditorStore.getState().snapToGrid).toBe(false);
    });
  });

  describe('view controls', () => {
    it('should set zoom within bounds', () => {
      useEditorStore.getState().setZoom(2.0);
      expect(useEditorStore.getState().zoom).toBe(2.0);

      useEditorStore.getState().setZoom(5.0);
      expect(useEditorStore.getState().zoom).toBe(3.0); // Clamped to max

      useEditorStore.getState().setZoom(0.1);
      expect(useEditorStore.getState().zoom).toBe(0.5); // Clamped to min
    });

    it('should set pan', () => {
      useEditorStore.getState().setPan({ x: 10, y: 20 });
      expect(useEditorStore.getState().pan).toEqual({ x: 10, y: 20 });
    });

    it('should reset view', () => {
      useEditorStore.getState().setZoom(2.0);
      useEditorStore.getState().setPan({ x: 10, y: 20 });
      useEditorStore.getState().resetView();

      expect(useEditorStore.getState().zoom).toBe(1.0);
      expect(useEditorStore.getState().pan).toEqual({ x: 0, y: 0 });
    });
  });
});

