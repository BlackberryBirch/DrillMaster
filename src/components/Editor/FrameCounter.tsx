import { useDrillStore } from '../../stores/drillStore';

export default function FrameCounter() {
  const drill = useDrillStore((state) => state.drill);
  const currentFrameIndex = useDrillStore((state) => state.currentFrameIndex);

  return (
    <span className="text-sm text-gray-600">
      Frame {currentFrameIndex + 1} / {drill?.frames.length || 0}
    </span>
  );
}

