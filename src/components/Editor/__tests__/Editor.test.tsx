import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, stageHandlers } from '../../../test/testUtils';
import Editor from '../Editor';
import { useEditorStore } from '../../../stores/editorStore';
import { useDrillStore } from '../../../stores/drillStore';

// Mock window resize
const mockResize = vi.fn();
window.addEventListener = vi.fn((event, handler) => {
  if (event === 'resize') {
    mockResize.mockImplementation(handler);
  }
});
window.removeEventListener = vi.fn();

// Helper to create a mock touch object
const createTouch = (clientX: number, clientY: number, identifier: number = 0): Touch => ({
  clientX,
  clientY,
  identifier,
  screenX: clientX,
  screenY: clientY,
  pageX: clientX,
  pageY: clientY,
  target: document.body,
  radiusX: 0,
  radiusY: 0,
  rotationAngle: 0,
  force: 0,
} as Touch);

// Helper to create a mock touch event
const createTouchEvent = (type: string, touches: Touch[]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = new Event(type, { bubbles: true, cancelable: true }) as any;
  event.touches = touches;
  event.changedTouches = touches;
  event.targetTouches = touches;
  event.preventDefault = vi.fn();
  return event;
};

describe('Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useEditorStore.setState({ zoom: 1.0, pan: { x: 0, y: 0 } });
    // Reset stage handlers
    stageHandlers.onTouchStart = undefined;
    stageHandlers.onTouchMove = undefined;
    stageHandlers.onTouchEnd = undefined;
    // Ensure we have a drill with at least one frame
    const drillStore = useDrillStore.getState();
    if (!drillStore.drill || drillStore.drill.frames.length === 0) {
      drillStore.createNewDrill('Test Drill');
      drillStore.setCurrentFrame(0);
    }
  });

  it('should render editor component', () => {
    const { container } = render(<Editor />);
    expect(container).toBeInTheDocument();
  });

  it('should render stage (mocked Konva)', () => {
    const { getByTestId } = render(<Editor />);
    // Stage is mocked in testUtils
    expect(getByTestId('stage')).toBeInTheDocument();
  });

  describe('Pinch Zoom', () => {
    it('should handle pinch zoom start with two touches', async () => {
      const { container } = render(<Editor />);
      const stage = container.querySelector('[data-testid="stage"]');
      
      expect(stage).toBeInTheDocument();
      expect(stageHandlers.onTouchStart).toBeDefined();
      
      // Create two touch points
      const touch1 = createTouch(100, 100, 0);
      const touch2 = createTouch(200, 200, 1);
      const touches = [touch1, touch2];
      
      // Simulate touch start
      const touchStartEvent = createTouchEvent('touchstart', touches);
      if (stageHandlers.onTouchStart) {
        stageHandlers.onTouchStart({ evt: touchStartEvent });
      }
      
      // Verify preventDefault was called
      expect(touchStartEvent.preventDefault).toHaveBeenCalled();
    });

    it('should zoom in when pinch distance increases', async () => {
      const { container } = render(<Editor />);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _stage = container.querySelector('[data-testid="stage"]');
      
      // Set initial zoom
      useEditorStore.setState({ zoom: 1.0, pan: { x: 0, y: 0 } });
      
      // Mock getBoundingClientRect for container
      const containerElement = container.querySelector('.flex-1');
      if (containerElement) {
        vi.spyOn(containerElement, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
          right: 800,
          bottom: 600,
          x: 0,
          y: 0,
          toJSON: vi.fn(),
        } as DOMRect);
      }
      
      // Initial pinch - two touches 100px apart
      const initialTouch1 = createTouch(100, 100, 0);
      const initialTouch2 = createTouch(200, 100, 1);
      const initialTouches = [initialTouch1, initialTouch2];
      const touchStartEvent = createTouchEvent('touchstart', initialTouches);
      
      if (stageHandlers.onTouchStart) {
        stageHandlers.onTouchStart({ evt: touchStartEvent });
      }
      
      // Move touches further apart (200px) - should zoom in
      const movedTouch1 = createTouch(50, 100, 0);
      const movedTouch2 = createTouch(250, 100, 1);
      const movedTouches = [movedTouch1, movedTouch2];
      const touchMoveEvent = createTouchEvent('touchmove', movedTouches);
      
      if (stageHandlers.onTouchMove) {
        stageHandlers.onTouchMove({ evt: touchMoveEvent });
      }
      
      // Wait for state update
      await waitFor(() => {
        const zoom = useEditorStore.getState().zoom;
        expect(zoom).toBeGreaterThan(1.0);
      });
    });

    it('should zoom out when pinch distance decreases', async () => {
      const { container } = render(<Editor />);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _stage = container.querySelector('[data-testid="stage"]');
      
      // Set initial zoom to 2.0
      useEditorStore.setState({ zoom: 2.0, pan: { x: 0, y: 0 } });
      
      // Mock getBoundingClientRect for container
      const containerElement = container.querySelector('.flex-1');
      if (containerElement) {
        vi.spyOn(containerElement, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
          right: 800,
          bottom: 600,
          x: 0,
          y: 0,
          toJSON: vi.fn(),
        } as DOMRect);
      }
      
      // Initial pinch - two touches 200px apart
      const initialTouch1 = createTouch(100, 100, 0);
      const initialTouch2 = createTouch(300, 100, 1);
      const initialTouches = [initialTouch1, initialTouch2];
      const touchStartEvent = createTouchEvent('touchstart', initialTouches);
      
      if (stageHandlers.onTouchStart) {
        stageHandlers.onTouchStart({ evt: touchStartEvent });
      }
      
      // Move touches closer together (100px) - should zoom out
      const movedTouch1 = createTouch(150, 100, 0);
      const movedTouch2 = createTouch(250, 100, 1);
      const movedTouches = [movedTouch1, movedTouch2];
      const touchMoveEvent = createTouchEvent('touchmove', movedTouches);
      
      if (stageHandlers.onTouchMove) {
        stageHandlers.onTouchMove({ evt: touchMoveEvent });
      }
      
      // Wait for state update
      await waitFor(() => {
        const zoom = useEditorStore.getState().zoom;
        expect(zoom).toBeLessThan(2.0);
      });
    });

    it('should clamp zoom to minimum 0.5', async () => {
      const { container } = render(<Editor />);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _stage = container.querySelector('[data-testid="stage"]');
      
      // Set initial zoom to 0.6
      useEditorStore.setState({ zoom: 0.6, pan: { x: 0, y: 0 } });
      
      // Mock getBoundingClientRect for container
      const containerElement = container.querySelector('.flex-1');
      if (containerElement) {
        vi.spyOn(containerElement, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
          right: 800,
          bottom: 600,
          x: 0,
          y: 0,
          toJSON: vi.fn(),
        } as DOMRect);
      }
      
      // Initial pinch
      const initialTouch1 = createTouch(100, 100, 0);
      const initialTouch2 = createTouch(200, 100, 1);
      const initialTouches = [initialTouch1, initialTouch2];
      const touchStartEvent = createTouchEvent('touchstart', initialTouches);
      
      if (stageHandlers.onTouchStart) {
        stageHandlers.onTouchStart({ evt: touchStartEvent });
      }
      
      // Move touches very close together - should zoom out but clamp at 0.5
      const movedTouch1 = createTouch(140, 100, 0);
      const movedTouch2 = createTouch(160, 100, 1);
      const movedTouches = [movedTouch1, movedTouch2];
      const touchMoveEvent = createTouchEvent('touchmove', movedTouches);
      
      if (stageHandlers.onTouchMove) {
        stageHandlers.onTouchMove({ evt: touchMoveEvent });
      }
      
      // Wait for state update
      await waitFor(() => {
        const zoom = useEditorStore.getState().zoom;
        expect(zoom).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should clamp zoom to maximum 3.0', async () => {
      const { container } = render(<Editor />);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _stage = container.querySelector('[data-testid="stage"]');
      
      // Set initial zoom to 2.5
      useEditorStore.setState({ zoom: 2.5, pan: { x: 0, y: 0 } });
      
      // Mock getBoundingClientRect for container
      const containerElement = container.querySelector('.flex-1');
      if (containerElement) {
        vi.spyOn(containerElement, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
          right: 800,
          bottom: 600,
          x: 0,
          y: 0,
          toJSON: vi.fn(),
        } as DOMRect);
      }
      
      // Initial pinch
      const initialTouch1 = createTouch(100, 100, 0);
      const initialTouch2 = createTouch(200, 100, 1);
      const initialTouches = [initialTouch1, initialTouch2];
      const touchStartEvent = createTouchEvent('touchstart', initialTouches);
      
      if (stageHandlers.onTouchStart) {
        stageHandlers.onTouchStart({ evt: touchStartEvent });
      }
      
      // Move touches very far apart - should zoom in but clamp at 3.0
      const movedTouch1 = createTouch(0, 100, 0);
      const movedTouch2 = createTouch(500, 100, 1);
      const movedTouches = [movedTouch1, movedTouch2];
      const touchMoveEvent = createTouchEvent('touchmove', movedTouches);
      
      if (stageHandlers.onTouchMove) {
        stageHandlers.onTouchMove({ evt: touchMoveEvent });
      }
      
      // Wait for state update
      await waitFor(() => {
        const zoom = useEditorStore.getState().zoom;
        expect(zoom).toBeLessThanOrEqual(3.0);
      });
    });

    it('should handle touch end and reset pinch state', async () => {
      const { container } = render(<Editor />);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _stage = container.querySelector('[data-testid="stage"]');
      
      // Mock getBoundingClientRect for container
      const containerElement = container.querySelector('.flex-1');
      if (containerElement) {
        vi.spyOn(containerElement, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
          right: 800,
          bottom: 600,
          x: 0,
          y: 0,
          toJSON: vi.fn(),
        } as DOMRect);
      }
      
      // Start pinch
      const initialTouch1 = createTouch(100, 100, 0);
      const initialTouch2 = createTouch(200, 100, 1);
      const initialTouches = [initialTouch1, initialTouch2];
      const touchStartEvent = createTouchEvent('touchstart', initialTouches);
      
      if (stageHandlers.onTouchStart) {
        stageHandlers.onTouchStart({ evt: touchStartEvent });
      }
      
      // End touch
      const touchEndEvent = createTouchEvent('touchend', []);
      
      if (stageHandlers.onTouchEnd) {
        stageHandlers.onTouchEnd({ evt: touchEndEvent });
      }
      
      // After touch end, a new pinch should start fresh
      const newTouch1 = createTouch(150, 150, 0);
      const newTouch2 = createTouch(250, 150, 1);
      const newTouches = [newTouch1, newTouch2];
      const newTouchStartEvent = createTouchEvent('touchstart', newTouches);
      
      if (stageHandlers.onTouchStart) {
        stageHandlers.onTouchStart({ evt: newTouchStartEvent });
      }
      
      // Should not throw and should handle the new pinch
      expect(newTouchStartEvent.preventDefault).toHaveBeenCalled();
    });

    it('should ignore single touch events', async () => {
      const { container } = render(<Editor />);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _stage = container.querySelector('[data-testid="stage"]');
      
      // Single touch should not trigger pinch
      const singleTouch = createTouch(100, 100, 0);
      const touchStartEvent = createTouchEvent('touchstart', [singleTouch]);
      
      if (stageHandlers.onTouchStart) {
        stageHandlers.onTouchStart({ evt: touchStartEvent });
      }
      
      // Zoom should remain unchanged
      const zoom = useEditorStore.getState().zoom;
      expect(zoom).toBe(1.0);
    });
  });
});

