import { useDrillStore } from '../../stores/drillStore';
import { useAnimationStore } from '../../stores/animationStore';
import FrameThumbnail from './FrameThumbnail';
import FrameControls from './FrameControls';

export default function Filmstrip() {
  const drill = useDrillStore((state) => state.drill);
  const currentFrameIndex = useDrillStore((state) => state.currentFrameIndex);
  const setCurrentFrame = useDrillStore((state) => state.setCurrentFrame);
  const setCurrentTime = useAnimationStore((state) => state.setCurrentTime);

  if (!drill || drill.frames.length === 0) {
    return (
      <div className="h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
        No frames yet. Add a frame to get started.
      </div>
    );
  }

  return (
    <div className="h-32 bg-gray-100 dark:bg-gray-800 flex flex-col">
      <FrameControls />
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-2">
        <div className="flex gap-2 h-full items-center">
          {drill.frames.map((frame, index) => (
            <FrameThumbnail
              key={frame.id}
              frame={frame}
              index={index}
              isSelected={index === currentFrameIndex}
              onClick={() => {
                setCurrentFrame(index);
                setCurrentTime(frame.timestamp);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

