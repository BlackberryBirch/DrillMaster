import { useEffect, useRef } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useDrillStore } from '../stores/drillStore';

/**
 * Hook that handles animation playback using requestAnimationFrame
 */
export function useAnimation() {
  const animationState = useAnimationStore((state) => state.state);
  const currentTime = useAnimationStore((state) => state.currentTime);
  const playbackSpeed = useAnimationStore((state) => state.playbackSpeed);
  const setCurrentTime = useAnimationStore((state) => state.setCurrentTime);
  const stop = useAnimationStore((state) => state.stop);
  const drill = useDrillStore((state) => state.drill);
  const setCurrentFrame = useDrillStore((state) => state.setCurrentFrame);

  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());
  const timeRef = useRef<number>(currentTime);

  // Update timeRef when currentTime changes externally (e.g., from timeline scrub)
  useEffect(() => {
    timeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (animationState !== 'playing' || !drill || drill.frames.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      return;
    }

    const animate = (currentPerformanceTime: number) => {
      const deltaTime = (currentPerformanceTime - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = currentPerformanceTime;

      // Calculate new time with playback speed
      const newTime = timeRef.current + deltaTime * playbackSpeed;
      timeRef.current = newTime;

      // Calculate total duration of drill
      const totalDuration = drill.frames.reduce((sum, frame) => sum + frame.duration, 0);

      if (newTime >= totalDuration) {
        // Reached end, stop animation
        stop();
        setCurrentTime(totalDuration);
      } else {
        setCurrentTime(newTime);

        // Update current frame index based on time using frame timestamps
        for (let i = 0; i < drill.frames.length; i++) {
          const frame = drill.frames[i];
          const frameEndTime = frame.timestamp + frame.duration;
          if (newTime >= frame.timestamp && newTime < frameEndTime) {
            setCurrentFrame(i);
            break;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    timeRef.current = currentTime; // Initialize with current time
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationState, playbackSpeed, drill, setCurrentTime, stop, setCurrentFrame]);
}
