import { useState, useCallback, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import ArenaCanvas from './ArenaCanvas';
import EditorToolbar from './EditorToolbar';
import { useEditorStore } from '../../stores/editorStore';
import { useDrillStore } from '../../stores/drillStore';
import { useThemeStore } from '../../stores/themeStore';
import { useHistoryStore } from '../../stores/historyStore';
import { calculateArenaDimensions } from '../../utils/arena';

export default function Editor() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const [parentElement, setParentElement] = useState<HTMLDivElement | null>(null);
  const zoom = useEditorStore((state) => state.zoom);
  const pan = useEditorStore((state) => state.pan);
  const selectedHorseIds = useEditorStore((state) => state.selectedHorseIds);
  const currentFrame = useDrillStore((state) => state.getCurrentFrame());
  const alignHorsesHorizontally = useDrillStore((state) => state.alignHorsesHorizontally);
  const alignHorsesVertically = useDrillStore((state) => state.alignHorsesVertically);
  const distributeHorsesEvenly = useDrillStore((state) => state.distributeHorsesEvenly);
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);
  const canUndo = useHistoryStore((state) => state.canUndo);
  const canRedo = useHistoryStore((state) => state.canRedo);

  // Callback ref to get the parent container element (the flex container)
  const parentRef = useCallback((node: HTMLDivElement | null) => {
    setParentElement(node);
  }, []);

  // Callback ref to get the canvas container element when it mounts
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerElement(node);
  }, []);

  useEffect(() => {
    // Use the parent element (flex container) if available, otherwise fall back to containerElement
    const elementToObserve = parentElement || containerElement;
    if (!elementToObserve) return;

    const updateDimensions = () => {
      // Use requestAnimationFrame to ensure we get dimensions after DOM updates
      requestAnimationFrame(() => {
        // Measure the actual canvas container, not the parent
        const rect = containerElement?.getBoundingClientRect();
        if (!rect) return;
        
        const { width, height } = rect;
        // Update dimensions if valid (greater than 0)
        // This handles both increases and decreases in window size
        if (width > 0 && height > 0) {
          setDimensions((prev) => {
            // Use Math.round to avoid floating point precision issues
            const roundedWidth = Math.round(width);
            const roundedHeight = Math.round(height);
            // Only update if dimensions actually changed to avoid unnecessary re-renders
            if (prev.width !== roundedWidth || prev.height !== roundedHeight) {
              return { width: roundedWidth, height: roundedHeight };
            }
            return prev;
          });
        }
      });
    };

    // Initial measurement
    if (containerElement) {
      updateDimensions();
    }

    // Use ResizeObserver to watch both the parent flex container and the canvas container
    // This ensures we detect when the flex layout changes (e.g., when window resizes)
    const resizeObserver = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to ensure we get dimensions after DOM updates
      // This is especially important when the window decreases in size
      requestAnimationFrame(() => {
        // Always measure the actual canvas container
        if (!containerElement) return;
        
        const rect = containerElement.getBoundingClientRect();
        const { width, height } = rect;

        // Update dimensions if valid (handles both increases and decreases)
        if (width > 0 && height > 0) {
          setDimensions((prev) => {
            // Use Math.round to avoid floating point precision issues
            const roundedWidth = Math.round(width);
            const roundedHeight = Math.round(height);
            // Only update if dimensions actually changed
            if (prev.width !== roundedWidth || prev.height !== roundedHeight) {
              return { width: roundedWidth, height: roundedHeight };
            }
            return prev;
          });
        }
      });
    });

    // Observe both the parent flex container and the canvas container
    // This ensures we catch all resize scenarios
    if (parentElement) {
      resizeObserver.observe(parentElement);
    }
    if (containerElement) {
      resizeObserver.observe(containerElement);
    }

    // Also listen to window resize as a fallback
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [containerElement, parentElement]);

  // Keyboard shortcuts for undo/redo, alignment and distribution
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field (don't trigger shortcuts when typing)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + Z: Undo
      if (ctrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
        return;
      }

      // Ctrl/Cmd + Shift + Z: Redo
      if (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z' && !e.altKey) {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
        return;
      }

      // Only handle alignment shortcuts when we have horses selected and a current frame
      if (!currentFrame || selectedHorseIds.length < 2) return;

      // Ctrl/Cmd + Shift + H: Align Horizontally
      if (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'h' && !e.altKey) {
        e.preventDefault();
        alignHorsesHorizontally(currentFrame.id, selectedHorseIds);
        return;
      }

      // Ctrl/Cmd + Shift + V: Align Vertically
      if (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'v' && !e.altKey) {
        e.preventDefault();
        alignHorsesVertically(currentFrame.id, selectedHorseIds);
        return;
      }

      // Ctrl/Cmd + Alt + D: Distribute Evenly (requires 3+ horses)
      if (ctrlOrCmd && e.altKey && e.key.toLowerCase() === 'd' && selectedHorseIds.length >= 3) {
        e.preventDefault();
        distributeHorsesEvenly(currentFrame.id, selectedHorseIds);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentFrame, selectedHorseIds, alignHorsesHorizontally, alignHorsesVertically, distributeHorsesEvenly, undo, redo, canUndo, canRedo]);

  const arenaDims = calculateArenaDimensions(dimensions.width, dimensions.height - 60);
  const theme = useThemeStore((state) => state.theme);

  return (
    <div ref={parentRef} className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <EditorToolbar />
      <div ref={containerRef} className="flex-1 overflow-hidden relative w-full h-full">
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          style={{ background: theme === 'dark' ? '#2D2D2D' : '#F5F5DC' }}
        >
          <Layer>
            <ArenaCanvas
              width={arenaDims.width}
              height={arenaDims.height}
              offsetX={arenaDims.offsetX}
              offsetY={arenaDims.offsetY}
              zoom={zoom}
              pan={pan}
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

