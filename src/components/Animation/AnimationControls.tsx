import { useState, useRef, useEffect } from 'react';
import { useAnimationStore } from '../../stores/animationStore';
import { useDrillStore } from '../../stores/drillStore';
import { useAnimation } from '../../hooks/useAnimation';
import { useAudio } from '../../hooks/useAudio';
import AudioControl from './AudioControl';

export default function AnimationControls() {
  const [showSpeedPopup, setShowSpeedPopup] = useState(false);
  const speedPopupRef = useRef<HTMLDivElement>(null);
  const speedButtonRef = useRef<HTMLButtonElement>(null);
  const state = useAnimationStore((state) => state.state);
  const play = useAnimationStore((state) => state.play);
  const pause = useAnimationStore((state) => state.pause);
  const stop = useAnimationStore((state) => state.stop);
  const playbackSpeed = useAnimationStore((state) => state.playbackSpeed);
  const setPlaybackSpeed = useAnimationStore((state) => state.setPlaybackSpeed);
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

  // Close speed popup when clicking outside or on the button again
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is on speed button or inside speed popup
      if (showSpeedPopup) {
        const isSpeedButton = speedButtonRef.current?.contains(target);
        const isSpeedPopup = speedPopupRef.current?.contains(target);
        if (!isSpeedButton && !isSpeedPopup) {
          setShowSpeedPopup(false);
        }
      }
    };

    if (showSpeedPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpeedPopup]);

  return (
    <div className="px-4 py-2 flex items-center gap-4">
      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={state === 'playing' ? pause : play}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          {state === 'playing' ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={stop}
          disabled={state === 'stopped'}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
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
      <div className="relative">
        <button
          ref={speedButtonRef}
          onClick={() => setShowSpeedPopup(!showSpeedPopup)}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          title={`Playback Speed: ${playbackSpeed}x`}
        >
          {playbackSpeed}x
        </button>
        
        {showSpeedPopup && (
          <div
            ref={speedPopupRef}
            className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 min-w-[150px]"
          >
            <div className="flex flex-col gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                <span className="block mb-2">Playback Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1.0}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2.0}>2x</option>
                </select>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Audio Controls */}
      <AudioControl />

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

