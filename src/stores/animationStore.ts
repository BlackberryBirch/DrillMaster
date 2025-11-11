import { create } from 'zustand';

type AnimationState = 'stopped' | 'playing' | 'paused';

interface AnimationStore {
  state: AnimationState;
  currentTime: number; // seconds
  playbackSpeed: number; // multiplier (0.5, 1.0, 1.5, 2.0)
  audioEnabled: boolean;
  audioVolume: number; // 0-1
  
  // Actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleAudio: () => void;
  setAudioVolume: (volume: number) => void;
}

export const useAnimationStore = create<AnimationStore>((set) => ({
  state: 'stopped',
  currentTime: 0,
  playbackSpeed: 1.0,
  audioEnabled: true,
  audioVolume: 1.0,

  play: () => set({ state: 'playing' }),
  pause: () => set({ state: 'paused' }),
  stop: () => set({ state: 'stopped', currentTime: 0 }),
  
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  
  setPlaybackSpeed: (speed) => {
    const validSpeeds = [0.5, 1.0, 1.5, 2.0];
    const closest = validSpeeds.reduce((prev, curr) =>
      Math.abs(curr - speed) < Math.abs(prev - speed) ? curr : prev
    );
    set({ playbackSpeed: closest });
  },
  
  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),
  
  setAudioVolume: (volume) =>
    set({ audioVolume: Math.max(0, Math.min(1, volume)) }),
}));

