import { useDrillStore } from '../../stores/drillStore';

export default function FrameControls() {
  const addFrame = useDrillStore((state) => state.addFrame);
  const deleteFrame = useDrillStore((state) => state.deleteFrame);
  const duplicateFrame = useDrillStore((state) => state.duplicateFrame);
  const currentFrame = useDrillStore((state) => state.getCurrentFrame());
  const drill = useDrillStore((state) => state.drill);

  const handleDelete = () => {
    if (!currentFrame) return;
    if (drill && drill.frames.length <= 1) {
      alert('Cannot delete the last frame');
      return;
    }
    if (confirm('Delete this frame?')) {
      deleteFrame(currentFrame.id);
    }
  };

  const handleDuplicate = () => {
    if (!currentFrame) return;
    duplicateFrame(currentFrame.id);
  };

  return (
    <div className="px-4 py-1 bg-gray-200 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 flex items-center gap-2">
      <button
        onClick={addFrame}
        className="px-2 py-1 bg-gray-500 dark:bg-gray-600 text-white text-xs rounded hover:bg-gray-600 dark:hover:bg-gray-700"
      >
        + Add Frame
      </button>
      <button
        onClick={handleDuplicate}
        disabled={!currentFrame}
        className="px-2 py-1 bg-gray-500 dark:bg-gray-600 text-white text-xs rounded hover:bg-gray-600 dark:hover:bg-gray-700 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        Duplicate
      </button>
      <button
        onClick={handleDelete}
        disabled={!currentFrame || (drill?.frames.length || 0) <= 1}
        className="px-2 py-1 bg-gray-500 dark:bg-gray-600 text-white text-xs rounded hover:bg-gray-600 dark:hover:bg-gray-700 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        Delete
      </button>
    </div>
  );
}

