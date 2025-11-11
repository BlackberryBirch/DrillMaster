import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import EditorToolbar from '../EditorToolbar';
import { useDrillStore } from '../../../stores/drillStore';
import { useEditorStore } from '../../../stores/editorStore';
import { createDrill, createFrame } from '../../../types';
import { generateId } from '../../../utils/uuid';

describe('EditorToolbar', () => {
  beforeEach(() => {
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
    useEditorStore.setState({
      showDirectionArrows: true,
      zoom: 1.0,
    });
  });

  it('should render toolbar with controls', () => {
    const drill = createDrill('test-id', 'Test Drill');
    drill.frames = [createFrame(generateId(), 0, 0, 5.0)];
    useDrillStore.setState({ drill });

    render(<EditorToolbar />);
    
    expect(screen.getByText('Add Horse')).toBeInTheDocument();
    expect(screen.getByText('Show Arrows')).toBeInTheDocument();
  });

  it('should show frame counter', () => {
    const drill = createDrill('test-id', 'Test Drill');
    drill.frames = [createFrame(generateId(), 0, 0, 5.0)];
    useDrillStore.setState({ drill });

    render(<EditorToolbar />);
    
    expect(screen.getByText(/Frame 1 \/ 1/)).toBeInTheDocument();
  });

  it('should have zoom control', () => {
    const drill = createDrill('test-id', 'Test Drill');
    drill.frames = [createFrame(generateId(), 0, 0, 5.0)];
    useDrillStore.setState({ drill });

    render(<EditorToolbar />);
    
    // Zoom control has a span with "Zoom:" text and a range input
    expect(screen.getByText('Zoom:')).toBeInTheDocument();
    const zoomInput = screen.getByRole('slider');
    expect(zoomInput).toBeInTheDocument();
    expect(zoomInput).toHaveAttribute('type', 'range');
  });
});

