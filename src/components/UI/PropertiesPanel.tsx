import { useDrillStore } from '../../stores/drillStore';
import { useEditorStore } from '../../stores/editorStore';
import { GAITS, Gait } from '../../types';

export default function PropertiesPanel() {
  const currentFrame = useDrillStore((state) => state.getCurrentFrame());
  const selectedHorseIds = useEditorStore((state) => state.selectedHorseIds);
  const showDirectionArrows = useEditorStore((state) => state.showDirectionArrows);
  const toggleDirectionArrows = useEditorStore((state) => state.toggleDirectionArrows);
  const updateHorseInFrame = useDrillStore((state) => state.updateHorseInFrame);
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

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Properties</h2>

      {/* Editor Settings */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">Editor Settings</h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showDirectionArrows}
            onChange={toggleDirectionArrows}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Show Direction Arrows</span>
        </label>
      </div>

      {/* Frame Properties */}
      {currentFrame && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">Frame {currentFrame.index + 1}</h3>
          <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <div>Horses: {currentFrame.horses.length}</div>
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
    </div>
  );
}

