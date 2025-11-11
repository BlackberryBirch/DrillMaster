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
        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
      >
        + Add Frame
      </button>
      <button
        onClick={handleDuplicate}
        disabled={!currentFrame}
        className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Duplicate
      </button>
      <button
        onClick={handleDelete}
        disabled={!currentFrame || (drill?.frames.length || 0) <= 1}
        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Delete
      </button>
    </div>
  );
}

