import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimationStore } from '../animationStore';

describe('animationStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAnimationStore.setState({
      state: 'stopped',
      currentTime: 0,
      playbackSpeed: 1.0,
      audioEnabled: true,
      audioVolume: 1.0,
    });
  });

  describe('playback state', () => {
    it('should play', () => {
      useAnimationStore.getState().play();
      expect(useAnimationStore.getState().state).toBe('playing');
    });

    it('should pause', () => {
      useAnimationStore.getState().play();
      useAnimationStore.getState().pause();
      expect(useAnimationStore.getState().state).toBe('paused');
    });

    it('should stop', () => {
      useAnimationStore.getState().play();
      useAnimationStore.getState().setCurrentTime(10);
      useAnimationStore.getState().stop();
      
      expect(useAnimationStore.getState().state).toBe('stopped');
      expect(useAnimationStore.getState().currentTime).toBe(0);
    });
  });

  describe('time control', () => {
    it('should set current time', () => {
      useAnimationStore.getState().setCurrentTime(5.5);
      expect(useAnimationStore.getState().currentTime).toBe(5.5);
    });

    it('should not set negative time', () => {
      useAnimationStore.getState().setCurrentTime(-5);
      expect(useAnimationStore.getState().currentTime).toBe(0);
    });
  });

  describe('playback speed', () => {
    it('should set playback speed to valid value', () => {
      useAnimationStore.getState().setPlaybackSpeed(1.5);
      expect(useAnimationStore.getState().playbackSpeed).toBe(1.5);
    });

    it('should snap to nearest valid speed', () => {
      useAnimationStore.getState().setPlaybackSpeed(1.3);
      expect(useAnimationStore.getState().playbackSpeed).toBe(1.5); // Nearest valid

      useAnimationStore.getState().setPlaybackSpeed(0.7);
      expect(useAnimationStore.getState().playbackSpeed).toBe(0.5); // Nearest valid
    });
  });

  describe('audio controls', () => {
    it('should toggle audio', () => {
      expect(useAnimationStore.getState().audioEnabled).toBe(true);
      useAnimationStore.getState().toggleAudio();
      expect(useAnimationStore.getState().audioEnabled).toBe(false);
      useAnimationStore.getState().toggleAudio();
      expect(useAnimationStore.getState().audioEnabled).toBe(true);
    });

    it('should set audio volume within bounds', () => {
      useAnimationStore.getState().setAudioVolume(0.5);
      expect(useAnimationStore.getState().audioVolume).toBe(0.5);

      useAnimationStore.getState().setAudioVolume(1.5);
      expect(useAnimationStore.getState().audioVolume).toBe(1.0); // Clamped

      useAnimationStore.getState().setAudioVolume(-0.5);
      expect(useAnimationStore.getState().audioVolume).toBe(0); // Clamped
    });
  });
});

