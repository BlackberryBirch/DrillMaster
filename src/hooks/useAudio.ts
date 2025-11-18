import { useEffect, useRef } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { useDrillStore } from '../stores/drillStore';

/**
 * Hook that manages audio playback synchronized with animation
 */
export function useAudio() {
  const animationState = useAnimationStore((state) => state.state);
  const currentTime = useAnimationStore((state) => state.currentTime);
  const playbackSpeed = useAnimationStore((state) => state.playbackSpeed);
  const audioEnabled = useAnimationStore((state) => state.audioEnabled);
  const audioVolume = useAnimationStore((state) => state.audioVolume);
  const drill = useDrillStore((state) => state.drill);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioOffsetRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);

  // Initialize audio element (only once, not on every drill change)
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      
      // Handle audio errors - only log if there's actually an audio track and a real error
      audioRef.current.addEventListener('error', (e) => {
        const audio = e.target as HTMLAudioElement;
        // Only log if there's a source and a meaningful error
        if (audio.src && audio.error) {
          const errorCode = audio.error.code;
          // MEDIA_ERR_ABORTED (1) and MEDIA_ERR_NETWORK (2) are often expected during loading
          // Only log MEDIA_ERR_DECODE (3) and MEDIA_ERR_SRC_NOT_SUPPORTED (4) as real errors
          if (errorCode === 3 || errorCode === 4) {
            console.error('Audio playback error:', {
              code: errorCode,
              message: errorCode === 3 ? 'Decode error' : 'Source not supported',
              src: audio.src.substring(0, 100), // Log first 100 chars of URL
            });
          }
        }
      });

      // Note: We don't sync animation time from audio time
      // Animation time is the master, audio follows it

      // Handle audio end
      audioRef.current.addEventListener('ended', () => {
        // Audio ended, but animation might still be playing
        // Let animation handle stopping
      });
    }

    return () => {
      // Only cleanup on unmount, not on every drill change
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []); // Empty dependency array - only create once

  // Update audio source when drill changes
  useEffect(() => {
    if (!audioRef.current || !drill?.audioTrack) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      audioUrlRef.current = null;
      audioOffsetRef.current = 0;
      return;
    }

    const audioTrack = drill.audioTrack;
    
    // Only update if URL changed
    if (audioUrlRef.current !== audioTrack.url) {
      audioUrlRef.current = audioTrack.url;
      audioOffsetRef.current = audioTrack.offset || 0;
      
      if (audioRef.current) {
        audioRef.current.src = audioTrack.url;
        audioRef.current.load();
      }
    }
  }, [drill?.audioTrack]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioEnabled ? audioVolume : 0;
    }
  }, [audioEnabled, audioVolume]);

  // Sync audio playback with animation state
  useEffect(() => {
    if (!audioRef.current || !drill?.audioTrack) return;

    const audio = audioRef.current;
    const offset = audioOffsetRef.current;

    if (animationState === 'playing') {
      // Calculate target audio time (animation time + offset)
      const targetAudioTime = currentTime + offset;
      
      // Only seek if significantly different to avoid constant seeking
      if (Math.abs(audio.currentTime - targetAudioTime) > 0.1) {
        isSeekingRef.current = true;
        audio.currentTime = Math.max(0, targetAudioTime);
        setTimeout(() => {
          isSeekingRef.current = false;
        }, 100);
      }

      // Set playback rate to match animation speed
      audio.playbackRate = playbackSpeed;

      // Play audio if not already playing
      if (audio.paused) {
        audio.play().catch((error) => {
          // Only log if it's not a user interaction error (common when autoplay is blocked)
          if (error.name !== 'NotAllowedError' && error.name !== 'NotSupportedError') {
            console.error('Failed to play audio:', error);
          }
        });
      }
    } else if (animationState === 'paused') {
      // Pause audio
      audio.pause();
    } else if (animationState === 'stopped') {
      // Stop and reset audio
      audio.pause();
      audio.currentTime = offset;
    }
  }, [animationState, currentTime, playbackSpeed, drill?.audioTrack]);

  // Sync audio time when currentTime changes (e.g., from timeline scrub)
  useEffect(() => {
    if (!audioRef.current || !drill?.audioTrack || animationState !== 'playing') return;
    
    const audio = audioRef.current;
    const offset = audioOffsetRef.current;
    const targetAudioTime = currentTime + offset;

    // Only seek if significantly different
    if (Math.abs(audio.currentTime - targetAudioTime) > 0.1) {
      isSeekingRef.current = true;
      audio.currentTime = Math.max(0, targetAudioTime);
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    }
  }, [currentTime, animationState, drill?.audioTrack]);

  // Return function to load audio file
  return {
    loadAudioFile: (file: File) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.load();
            audioUrlRef.current = url;
            resolve(url);
          } else {
            reject(new Error('Audio element not initialized'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read audio file'));
        reader.readAsDataURL(file);
      });
    },
  };
}

