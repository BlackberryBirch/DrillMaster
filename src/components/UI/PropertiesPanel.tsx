import { useState } from 'react';
import { useDrillStore } from '../../stores/drillStore';
import { useEditorStore } from '../../stores/editorStore';
import { GAITS, Gait, Horse } from '../../types';

type PropertiesTab = 'edit' | 'frame';

export default function PropertiesPanel() {
  const [activeTab, setActiveTab] = useState<PropertiesTab>('edit');
  const drill = useDrillStore((state) => state.drill);
  const currentFrame = useDrillStore((state) => state.getCurrentFrame());
  const selectedHorseIds = useEditorStore((state) => state.selectedHorseIds);
  const updateHorseInFrame = useDrillStore((state) => state.updateHorseInFrame);
  const batchUpdateHorsesInFrame = useDrillStore((state) => state.batchUpdateHorsesInFrame);
  const updateFrame = useDrillStore((state) => state.updateFrame);
  const updateRiderName = useDrillStore((state) => state.updateRiderName);

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

  const handleLabelChange = (label: string) => {
    const numLabel = parseInt(label, 10);
    handleUpdateHorse({ label: isNaN(numLabel) ? label : numLabel });
  };

  const displayDirection = isMultiSelect
    ? (selectedHorses.every((h) => h.direction === selectedHorses[0].direction)
        ? selectedHorses[0].direction
        : null)
    : selectedHorse?.direction ?? 0;

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Properties</h2>

      <div className="flex border-b border-gray-200 dark:border-gray-600 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'edit'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('frame')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'frame'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Frame
        </button>
      </div>

      {activeTab === 'frame' && currentFrame && (
        <div className="mb-6">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Duration (seconds)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={Number(currentFrame.duration.toFixed(1))}
                  disabled={currentFrame.autoDuration !== false}
                  onChange={(e) => {
                    const newDuration = parseFloat(e.target.value);
                    if (!isNaN(newDuration) && newDuration > 0) {
                      updateFrame(currentFrame.id, { duration: newDuration });
                    }
                  }}
                  className="flex-1 min-w-0 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={currentFrame.autoDuration !== false}
                    onChange={(e) => updateFrame(currentFrame.id, { autoDuration: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Auto
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {currentFrame.autoDuration !== false
                  ? 'Set from gait and movement. Uncheck Auto to edit.'
                  : 'Manual duration when auto is off.'}
              </p>
            </div>
            {currentFrame.autoDuration !== false && (
              <>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Frame speed (gait)</label>
                  <select
                    value={currentFrame.speed ?? 'walk'}
                    onChange={(e) => updateFrame(currentFrame.id, { speed: e.target.value as Gait })}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm"
                  >
                    {GAITS.map((gait) => (
                      <option key={gait} value={gait}>
                        {gait.charAt(0).toUpperCase() + gait.slice(1)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Used to auto-set duration from horse movement.
                  </p>
                </div>
              </>
            )}
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

      {activeTab === 'edit' && (
        <div className="space-y-4">
          {/* Selected horse properties */}
          {selectedHorses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">
                {isMultiSelect ? `${selectedHorses.length} horses selected` : 'Selected horse'}
              </h3>
              <div className="space-y-3">
                {!isMultiSelect && selectedHorse && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Number (label)</label>
                      <input
                        type="text"
                        value={selectedHorse.label}
                        onChange={(e) => handleLabelChange(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Rider name</label>
                      <input
                        type="text"
                        placeholder="Rider name"
                        value={drill?.riderNames?.[String(selectedHorse.label)] ?? ''}
                        onChange={(e) => updateRiderName(selectedHorse.label, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm placeholder-gray-400 dark:placeholder-gray-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Applies to this horse number in all frames.
                      </p>
                    </div>
                  </>
                )}

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
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Position: ({selectedHorse.position.x.toFixed(2)}, {selectedHorse.position.y.toFixed(2)}) m
                  </div>
                )}
                {isMultiSelect && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Changes to direction apply to all {selectedHorses.length} horses.
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedHorses.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Select a horse in the editor to edit its properties.</p>
          )}
        </div>
      )}

    </div>
  );
}

