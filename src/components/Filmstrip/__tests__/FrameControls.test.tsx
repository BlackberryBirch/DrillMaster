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
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /key frame/i })).toBeInTheDocument();
  });

  it('should disable add frame and delete when no frames exist', () => {
    useDrillStore.setState({ drill: null });

    render(<FrameControls />);
    
    const addFrameButton = screen.getByText('+ Add Frame');
    const deleteButton = screen.getByText('Delete');
    
    expect(addFrameButton).toBeDisabled();
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

