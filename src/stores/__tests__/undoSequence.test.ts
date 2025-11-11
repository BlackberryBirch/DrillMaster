import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '../historyStore';
import { useDrillStore } from '../drillStore';
import { createHorse } from '../../types';
import { generateId } from '../../utils/uuid';

describe('Undo Sequence - User Reported Issue', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
  });

  it('should handle the exact sequence: add horse, move, move, undo, undo', () => {
    // Step 1: Add a horse
    useDrillStore.getState().createNewDrill('Test Drill');
    const frame = useDrillStore.getState().getCurrentFrame();
    if (!frame) return;
    
    const horse1 = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });
    useDrillStore.getState().addHorseToFrame(frame.id, horse1);
    
    // Verify horse added
    let currentFrame = useDrillStore.getState().getCurrentFrame();
    expect(currentFrame?.horses).toHaveLength(1);
    const initialX = currentFrame?.horses[0].position.x;
    const initialY = currentFrame?.horses[0].position.y;
    expect(initialX).toBeCloseTo(0.5);
    expect(initialY).toBeCloseTo(0.5);
    
    // Step 2: Move the horse (first move)
    const horse = currentFrame?.horses.find(h => h.id === horse1.id);
    if (!horse) return;
    
    useDrillStore.getState().updateHorseInFrame(frame.id, horse.id, {
      position: { x: 0.6, y: 0.6 },
    });
    
    // Verify first move
    currentFrame = useDrillStore.getState().getCurrentFrame();
    expect(currentFrame?.horses[0].position.x).toBeCloseTo(0.6);
    expect(currentFrame?.horses[0].position.y).toBeCloseTo(0.6);
    expect(useHistoryStore.getState().history.length).toBe(1);
    expect(useHistoryStore.getState().currentIndex).toBe(0);
    
    // Step 3: Move the horse again (second move)
    useDrillStore.getState().updateHorseInFrame(frame.id, horse.id, {
      position: { x: 0.7, y: 0.7 },
    });
    
    // Verify second move
    currentFrame = useDrillStore.getState().getCurrentFrame();
    expect(currentFrame?.horses[0].position.x).toBeCloseTo(0.7);
    expect(currentFrame?.horses[0].position.y).toBeCloseTo(0.7);
    expect(useHistoryStore.getState().history.length).toBe(2);
    expect(useHistoryStore.getState().currentIndex).toBe(1);
    
    // Step 4: Press Undo (should undo second move, restore to 0.6, 0.6)
    useHistoryStore.getState().undo();
    
    currentFrame = useDrillStore.getState().getCurrentFrame();
    console.log('After first undo - X:', currentFrame?.horses[0].position.x, 'Y:', currentFrame?.horses[0].position.y);
    console.log('Expected - X: 0.6, Y: 0.6');
    expect(currentFrame?.horses[0].position.x).toBeCloseTo(0.6, 5);
    expect(currentFrame?.horses[0].position.y).toBeCloseTo(0.6, 5);
    expect(useHistoryStore.getState().currentIndex).toBe(0);
    expect(useHistoryStore.getState().canUndo()).toBe(true);
    
    // Step 5: Press Undo again (should undo first move, restore to 0.5, 0.5)
    useHistoryStore.getState().undo();
    
    currentFrame = useDrillStore.getState().getCurrentFrame();
    console.log('After second undo - X:', currentFrame?.horses[0].position.x, 'Y:', currentFrame?.horses[0].position.y);
    console.log('Expected - X: 0.5, Y: 0.5');
    expect(currentFrame?.horses[0].position.x).toBeCloseTo(0.5, 5);
    expect(currentFrame?.horses[0].position.y).toBeCloseTo(0.5, 5);
    expect(useHistoryStore.getState().currentIndex).toBe(-1);
    expect(useHistoryStore.getState().canUndo()).toBe(false);
  });
});

