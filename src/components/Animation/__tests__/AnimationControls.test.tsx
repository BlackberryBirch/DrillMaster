import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import AnimationControls from '../AnimationControls';
import { useAnimationStore } from '../../../stores/animationStore';
import { useDrillStore } from '../../../stores/drillStore';
import { createDrill, createFrame } from '../../../types';
import { generateId } from '../../../utils/uuid';

describe('AnimationControls', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      state: 'stopped',
      currentTime: 0,
      playbackSpeed: 1.0,
      audioEnabled: true,
      audioVolume: 1.0,
    });
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
  });

  it('should render playback controls', () => {
    render(<AnimationControls />);
    
    expect(screen.getByText('▶ Play')).toBeInTheDocument();
    expect(screen.getByText('⏹ Stop')).toBeInTheDocument();
  });

  it('should show pause button when playing', () => {
    useAnimationStore.setState({ state: 'playing' });

    render(<AnimationControls />);
    
    expect(screen.getByText('⏸ Pause')).toBeInTheDocument();
  });

  it('should render speed control', () => {
    render(<AnimationControls />);
    
    expect(screen.getByText('Speed:')).toBeInTheDocument();
  });

  it('should render audio controls', () => {
    render(<AnimationControls />);
    
    expect(screen.getByText('Audio')).toBeInTheDocument();
  });

  it('should disable previous frame button at start', () => {
    const drill = createDrill('test-id', 'Test Drill');
    drill.frames = [createFrame(generateId(), 0, 0, 5.0)];
    useDrillStore.setState({ drill, currentFrameIndex: 0 });

    render(<AnimationControls />);
    
    const prevButton = screen.getByText('◄');
    expect(prevButton).toBeDisabled();
  });

  it('should disable next frame button at end', () => {
    const drill = createDrill('test-id', 'Test Drill');
    drill.frames = [createFrame(generateId(), 0, 0, 5.0)];
    useDrillStore.setState({ drill, currentFrameIndex: 0 });

    render(<AnimationControls />);
    
    const nextButton = screen.getByText('►');
    expect(nextButton).toBeDisabled();
  });
});

