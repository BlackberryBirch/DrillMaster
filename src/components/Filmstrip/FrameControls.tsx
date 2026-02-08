import { useDrillStore } from '../../stores/drillStore';
import { Star } from 'lucide-react';

export default function FrameControls() {
  const addFrame = useDrillStore((state) => state.addFrame);
  const deleteFrame = useDrillStore((state) => state.deleteFrame);
  const updateFrame = useDrillStore((state) => state.updateFrame);
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

  const handleToggleKeyFrame = () => {
    if (!currentFrame) return;
    updateFrame(currentFrame.id, { isKeyFrame: !currentFrame.isKeyFrame });
  };

  return (
    <div className="px-4 py-1 bg-gray-200 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 flex items-center gap-2">
      <button
        onClick={addFrame}
        disabled={!drill || drill.frames.length === 0}
        className="px-2 py-1 bg-gray-500 dark:bg-gray-600 text-white text-xs rounded hover:bg-gray-600 dark:hover:bg-gray-700 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        + Add Frame
      </button>
      <button
        onClick={handleDelete}
        disabled={!currentFrame || (drill?.frames.length || 0) <= 1}
        className="px-2 py-1 bg-gray-500 dark:bg-gray-600 text-white text-xs rounded hover:bg-gray-600 dark:hover:bg-gray-700 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        Delete
      </button>
      <button
        onClick={handleToggleKeyFrame}
        disabled={!currentFrame}
        className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
          currentFrame?.isKeyFrame
            ? 'text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 disabled:text-gray-400 dark:disabled:text-gray-500'
            : 'text-gray-400 dark:text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 disabled:text-gray-400 dark:disabled:text-gray-500'
        } disabled:cursor-not-allowed`}
        title={currentFrame?.isKeyFrame ? 'Remove key frame' : 'Mark as key frame'}
        aria-label={currentFrame?.isKeyFrame ? 'Remove key frame' : 'Mark as key frame'}
      >
        <Star className="w-3.5 h-3.5" aria-hidden fill="currentColor" stroke="currentColor" strokeWidth={1} />
        Key frame
      </button>
    </div>
  );
}

