import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '../historyStore';
import { useDrillStore } from '../drillStore';
import { createHorse } from '../../types';
import { generateId } from '../../utils/uuid';

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
  });

  it('should allow undoing all the way to the first move', () => {
    const { push, undo, canUndo } = useHistoryStore.getState();
    
    let state = 0;
    
    // Push first entry
    push({
      description: 'First move',
      undo: () => { state = 0; },
      redo: () => { state = 1; },
    });
    
    expect(useHistoryStore.getState().currentIndex).toBe(0);
    expect(canUndo()).toBe(true);
    
    // Push second entry
    push({
      description: 'Second move',
      undo: () => { state = 1; },
      redo: () => { state = 2; },
    });
    
    expect(useHistoryStore.getState().currentIndex).toBe(1);
    expect(canUndo()).toBe(true);
    
    // Undo second move
    undo();
    expect(useHistoryStore.getState().currentIndex).toBe(0);
    expect(canUndo()).toBe(true);
    
    // Undo first move - should be able to do this
    undo();
    expect(useHistoryStore.getState().currentIndex).toBe(-1);
    expect(canUndo()).toBe(false);
  });

  it('should handle history size limits correctly', () => {
    const { push, undo, canUndo } = useHistoryStore.getState();
    
    // Set a small max history size for testing
    useHistoryStore.setState({ maxHistorySize: 3 });
    
    // Push 5 entries
    for (let i = 0; i < 5; i++) {
      push({
        description: `Move ${i}`,
        undo: () => {},
        redo: () => {},
      });
    }
    
    // Should only have 3 entries (oldest removed)
    expect(useHistoryStore.getState().history.length).toBe(3);
    expect(useHistoryStore.getState().currentIndex).toBe(2); // Last entry
    
    // Should be able to undo all remaining entries
    expect(canUndo()).toBe(true);
    undo();
    expect(useHistoryStore.getState().currentIndex).toBe(1);
    expect(canUndo()).toBe(true);
    undo();
    expect(useHistoryStore.getState().currentIndex).toBe(0);
    expect(canUndo()).toBe(true);
    undo();
    expect(useHistoryStore.getState().currentIndex).toBe(-1);
    expect(canUndo()).toBe(false);
  });

  it('should allow undoing the first horse move in a drill', () => {
    // Create a new drill
    useDrillStore.getState().createNewDrill('Test Drill');
    const frame = useDrillStore.getState().getCurrentFrame();
    expect(frame).not.toBeNull();
    
    if (!frame) return;
    
    // Make first move - add a horse
    const horse1 = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });
    useDrillStore.getState().addHorseToFrame(frame.id, horse1);
    
    // Make second move - update horse position
    const updatedFrame = useDrillStore.getState().getCurrentFrame();
    if (!updatedFrame) return;
    
    const horse = updatedFrame.horses.find(h => h.id === horse1.id);
    if (!horse) return;
    
    useDrillStore.getState().updateHorseInFrame(frame.id, horse.id, {
      position: { x: 0.6, y: 0.6 },
    });
    
    // Should have 1 history entry (the update)
    expect(useHistoryStore.getState().history.length).toBe(1);
    expect(useHistoryStore.getState().currentIndex).toBe(0);
    expect(useHistoryStore.getState().canUndo()).toBe(true);
    
    // Undo the update - should restore position to (0.5, 0.5)
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().currentIndex).toBe(-1);
    expect(useHistoryStore.getState().canUndo()).toBe(false);
    
    const afterUndoFrame = useDrillStore.getState().getCurrentFrame();
    expect(afterUndoFrame?.horses[0].position.x).toBeCloseTo(0.5);
    expect(afterUndoFrame?.horses[0].position.y).toBeCloseTo(0.5);
  });

  it('should allow undoing multiple moves including the first one', () => {
    // Create a new drill
    useDrillStore.getState().createNewDrill('Test Drill');
    const frame = useDrillStore.getState().getCurrentFrame();
    if (!frame) return;
    
    // Make first move - update horse position (if horse exists)
    const horse1 = createHorse(generateId(), 1, { x: 0.3, y: 0.3 });
    useDrillStore.getState().addHorseToFrame(frame.id, horse1);
    
    const frameAfterAdd = useDrillStore.getState().getCurrentFrame();
    if (!frameAfterAdd) return;
    const horse = frameAfterAdd.horses.find(h => h.id === horse1.id);
    if (!horse) return;
    
    // First move - update position
    useDrillStore.getState().updateHorseInFrame(frame.id, horse.id, {
      position: { x: 0.4, y: 0.4 },
    });
    
    // Second move - update position again
    useDrillStore.getState().updateHorseInFrame(frame.id, horse.id, {
      position: { x: 0.5, y: 0.5 },
    });
    
    // Third move - update position again
    useDrillStore.getState().updateHorseInFrame(frame.id, horse.id, {
      position: { x: 0.6, y: 0.6 },
    });
    
    // Should have 3 history entries
    expect(useHistoryStore.getState().history.length).toBe(3);
    expect(useHistoryStore.getState().currentIndex).toBe(2);
    
    // Undo third move
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().currentIndex).toBe(1);
    expect(useHistoryStore.getState().canUndo()).toBe(true);
    
    // Undo second move
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().currentIndex).toBe(0);
    expect(useHistoryStore.getState().canUndo()).toBe(true);
    
    // Undo first move - should be able to do this
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().currentIndex).toBe(-1);
    expect(useHistoryStore.getState().canUndo()).toBe(false);
    
    // Verify position is back to original
    const finalFrame = useDrillStore.getState().getCurrentFrame();
    expect(finalFrame?.horses[0].position.x).toBeCloseTo(0.3);
    expect(finalFrame?.horses[0].position.y).toBeCloseTo(0.3);
  });
});

