import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '../../../test/testUtils';
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
    });
  });

  it('should render properties panel', () => {
    render(<PropertiesPanel />);
    
    expect(screen.getByText('Properties')).toBeInTheDocument();
  });

  it('should show frame duration when frame exists', async () => {
    const drill = createDrill('test-id', 'Test Drill');
    const frame = createFrame(generateId(), 0, 0, 5.0);
    drill.frames = [frame];
    useDrillStore.setState({ drill });

    render(<PropertiesPanel />);

    await act(async () => {
      screen.getByRole('button', { name: 'Frame' }).click();
    });
    expect(await screen.findByText(/Duration \(seconds\)/)).toBeInTheDocument();
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
    
    expect(screen.getByText('Selected horse')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
  });

});

