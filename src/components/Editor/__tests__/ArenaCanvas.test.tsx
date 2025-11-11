import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '../../../test/testUtils';
import ArenaCanvas from '../ArenaCanvas';
import { useDrillStore } from '../../../stores/drillStore';
import { useEditorStore } from '../../../stores/editorStore';
import { createDrill, createFrame, createHorse } from '../../../types';
import { generateId } from '../../../utils/uuid';

describe('ArenaCanvas', () => {
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

  it('should render nothing when no current frame', () => {
    const { container } = render(
      <ArenaCanvas
        width={800}
        height={600}
        offsetX={0}
        offsetY={0}
        zoom={1.0}
        pan={{ x: 0, y: 0 }}
      />
    );
    
    // Should return null when no current frame
    expect(container.firstChild).toBeNull();
  });

  it('should render horses when frame has horses', () => {
    const drill = createDrill('test-id', 'Test Drill');
    const frame = createFrame(generateId(), 0, 0, 5.0);
    const horse = createHorse(generateId(), 1, { x: 0.5, y: 0.5 });
    frame.horses = [horse];
    drill.frames = [frame];
    
    useDrillStore.setState({ drill });

    const { getAllByTestId } = render(
      <ArenaCanvas
        width={800}
        height={600}
        offsetX={0}
        offsetY={0}
        zoom={1.0}
        pan={{ x: 0, y: 0 }}
      />
    );
    
    // Should render groups (arena group + horse groups)
    const groups = getAllByTestId('group');
    expect(groups.length).toBeGreaterThan(0);
    // Should have ellipses (body and head) and path (tail) for the horse
    expect(getAllByTestId('ellipse').length).toBeGreaterThan(0);
    expect(getAllByTestId('path').length).toBeGreaterThan(0);
  });

  it('should render grid lines', () => {
    const drill = createDrill('test-id', 'Test Drill');
    drill.frames = [createFrame(generateId(), 0, 0, 5.0)];
    useDrillStore.setState({ drill });

    const { getAllByTestId } = render(
      <ArenaCanvas
        width={800}
        height={600}
        offsetX={0}
        offsetY={0}
        zoom={1.0}
        pan={{ x: 0, y: 0 }}
      />
    );
    
    // Should have grid lines (mocked as lines)
    const lines = getAllByTestId('line');
    expect(lines.length).toBeGreaterThan(0);
  });
});

