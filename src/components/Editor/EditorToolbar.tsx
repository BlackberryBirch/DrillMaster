import { useEditorStore } from '../../stores/editorStore';
import { useDrillStore } from '../../stores/drillStore';
import { createHorse } from '../../types';
import { generateId } from '../../utils/uuid';
import FrameCounter from './FrameCounter';

const iconStrokeProps = {
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const AlignHorizontalIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-4 h-4"
    role="img"
    aria-hidden="true"
  >
    <line x1="12" y1="3" x2="12" y2="21" {...iconStrokeProps} />
    <line x1="6" y1="7" x2="18" y2="7" {...iconStrokeProps} />
    <line x1="8" y1="12" x2="16" y2="12" {...iconStrokeProps} />
    <line x1="6" y1="17" x2="18" y2="17" {...iconStrokeProps} />
  </svg>
);

const AlignVerticalIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-4 h-4"
    role="img"
    aria-hidden="true"
  >
    <line x1="3" y1="12" x2="21" y2="12" {...iconStrokeProps} />
    <line x1="7" y1="6" x2="7" y2="18" {...iconStrokeProps} />
    <line x1="12" y1="8" x2="12" y2="16" {...iconStrokeProps} />
    <line x1="17" y1="6" x2="17" y2="18" {...iconStrokeProps} />
  </svg>
);

export default function EditorToolbar() {
  const showDirectionArrows = useEditorStore((state) => state.showDirectionArrows);
  const toggleDirectionArrows = useEditorStore((state) => state.toggleDirectionArrows);
  const showPaths = useEditorStore((state) => state.showPaths);
  const toggleShowPaths = useEditorStore((state) => state.toggleShowPaths);
  const resetView = useEditorStore((state) => state.resetView);
  const selectedHorseIds = useEditorStore((state) => state.selectedHorseIds);
  
  const currentFrame = useDrillStore((state) => state.getCurrentFrame());
  const addHorseToFrame = useDrillStore((state) => state.addHorseToFrame);
  const alignHorsesHorizontally = useDrillStore((state) => state.alignHorsesHorizontally);
  const alignHorsesVertically = useDrillStore((state) => state.alignHorsesVertically);
  const distributeHorsesEvenly = useDrillStore((state) => state.distributeHorsesEvenly);
  const distributeHorsesEvenlyAroundCircle = useDrillStore((state) => state.distributeHorsesEvenlyAroundCircle);

  const handleAddHorse = () => {
    if (!currentFrame) return;
    
    const newHorse = createHorse(
      generateId(),
      currentFrame.horses.length + 1,
      { x: 0, y: 0 }, // Center of arena in meters
      0,
      'walk'
    );
    
    addHorseToFrame(currentFrame.id, newHorse);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 px-4 py-2 flex flex-wrap items-center gap-4">
      <button
        onClick={handleAddHorse}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
      >
        Add Horse
      </button>
      
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
      
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={showDirectionArrows}
          onChange={toggleDirectionArrows}
        />
        Show Arrows
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={showPaths}
          onChange={toggleShowPaths}
        />
        Show Paths
      </label>

      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
      
      <button
        onClick={resetView}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
      >
        Reset View
      </button>
      
      {/* Alignment & Distribution buttons - only show when 2+ horses selected */}
      {currentFrame && selectedHorseIds.length >= 2 && (
        <>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
          
          <button
            onClick={() => {
              if (currentFrame) {
                // Align H button now calls alignHorsesVertically (same X position)
                alignHorsesVertically(currentFrame.id, selectedHorseIds);
              }
            }}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            title="Align horizontally (same X position) - Ctrl/Cmd + Shift + H"
            disabled={selectedHorseIds.length < 2}
            aria-label="Align horizontally (same X position)"
          >
            <AlignHorizontalIcon />
          </button>
          
          <button
            onClick={() => {
              if (currentFrame) {
                // Align V button now calls alignHorsesHorizontally (same Y position)
                alignHorsesHorizontally(currentFrame.id, selectedHorseIds);
              }
            }}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            title="Align vertically (same Y position) - Ctrl/Cmd + Shift + V"
            disabled={selectedHorseIds.length < 2}
            aria-label="Align vertically (same Y position)"
          >
            <AlignVerticalIcon />
          </button>
          
          {selectedHorseIds.length >= 3 && (
            <button
              onClick={() => {
                if (currentFrame) {
                  distributeHorsesEvenly(currentFrame.id, selectedHorseIds);
                }
              }}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              title="Distribute evenly along line between two most separated horses - Ctrl/Cmd + Alt + D"
            >
              Distribute Evenly
            </button>
          )}
          
          {selectedHorseIds.length >= 2 && (
            <button
              onClick={() => {
                if (currentFrame) {
                  distributeHorsesEvenlyAroundCircle(currentFrame.id, selectedHorseIds);
                }
              }}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              title="Distribute evenly around circle while keeping horses close to original positions"
            >
              Distribute Around Circle
            </button>
          )}
        </>
      )}
      
      <div className="flex-1" />
      
      {currentFrame && (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <FrameCounter />
        </div>
      )}
    </div>
  );
}

