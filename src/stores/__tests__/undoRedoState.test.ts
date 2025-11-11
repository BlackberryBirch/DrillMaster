import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '../historyStore';
import { useDrillStore } from '../drillStore';
import { createHorse } from '../../types';
import { generateId } from '../../utils/uuid';

describe('Undo/Redo State Restoration', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
  });

  it('should restore the state BEFORE the action when undoing', () => {
    // Create a new drill
    useDrillStore.getState().createNewDrill('Test Drill');
    const frame = useDrillStore.getState().getCurrentFrame();
    if (!frame) return;
    
    // Add a horse at position (0.5, 0.5)
    const horse1 = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });
    useDrillStore.getState().addHorseToFrame(frame.id, horse1);
    
    // Verify initial position
    let currentFrame = useDrillStore.getState().getCurrentFrame();
    expect(currentFrame?.horses[0].position.x).toBeCloseTo(0.5);
    expect(currentFrame?.horses[0].position.y).toBeCloseTo(0.5);
    
    // Move horse to (0.7, 0.7) - this should create a history entry
    const horse = currentFrame?.horses.find(h => h.id === horse1.id);
    if (!horse) return;
    
    useDrillStore.getState().updateHorseInFrame(frame.id, horse.id, {
      position: { x: 0.7, y: 0.7 },
    });
    
    // Verify horse moved to new position
    currentFrame = useDrillStore.getState().getCurrentFrame();
    expect(currentFrame?.horses[0].position.x).toBeCloseTo(0.7);
    expect(currentFrame?.horses[0].position.y).toBeCloseTo(0.7);
    
    // Undo - should restore to (0.5, 0.5) - the state BEFORE the move
    useHistoryStore.getState().undo();
    
    currentFrame = useDrillStore.getState().getCurrentFrame();
    expect(currentFrame?.horses[0].position.x).toBeCloseTo(0.5, 5);
    expect(currentFrame?.horses[0].position.y).toBeCloseTo(0.5, 5);
    
    // Redo - should restore to (0.7, 0.7) - the state AFTER the move
    useHistoryStore.getState().redo();
    
    currentFrame = useDrillStore.getState().getCurrentFrame();
    expect(currentFrame?.horses[0].position.x).toBeCloseTo(0.7, 5);
    expect(currentFrame?.horses[0].position.y).toBeCloseTo(0.7, 5);
  });
});

