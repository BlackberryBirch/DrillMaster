import { useDrillStore } from '../../stores/drillStore';
import { useEditorStore } from '../../stores/editorStore';
import { GAITS, Gait, Horse } from '../../types';

export default function PropertiesPanel() {
  const currentFrame = useDrillStore((state) => state.getCurrentFrame());
  const selectedHorseIds = useEditorStore((state) => state.selectedHorseIds);
  const showDirectionArrows = useEditorStore((state) => state.showDirectionArrows);
  const toggleDirectionArrows = useEditorStore((state) => state.toggleDirectionArrows);
  const updateHorseInFrame = useDrillStore((state) => state.updateHorseInFrame);
  const updateFrame = useDrillStore((state) => state.updateFrame);

  const selectedHorse = currentFrame?.horses.find(
    (h) => selectedHorseIds.includes(h.id)
  );

  const handleUpdateHorse = (updates: Partial<typeof selectedHorse>) => {
    if (!currentFrame || !selectedHorse) return;
    updateHorseInFrame(currentFrame.id, selectedHorse.id, updates as Partial<Horse>);
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
          <div className="space-y-3">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Horses: {currentFrame.horses.length}
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Duration (seconds)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={currentFrame.duration}
                onChange={(e) => {
                  const newDuration = parseFloat(e.target.value);
                  if (!isNaN(newDuration) && newDuration > 0) {
                    updateFrame(currentFrame.id, { duration: newDuration });
                  }
                }}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm"
              />
            </div>
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
              <div>Position: ({selectedHorse.position.x.toFixed(2)}, {selectedHorse.position.y.toFixed(2)}) m</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

