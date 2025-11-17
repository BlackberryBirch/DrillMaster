import { useEditorStore } from '../../stores/editorStore';
import { useDrillStore } from '../../stores/drillStore';
import { createHorse } from '../../types';
import { generateId } from '../../utils/uuid';
import FrameCounter from './FrameCounter';

export default function EditorToolbar() {
  const showDirectionArrows = useEditorStore((state) => state.showDirectionArrows);
  const toggleDirectionArrows = useEditorStore((state) => state.toggleDirectionArrows);
  const resetView = useEditorStore((state) => state.resetView);
  
  const currentFrame = useDrillStore((state) => state.getCurrentFrame());
  const addHorseToFrame = useDrillStore((state) => state.addHorseToFrame);

  const handleAddHorse = () => {
    if (!currentFrame) return;
    
    const newHorse = createHorse(
      generateId(),
      currentFrame.horses.length + 1,
      { x: 0.5, y: 0.5 },
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
      
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
      
      <button
        onClick={resetView}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
      >
        Reset View
      </button>
      
      <div className="flex-1" />
      
      {currentFrame && (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <FrameCounter />
        </div>
      )}
    </div>
  );
}

