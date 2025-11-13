import { useAnimationStore } from '../../stores/animationStore';
import { useDrillStore } from '../../stores/drillStore';
import { useAnimation } from '../../hooks/useAnimation';
import { useAudio } from '../../hooks/useAudio';

export default function AnimationControls() {
  const state = useAnimationStore((state) => state.state);
  const play = useAnimationStore((state) => state.play);
  const pause = useAnimationStore((state) => state.pause);
  const stop = useAnimationStore((state) => state.stop);
  const playbackSpeed = useAnimationStore((state) => state.playbackSpeed);
  const setPlaybackSpeed = useAnimationStore((state) => state.setPlaybackSpeed);
  const audioEnabled = useAnimationStore((state) => state.audioEnabled);
  const toggleAudio = useAnimationStore((state) => state.toggleAudio);
  const audioVolume = useAnimationStore((state) => state.audioVolume);
  const setAudioVolume = useAnimationStore((state) => state.setAudioVolume);
  const currentTime = useAnimationStore((state) => state.currentTime);
  const setCurrentTime = useAnimationStore((state) => state.setCurrentTime);

  const drill = useDrillStore((state) => state.drill);
  const currentFrameIndex = useDrillStore((state) => state.currentFrameIndex);
  const setCurrentFrame = useDrillStore((state) => state.setCurrentFrame);

  // Start animation loop
  useAnimation();
  
  // Start audio playback
  useAudio();

  const handlePreviousFrame = () => {
    if (!drill || currentFrameIndex <= 0) return;
    const prevFrame = drill.frames[currentFrameIndex - 1];
    setCurrentFrame(currentFrameIndex - 1);
    setCurrentTime(prevFrame.timestamp);
  };

  const handleNextFrame = () => {
    if (!drill || currentFrameIndex >= drill.frames.length - 1) return;
    const nextFrame = drill.frames[currentFrameIndex + 1];
    setCurrentFrame(currentFrameIndex + 1);
    setCurrentTime(nextFrame.timestamp);
  };

  return (
    <div className="px-4 py-2 flex items-center gap-4">
      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={state === 'playing' ? pause : play}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          {state === 'playing' ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={stop}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ⏹ Stop
        </button>
        <button
          onClick={handlePreviousFrame}
          disabled={currentFrameIndex === 0}
          className="px-2 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          ◄
        </button>
        <button
          onClick={handleNextFrame}
          disabled={drill ? currentFrameIndex >= drill.frames.length - 1 : true}
          className="px-2 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          ►
        </button>
      </div>

      {/* Speed Control */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">Speed:</span>
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm"
        >
          <option value={0.5}>0.5x</option>
          <option value={1.0}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2.0}>2x</option>
        </select>
      </div>

      {/* Audio Controls */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={audioEnabled}
            onChange={toggleAudio}
          />
          Audio
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={audioVolume}
          onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
          className="w-20"
          disabled={!audioEnabled}
        />
        <span className="text-xs text-gray-600 dark:text-gray-400 w-8">
          {Math.round(audioVolume * 100)}%
        </span>
      </div>

      {/* Timeline */}
      <div className="flex-1 mx-4">
        <div 
          className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full relative cursor-pointer"
          onClick={(e) => {
            if (!drill || drill.frames.length === 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            
            // Calculate total duration
            const totalDuration = drill.frames.reduce((sum, frame) => sum + frame.duration, 0);
            const newTime = percentage * totalDuration;
            setCurrentTime(Math.max(0, Math.min(totalDuration, newTime)));
          }}
        >
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-100"
            style={{
              width: drill && drill.frames.length > 0
                ? (() => {
                    const totalDuration = drill.frames.reduce((sum, frame) => sum + frame.duration, 0);
                    return totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%';
                  })()
                : '0%',
            }}
          />
        </div>
        {drill && drill.frames.length > 0 && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
            {currentTime.toFixed(1)}s / {drill.frames.reduce((sum, frame) => sum + frame.duration, 0).toFixed(1)}s
          </div>
        )}
      </div>
    </div>
  );
}

