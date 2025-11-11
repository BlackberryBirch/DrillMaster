import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import PropertiesPanel from '../PropertiesPanel';
import { useDrillStore } from '../../../stores/drillStore';
import { useEditorStore } from '../../../stores/editorStore';
import { createDrill, createHorse, createFrame } from '../../../types';
import { generateId } from '../../../utils/uuid';

describe('PropertiesPanel', () => {
  beforeEach(() => {
    useDrillStore.setState({
      drill: null,
      currentFrameIndex: 0,
    });
    useEditorStore.setState({
      selectedHorseIds: [],
      showDirectionArrows: true,
      snapToGrid: false,
    });
  });

  it('should render properties panel', () => {
    render(<PropertiesPanel />);
    
    expect(screen.getByText('Properties')).toBeInTheDocument();
  });

  it('should show editor settings', () => {
    render(<PropertiesPanel />);
    
    expect(screen.getByText('Editor Settings')).toBeInTheDocument();
    expect(screen.getByText('Show Direction Arrows')).toBeInTheDocument();
    expect(screen.getByText('Snap to Grid')).toBeInTheDocument();
  });

  it('should show frame properties when frame exists', () => {
    const drill = createDrill('test-id', 'Test Drill');
    const frame = createFrame(generateId(), 0, 0, 5.0);
    drill.frames = [frame];
    useDrillStore.setState({ drill });

    render(<PropertiesPanel />);
    
    expect(screen.getByText(/Frame 1/)).toBeInTheDocument();
    expect(screen.getByText(/Horses: 0/)).toBeInTheDocument();
  });

  it('should show selected horse properties', () => {
    const drill = createDrill('test-id', 'Test Drill');
    const frame = createFrame(generateId(), 0, 0, 5.0);
    const horse = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });
    frame.horses = [horse];
    drill.frames = [frame];
    
    useDrillStore.setState({ drill });
    useEditorStore.setState({ selectedHorseIds: [horse.id] });

    render(<PropertiesPanel />);
    
    expect(screen.getByText('Horse Properties')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

  it('should show create sub-pattern button when multiple horses selected', () => {
    const drill = createDrill('test-id', 'Test Drill');
    const frame = createFrame(generateId(), 0, 0, 5.0);
    const horse1 = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });
    const horse2 = createHorse(generateId(), 2, { x: 0.6, y: 0.6 });
    frame.horses = [horse1, horse2];
    drill.frames = [frame];
    
    useDrillStore.setState({ drill });
    useEditorStore.setState({ selectedHorseIds: [horse1.id, horse2.id] });

    render(<PropertiesPanel />);
    
    expect(screen.getByText(/Create Sub-Pattern/)).toBeInTheDocument();
  });

  it('should show sub-patterns list when patterns exist', () => {
    const drill = createDrill('test-id', 'Test Drill');
    const frame = createFrame(generateId(), 0, 0, 5.0);
    frame.subPatterns = [{
      id: generateId(),
      horseIds: [generateId()],
      locked: true,
    }];
    drill.frames = [frame];
    
    useDrillStore.setState({ drill });

    render(<PropertiesPanel />);
    
    expect(screen.getByText('Sub-Patterns')).toBeInTheDocument();
  });
});

