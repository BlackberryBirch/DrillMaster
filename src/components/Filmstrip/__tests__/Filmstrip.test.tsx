import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import Filmstrip from '../Filmstrip';
import { useDrillStore } from '../../../stores/drillStore';
import { createDrill, createFrame } from '../../../types';
import { generateId } from '../../../utils/uuid';

describe('Filmstrip', () => {
  beforeEach(() => {
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
  });

  it('should show message when no frames', () => {
    render(<Filmstrip />);
    
    expect(screen.getByText(/No frames yet/)).toBeInTheDocument();
  });

  it('should render frame thumbnails', () => {
    const drill = createDrill('test-id', 'Test Drill');
    drill.frames = [
      createFrame(generateId(), 0, 0, 5.0),
      createFrame(generateId(), 1, 5.0, 5.0),
    ];
    useDrillStore.setState({ drill });

    render(<Filmstrip />);
    
    // Frame thumbnails should be rendered (numbers shown)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

