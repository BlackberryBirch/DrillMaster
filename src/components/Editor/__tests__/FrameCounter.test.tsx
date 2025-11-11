import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import FrameCounter from '../FrameCounter';
import { useDrillStore } from '../../../stores/drillStore';
import { createDrill, createFrame } from '../../../types';
import { generateId } from '../../../utils/uuid';

describe('FrameCounter', () => {
  beforeEach(() => {
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
  });

  it('should display current frame and total frames', () => {
    const drill = createDrill('test-id', 'Test Drill');
    drill.frames = [
      createFrame(generateId(), 0, 0, 5.0),
      createFrame(generateId(), 1, 5.0, 5.0),
    ];
    useDrillStore.setState({ drill, currentFrameIndex: 1 });

    render(<FrameCounter />);
    
    expect(screen.getByText(/Frame 2 \/ 2/)).toBeInTheDocument();
  });

  it('should show 0 when no drill', () => {
    render(<FrameCounter />);
    
    expect(screen.getByText(/Frame 1 \/ 0/)).toBeInTheDocument();
  });
});

