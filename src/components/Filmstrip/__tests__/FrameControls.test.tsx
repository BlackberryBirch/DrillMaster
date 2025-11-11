import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import FrameControls from '../FrameControls';
import { useDrillStore } from '../../../stores/drillStore';
import { createDrill, createFrame } from '../../../types';
import { generateId } from '../../../utils/uuid';

// Mock window.confirm
const mockConfirm = vi.fn(() => true);
window.confirm = mockConfirm;

describe('FrameControls', () => {
  beforeEach(() => {
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
    mockConfirm.mockReturnValue(true);
  });

  it('should render control buttons', () => {
    const drill = createDrill('test-id', 'Test Drill');
    drill.frames = [createFrame(generateId(), 0, 0, 5.0)];
    useDrillStore.setState({ drill });

    render(<FrameControls />);
    
    expect(screen.getByText('+ Add Frame')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should disable duplicate and delete when no frame selected', () => {
    useDrillStore.setState({ drill: null });

    render(<FrameControls />);
    
    const duplicateButton = screen.getByText('Duplicate');
    const deleteButton = screen.getByText('Delete');
    
    expect(duplicateButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
  });

  it('should disable delete when only one frame exists', () => {
    const drill = createDrill('test-id', 'Test Drill');
    drill.frames = [createFrame(generateId(), 0, 0, 5.0)];
    useDrillStore.setState({ drill });

    render(<FrameControls />);
    
    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toBeDisabled();
  });
});

