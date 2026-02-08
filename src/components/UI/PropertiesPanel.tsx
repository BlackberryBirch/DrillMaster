import { useDrillStore } from '../../stores/drillStore';
import { useEditorStore } from '../../stores/editorStore';
import { GAITS, Gait, Horse } from '../../types';

export default function PropertiesPanel() {
  const currentFrame = useDrillStore((state) => state.getCurrentFrame());
  const selectedHorseIds = useEditorStore((state) => state.selectedHorseIds);
  const updateHorseInFrame = useDrillStore((state) => state.updateHorseInFrame);
  const batchUpdateHorsesInFrame = useDrillStore((state) => state.batchUpdateHorsesInFrame);
  const updateFrame = useDrillStore((state) => state.updateFrame);

  const selectedHorses = currentFrame?.horses.filter((h) => selectedHorseIds.includes(h.id)) ?? [];
  const selectedHorse = selectedHorses.length === 1 ? selectedHorses[0] : null;
  const isMultiSelect = selectedHorses.length > 1;

  const handleUpdateHorse = (updates: Partial<Horse>) => {
    if (!currentFrame || selectedHorses.length === 0) return;
    if (selectedHorses.length === 1) {
      updateHorseInFrame(currentFrame.id, selectedHorses[0].id, updates);
    } else {
      const map = new Map<string, Partial<Horse>>();
      selectedHorses.forEach((h) => map.set(h.id, updates));
      batchUpdateHorsesInFrame(currentFrame.id, map);
    }
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

  const displaySpeed = isMultiSelect
    ? (selectedHorses.every((h) => h.speed === selectedHorses[0].speed)
        ? selectedHorses[0].speed
        : '')
    : selectedHorse?.speed ?? '';
  const displayDirection = isMultiSelect
    ? (selectedHorses.every((h) => h.direction === selectedHorses[0].direction)
        ? selectedHorses[0].direction
        : null)
    : selectedHorse?.direction ?? 0;

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Properties</h2>

      {/* Frame duration */}
      {currentFrame && (
        <div className="mb-6">
          <div className="space-y-3">
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
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Maneuver name</label>
              <input
                type="text"
                placeholder="e.g. Circle left, Line abreast"
                value={currentFrame.maneuverName ?? ''}
                onChange={(e) => updateFrame(currentFrame.id, { maneuverName: e.target.value || undefined })}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Selected Horse Properties */}
      {selectedHorses.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">
            {isMultiSelect ? `${selectedHorses.length} horses selected` : 'Horse Properties'}
          </h3>
          <div className="space-y-3">
            {!isMultiSelect && selectedHorse && (
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Label</label>
                <input
                  type="text"
                  value={selectedHorse.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Speed (Gait)</label>
              <select
                value={displaySpeed}
                onChange={(e) => handleSpeedChange(e.target.value as Gait)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm"
              >
                {isMultiSelect && !displaySpeed && (
                  <option value="">Mixed</option>
                )}
                {GAITS.map((gait) => (
                  <option key={gait} value={gait}>
                    {gait.charAt(0).toUpperCase() + gait.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Direction: {displayDirection !== null
                  ? `${(displayDirection * 180 / Math.PI).toFixed(0)}°`
                  : 'Mixed (set below to apply to all)'}
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={displayDirection !== null ? (displayDirection * 180 / Math.PI) % 360 : 0}
                onChange={(e) => handleDirectionChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {!isMultiSelect && selectedHorse && (
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>Position: ({selectedHorse.position.x.toFixed(2)}, {selectedHorse.position.y.toFixed(2)}) m</div>
              </div>
            )}
            {isMultiSelect && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Changes to speed and direction apply to all {selectedHorses.length} horses.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

