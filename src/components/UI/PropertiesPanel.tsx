import { useDrillStore } from '../../stores/drillStore';
import { useEditorStore } from '../../stores/editorStore';
import { GAITS, Gait, createSubPattern } from '../../types';
import { generateId } from '../../utils/uuid';

export default function PropertiesPanel() {
  const currentFrame = useDrillStore((state) => state.getCurrentFrame());
  const selectedHorseIds = useEditorStore((state) => state.selectedHorseIds);
  const showDirectionArrows = useEditorStore((state) => state.showDirectionArrows);
  const snapToGrid = useEditorStore((state) => state.snapToGrid);
  const toggleDirectionArrows = useEditorStore((state) => state.toggleDirectionArrows);
  const toggleSnapToGrid = useEditorStore((state) => state.toggleSnapToGrid);
  const updateHorseInFrame = useDrillStore((state) => state.updateHorseInFrame);
  const addSubPatternToFrame = useDrillStore((state) => state.addSubPatternToFrame);
  const removeSubPatternFromFrame = useDrillStore((state) => state.removeSubPatternFromFrame);
  const alignHorsesHorizontally = useDrillStore((state) => state.alignHorsesHorizontally);
  const alignHorsesVertically = useDrillStore((state) => state.alignHorsesVertically);
  const distributeHorsesEvenly = useDrillStore((state) => state.distributeHorsesEvenly);

  const selectedHorse = currentFrame?.horses.find(
    (h) => selectedHorseIds.includes(h.id)
  );

  const handleUpdateHorse = (updates: Partial<typeof selectedHorse>) => {
    if (!currentFrame || !selectedHorse) return;
    updateHorseInFrame(currentFrame.id, selectedHorse.id, updates);
  };

  const handleDirectionChange = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    handleUpdateHorse({ direction: radians });
  };

  const handleSpeedChange = (speed: Gait) => {
    handleUpdateHorse({ speed });
  };

  const handleLabelChange = (label: string) => {
    const numLabel = parseInt(label, 10);
    handleUpdateHorse({ label: isNaN(numLabel) ? label : numLabel });
  };

  const handleCreateSubPattern = () => {
    if (!currentFrame || selectedHorseIds.length < 2) {
      alert('Please select at least 2 horses to create a sub-pattern');
      return;
    }

    const subPattern = createSubPattern(generateId(), selectedHorseIds);
    
    // Update horses to be locked and assigned to pattern
    selectedHorseIds.forEach((horseId) => {
      updateHorseInFrame(currentFrame.id, horseId, {
        locked: true,
        subPatternId: subPattern.id,
      });
    });

    addSubPatternToFrame(currentFrame.id, subPattern);
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Properties</h2>

      {/* Editor Settings */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">Editor Settings</h3>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={showDirectionArrows}
            onChange={toggleDirectionArrows}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Show Direction Arrows</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={toggleSnapToGrid}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Snap to Grid</span>
        </label>
      </div>

      {/* Frame Properties */}
      {currentFrame && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">Frame {currentFrame.index + 1}</h3>
          <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <div>Horses: {currentFrame.horses.length}</div>
            <div>Sub-patterns: {currentFrame.subPatterns.length}</div>
            <div>Duration: {currentFrame.duration}s</div>
          </div>
        </div>
      )}

      {/* Selected Horse Properties */}
      {selectedHorse && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">Horse Properties</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Label</label>
              <input
                type="text"
                value={selectedHorse.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Speed (Gait)</label>
              <select
                value={selectedHorse.speed}
                onChange={(e) => handleSpeedChange(e.target.value as Gait)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm"
              >
                {GAITS.map((gait) => (
                  <option key={gait} value={gait}>
                    {gait.charAt(0).toUpperCase() + gait.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Direction: {(selectedHorse.direction * 180 / Math.PI).toFixed(0)}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={(selectedHorse.direction * 180 / Math.PI) % 360}
                onChange={(e) => handleDirectionChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div>Position: ({selectedHorse.position.x.toFixed(2)}, {selectedHorse.position.y.toFixed(2)})</div>
              <div>Locked: {selectedHorse.locked ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Horse Alignment & Distribution */}
      {currentFrame && selectedHorseIds.length >= 2 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">
            Alignment & Distribution ({selectedHorseIds.length} horses)
          </h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (currentFrame) {
                    alignHorsesHorizontally(currentFrame.id, selectedHorseIds);
                  }
                }}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                title="Align horizontally (same Y position) - Ctrl/Cmd + Shift + H"
              >
                Align H
              </button>
              <button
                onClick={() => {
                  if (currentFrame) {
                    alignHorsesVertically(currentFrame.id, selectedHorseIds);
                  }
                }}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                title="Align vertically (same X position) - Ctrl/Cmd + Shift + V"
              >
                Align V
              </button>
            </div>
            {selectedHorseIds.length >= 3 && (
              <button
                onClick={() => {
                  if (currentFrame) {
                    distributeHorsesEvenly(currentFrame.id, selectedHorseIds);
                  }
                }}
                className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                title="Distribute evenly along line between two most separated horses - Ctrl/Cmd + Alt + D"
              >
                Distribute Evenly
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sub-Pattern Creation */}
      {currentFrame && selectedHorseIds.length >= 2 && (
        <div className="mb-6">
          <button
            onClick={handleCreateSubPattern}
            className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
          >
            Create Sub-Pattern ({selectedHorseIds.length} horses)
          </button>
        </div>
      )}

      {/* Sub-Patterns List */}
      {currentFrame && currentFrame.subPatterns.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">Sub-Patterns</h3>
          <div className="space-y-2">
            {currentFrame.subPatterns.map((pattern) => (
              <div key={pattern.id} className="text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium">
                    {pattern.name || `Pattern ${pattern.id.slice(0, 8)}`}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Delete this sub-pattern?')) {
                        removeSubPatternFromFrame(currentFrame.id, pattern.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    ×
                  </button>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {pattern.horseIds.length} horses
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

